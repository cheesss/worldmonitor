import path from 'node:path';
import { mkdir, open, readFile, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { HistoricalBackfillOptions, HistoricalFrameLoadOptions } from '../importer/historical-stream-worker';
import { loadHistoricalReplayFramesFromDuckDb, processHistoricalDump } from '../importer/historical-stream-worker';
import type { HistoricalReplayOptions, HistoricalReplayRun, WalkForwardBacktestOptions } from '../historical-intelligence';
import { runHistoricalReplay, runWalkForwardBacktest } from '../historical-intelligence';
import {
  listBaseInvestmentThemes,
  getInvestmentIntelligenceSnapshot,
  getInvestmentThemeDefinition,
  ingestCodexCandidateExpansionProposals,
  setAutomatedThemeCatalog,
  type InvestmentThemeDefinition,
} from '../investment-intelligence';
import {
  discoverThemeQueue,
  type CodexThemeProposal,
  type ThemeDiscoveryQueueItem,
} from '../theme-discovery';
import { proposeCandidatesWithCodex } from './codex-candidate-proposer';
import { proposeThemeWithCodex } from './codex-theme-proposer';
import {
  normalizeSourceAutomationPolicy,
  runSourceAutomationSweep,
  type SourceAutomationPolicy,
} from './source-automation';

type HistoricalProvider = 'fred' | 'alfred' | 'gdelt-doc' | 'coingecko' | 'acled';
type AutomationJobKind = 'fetch' | 'import' | 'replay' | 'walk-forward' | 'theme-discovery' | 'theme-proposer' | 'candidate-expansion' | 'source-automation' | 'retention';
type ThemeAutomationMode = 'manual' | 'guarded-auto' | 'full-auto';
type GapSeverity = 'watch' | 'elevated' | 'critical';

export interface IntelligenceDatasetRegistryEntry {
  id: string;
  label: string;
  enabled: boolean;
  provider: HistoricalProvider;
  fetchArgs: Record<string, string | number | boolean>;
  importOptions?: Partial<HistoricalBackfillOptions>;
  replayOptions?: Partial<HistoricalReplayOptions>;
  walkForwardOptions?: Partial<WalkForwardBacktestOptions>;
  frameLoadOptions?: Partial<HistoricalFrameLoadOptions>;
  schedule?: {
    fetchEveryMinutes?: number;
    replayEveryMinutes?: number;
    walkForwardLocalHour?: number;
    themeDiscoveryEveryMinutes?: number;
  };
}

export interface ThemeAutomationPolicy {
  mode: ThemeAutomationMode;
  minDiscoveryScore: number;
  minSampleCount: number;
  minSourceCount: number;
  minCodexConfidence: number;
  minAssetCount: number;
  maxPromotionsPerDay: number;
}

export interface CandidateAutomationPolicy {
  enabled: boolean;
  everyMinutes: number;
  maxThemesPerCycle: number;
  minGapSeverity: GapSeverity;
}

export interface IntelligenceAutomationRegistry {
  version: number;
  defaults: {
    dbPath: string;
    artifactDir: string;
    bucketHours: number;
    warmupFrameCount: number;
    replayWindowDays: number;
    walkForwardWindowDays: number;
    horizonsHours: number[];
    fetchEveryMinutes: number;
    replayEveryMinutes: number;
    walkForwardLocalHour: number;
    themeDiscoveryEveryMinutes: number;
    maxRetries: number;
    retentionDays: number;
    artifactRetentionCount: number;
    lockTtlMinutes: number;
  };
  themeAutomation: ThemeAutomationPolicy;
  sourceAutomation: SourceAutomationPolicy;
  candidateAutomation: CandidateAutomationPolicy;
  datasets: IntelligenceDatasetRegistryEntry[];
}

export interface AutomationRunRecord {
  id: string;
  datasetId: string | null;
  kind: AutomationJobKind;
  status: 'ok' | 'error' | 'skipped';
  startedAt: string;
  completedAt: string;
  attempts: number;
  detail: string;
}

interface DatasetAutomationState {
  lastFetchAt?: string | null;
  lastImportAt?: string | null;
  lastReplayAt?: string | null;
  lastWalkForwardAt?: string | null;
  lastThemeDiscoveryAt?: string | null;
  nextEligibleAt?: string | null;
  consecutiveFailures: number;
  lastError?: string | null;
  artifacts: string[];
}

interface PromotedThemeState {
  id: string;
  sourceTopicKey: string;
  promotedAt: string;
  confidence: number;
  autoPromoted: boolean;
  theme: InvestmentThemeDefinition;
}

export interface IntelligenceAutomationState {
  version: number;
  updatedAt: string;
  lastCandidateExpansionAt?: string | null;
  datasets: Record<string, DatasetAutomationState>;
  runs: AutomationRunRecord[];
  themeQueue: ThemeDiscoveryQueueItem[];
  promotedThemes: PromotedThemeState[];
}

export interface IntelligenceAutomationCycleResult {
  startedAt: string;
  completedAt: string;
  datasetCount: number;
  touchedDatasets: string[];
  replayRuns: Array<{ datasetId: string; runId: string; mode: 'replay' | 'walk-forward'; ideaCount: number }>;
  promotedThemes: string[];
  candidateThemes: string[];
  sourceAutomation: Awaited<ReturnType<typeof runSourceAutomationSweep>>;
  queueOpenCount: number;
}

const DEFAULT_REGISTRY_PATH = path.resolve('config', 'intelligence-datasets.json');
const DEFAULT_STATE_PATH = path.resolve('data', 'automation', 'intelligence-scheduler-state.json');
const DEFAULT_LOCK_DIR = path.resolve('data', 'automation', 'locks');
const MAX_RUN_RECORDS = 480;

function nowIso(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'automation';
}

function asTs(value?: string | null): number {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function sameLocalDay(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const one = new Date(a);
  const two = new Date(b);
  return one.getFullYear() === two.getFullYear()
    && one.getMonth() === two.getMonth()
    && one.getDate() === two.getDate();
}

function createDefaultRegistry(): IntelligenceAutomationRegistry {
  return {
    version: 1,
    defaults: {
      dbPath: path.resolve('data', 'historical', 'intelligence-history.duckdb'),
      artifactDir: path.resolve('data', 'historical', 'automation'),
      bucketHours: 6,
      warmupFrameCount: 60,
      replayWindowDays: 60,
      walkForwardWindowDays: 180,
      horizonsHours: [1, 4, 24, 72, 168],
      fetchEveryMinutes: 60,
      replayEveryMinutes: 60,
      walkForwardLocalHour: 2,
      themeDiscoveryEveryMinutes: 180,
      maxRetries: 3,
      retentionDays: 30,
      artifactRetentionCount: 24,
      lockTtlMinutes: 180,
    },
    themeAutomation: {
      mode: 'guarded-auto',
      minDiscoveryScore: 58,
      minSampleCount: 4,
      minSourceCount: 2,
      minCodexConfidence: 78,
      minAssetCount: 2,
      maxPromotionsPerDay: 1,
    },
    sourceAutomation: normalizeSourceAutomationPolicy(),
    candidateAutomation: {
      enabled: true,
      everyMinutes: 180,
      maxThemesPerCycle: 2,
      minGapSeverity: 'elevated',
    },
    datasets: [],
  };
}

function defaultState(): IntelligenceAutomationState {
  return {
    version: 1,
    updatedAt: nowIso(),
    lastCandidateExpansionAt: null,
    datasets: {},
    runs: [],
    themeQueue: [],
    promotedThemes: [],
  };
}

function normalizeRegistry(raw?: Partial<IntelligenceAutomationRegistry> | null): IntelligenceAutomationRegistry {
  const fallback = createDefaultRegistry();
  return {
    version: 1,
    defaults: {
      ...fallback.defaults,
      ...(raw?.defaults || {}),
      horizonsHours: Array.isArray(raw?.defaults?.horizonsHours)
        ? raw!.defaults!.horizonsHours!.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
        : fallback.defaults.horizonsHours,
    },
    themeAutomation: {
      ...fallback.themeAutomation,
      ...(raw?.themeAutomation || {}),
      mode: raw?.themeAutomation?.mode === 'manual' || raw?.themeAutomation?.mode === 'guarded-auto' || raw?.themeAutomation?.mode === 'full-auto'
        ? raw.themeAutomation.mode
        : fallback.themeAutomation.mode,
    },
    sourceAutomation: normalizeSourceAutomationPolicy(raw?.sourceAutomation),
    candidateAutomation: {
      enabled: typeof raw?.candidateAutomation?.enabled === 'boolean' ? raw.candidateAutomation.enabled : fallback.candidateAutomation.enabled,
      everyMinutes: Math.max(15, Number(raw?.candidateAutomation?.everyMinutes) || fallback.candidateAutomation.everyMinutes),
      maxThemesPerCycle: Math.max(1, Math.min(8, Number(raw?.candidateAutomation?.maxThemesPerCycle) || fallback.candidateAutomation.maxThemesPerCycle)),
      minGapSeverity: raw?.candidateAutomation?.minGapSeverity === 'watch' || raw?.candidateAutomation?.minGapSeverity === 'critical'
        ? raw.candidateAutomation.minGapSeverity
        : fallback.candidateAutomation.minGapSeverity,
    },
    datasets: Array.isArray(raw?.datasets)
      ? raw!.datasets!.map((dataset) => ({
        id: String(dataset.id || '').trim(),
        label: String(dataset.label || dataset.id || '').trim() || String(dataset.id || '').trim(),
        enabled: Boolean(dataset.enabled),
        provider: String(dataset.provider || '').trim().toLowerCase() as HistoricalProvider,
        fetchArgs: dataset.fetchArgs || {},
        importOptions: dataset.importOptions || {},
        replayOptions: dataset.replayOptions || {},
        walkForwardOptions: dataset.walkForwardOptions || {},
        frameLoadOptions: dataset.frameLoadOptions || {},
        schedule: dataset.schedule || {},
      })).filter((dataset) => dataset.id && dataset.provider)
      : [],
  };
}

function normalizeState(raw?: Partial<IntelligenceAutomationState> | null): IntelligenceAutomationState {
  const fallback = defaultState();
  return {
    version: 1,
    updatedAt: String(raw?.updatedAt || fallback.updatedAt),
    lastCandidateExpansionAt: raw?.lastCandidateExpansionAt || null,
    datasets: Object.fromEntries(
      Object.entries(raw?.datasets || {}).map(([datasetId, state]) => [
        datasetId,
        {
          lastFetchAt: state?.lastFetchAt || null,
          lastImportAt: state?.lastImportAt || null,
          lastReplayAt: state?.lastReplayAt || null,
          lastWalkForwardAt: state?.lastWalkForwardAt || null,
          lastThemeDiscoveryAt: state?.lastThemeDiscoveryAt || null,
          nextEligibleAt: state?.nextEligibleAt || null,
          consecutiveFailures: Number(state?.consecutiveFailures) || 0,
          lastError: state?.lastError || null,
          artifacts: Array.isArray(state?.artifacts) ? state!.artifacts!.map((item) => String(item)) : [],
        } satisfies DatasetAutomationState,
      ]),
    ),
    runs: Array.isArray(raw?.runs) ? raw!.runs!.slice(-MAX_RUN_RECORDS) : [],
    themeQueue: Array.isArray(raw?.themeQueue) ? raw!.themeQueue! : [],
    promotedThemes: Array.isArray(raw?.promotedThemes) ? raw!.promotedThemes! : [],
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export async function loadAutomationRegistry(registryPath = DEFAULT_REGISTRY_PATH): Promise<IntelligenceAutomationRegistry> {
  const existing = await readJsonFile<IntelligenceAutomationRegistry>(registryPath);
  if (!existing) {
    const created = createDefaultRegistry();
    await writeJsonFile(registryPath, created);
    return created;
  }
  return normalizeRegistry(existing);
}

export async function loadAutomationState(statePath = DEFAULT_STATE_PATH): Promise<IntelligenceAutomationState> {
  const existing = await readJsonFile<IntelligenceAutomationState>(statePath);
  return normalizeState(existing);
}

async function saveAutomationState(state: IntelligenceAutomationState, statePath = DEFAULT_STATE_PATH): Promise<void> {
  state.updatedAt = nowIso();
  await writeJsonFile(statePath, state);
}

async function acquireLock(key: string, ttlMinutes: number): Promise<(() => Promise<void>) | null> {
  await mkdir(DEFAULT_LOCK_DIR, { recursive: true });
  const filePath = path.join(DEFAULT_LOCK_DIR, `${slugify(key)}.lock.json`);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  const payload = JSON.stringify({ key, pid: process.pid, acquiredAt: nowIso(), expiresAt }, null, 2);

  const tryCreate = async (): Promise<boolean> => {
    try {
      const handle = await open(filePath, 'wx');
      await handle.writeFile(payload, 'utf8');
      await handle.close();
      return true;
    } catch {
      return false;
    }
  };

  if (!(await tryCreate())) {
    const existing = await readJsonFile<{ expiresAt?: string }>(filePath);
    if (existing?.expiresAt && asTs(existing.expiresAt) < Date.now()) {
      await rm(filePath, { force: true });
      if (!(await tryCreate())) return null;
    } else {
      return null;
    }
  }

  return async () => {
    await rm(filePath, { force: true });
  };
}

function getDatasetState(state: IntelligenceAutomationState, datasetId: string): DatasetAutomationState {
  state.datasets[datasetId] = state.datasets[datasetId] || {
    consecutiveFailures: 0,
    artifacts: [],
  };
  return state.datasets[datasetId]!;
}

function shouldRunEvery(lastAt: string | null | undefined, everyMinutes: number, now = Date.now()): boolean {
  if (!lastAt) return true;
  return now - asTs(lastAt) >= everyMinutes * 60_000;
}

function shouldRunNightly(lastAt: string | null | undefined, localHour: number, now = new Date()): boolean {
  if (now.getHours() < localHour) return false;
  return !sameLocalDay(lastAt, now.toISOString());
}

function backoffMs(consecutiveFailures: number): number {
  const bounded = Math.max(1, Math.min(6, consecutiveFailures));
  return Math.min(6 * 60 * 60 * 1000, 5 * 60 * 1000 * (2 ** (bounded - 1)));
}

function appendRun(state: IntelligenceAutomationState, run: AutomationRunRecord): void {
  state.runs = [...state.runs, run].slice(-MAX_RUN_RECORDS);
}

function applyPromotedThemes(state: IntelligenceAutomationState): void {
  setAutomatedThemeCatalog(state.promotedThemes.map((entry) => entry.theme));
}

async function fetchHistoricalDatasetArtifact(
  registry: IntelligenceAutomationRegistry,
  dataset: IntelligenceDatasetRegistryEntry,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error Node runtime import of a local scheduler helper script.
  const module = await import('../../../scripts/fetch-historical-data.mjs');
  const envelope = await module.fetchHistoricalEnvelope(dataset.provider, dataset.fetchArgs || {});
  const artifactDir = path.resolve(registry.defaults.artifactDir, dataset.id);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(artifactDir, `${timestamp}.json`);
  return module.writeHistoricalEnvelope(outputPath, dataset.provider, envelope);
}

function toReplaySummary(datasetId: string, run: HistoricalReplayRun): { datasetId: string; runId: string; mode: 'replay' | 'walk-forward'; ideaCount: number } {
  return {
    datasetId,
    runId: run.id,
    mode: run.mode,
    ideaCount: run.ideaRuns.length,
  };
}

function buildThemeDefinitionFromProposal(proposal: CodexThemeProposal): InvestmentThemeDefinition {
  return {
    id: proposal.id,
    label: proposal.label,
    triggers: proposal.triggers.slice(),
    sectors: proposal.sectors.slice(),
    commodities: proposal.commodities.slice(),
    timeframe: proposal.timeframe,
    thesis: proposal.thesis,
    invalidation: proposal.invalidation.slice(),
    baseSensitivity: proposal.confidence,
    assets: proposal.assets.map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      assetKind: asset.assetKind,
      sector: asset.sector,
      commodity: asset.commodity || undefined,
      direction: asset.direction,
      role: asset.role,
    })),
  };
}

function autoPromoteTheme(
  proposal: CodexThemeProposal,
  queueItem: ThemeDiscoveryQueueItem,
  registry: IntelligenceAutomationRegistry,
  existingThemes: InvestmentThemeDefinition[],
  promotionsToday: number,
): boolean {
  if (registry.themeAutomation.mode === 'manual') return false;
  if (promotionsToday >= registry.themeAutomation.maxPromotionsPerDay) return false;
  if (queueItem.signalScore < registry.themeAutomation.minDiscoveryScore) return false;
  if (queueItem.sampleCount < registry.themeAutomation.minSampleCount) return false;
  if (queueItem.sourceCount < registry.themeAutomation.minSourceCount) return false;
  if ((proposal.assets || []).length < registry.themeAutomation.minAssetCount) return false;
  if (existingThemes.some((theme) => theme.id === proposal.id)) return false;
  if (registry.themeAutomation.mode === 'guarded-auto' && proposal.confidence < registry.themeAutomation.minCodexConfidence) return false;
  return proposal.confidence >= Math.max(52, registry.themeAutomation.minCodexConfidence - 16);
}

async function runWithRetry<T>(
  datasetId: string,
  kind: AutomationJobKind,
  maxRetries: number,
  runner: (attempt: number) => Promise<T>,
  state: IntelligenceAutomationState,
): Promise<T> {
  let attempt = 0;
  let lastError: Error | null = null;
  while (attempt < maxRetries) {
    attempt += 1;
    const startedAt = nowIso();
    try {
      const result = await runner(attempt);
      appendRun(state, {
        id: `${datasetId}:${kind}:${startedAt}`,
        datasetId,
        kind,
        status: 'ok',
        startedAt,
        completedAt: nowIso(),
        attempts: attempt,
        detail: `${kind} succeeded`,
      });
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      appendRun(state, {
        id: `${datasetId}:${kind}:${startedAt}`,
        datasetId,
        kind,
        status: 'error',
        startedAt,
        completedAt: nowIso(),
        attempts: attempt,
        detail: lastError.message,
      });
      if (attempt >= maxRetries) break;
      await sleep(1_500 * attempt);
    }
  }
  throw lastError || new Error(`${kind} failed`);
}

async function pruneArtifacts(artifactDir: string, keepCount: number, retentionDays: number): Promise<void> {
  if (!existsSync(artifactDir)) return;
  const entries = await readdir(artifactDir, { withFileTypes: true });
  const files = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map(async (entry) => {
      const filePath = path.join(artifactDir, entry.name);
      const stats = await stat(filePath);
      return { filePath, mtimeMs: stats.mtimeMs };
    }));
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const expiryMs = Date.now() - retentionDays * 86_400_000;
  const doomed = files.filter((file, index) => index >= keepCount || file.mtimeMs < expiryMs);
  for (const file of doomed) {
    await unlink(file.filePath).catch(() => {});
  }
}

function mergeThemeQueue(state: IntelligenceAutomationState, queue: ThemeDiscoveryQueueItem[]): void {
  const existing = new Map(state.themeQueue.map((item) => [item.id, item] as const));
  for (const item of queue) {
    const previous = existing.get(item.id);
    existing.set(item.id, previous ? {
      ...previous,
      ...item,
      createdAt: previous.createdAt,
      status: previous.status === 'promoted' || previous.status === 'rejected' ? previous.status : item.status,
      proposedThemeId: previous.proposedThemeId || item.proposedThemeId || null,
      promotedThemeId: previous.promotedThemeId || item.promotedThemeId || null,
      rejectedReason: previous.rejectedReason || item.rejectedReason || null,
    } : item);
  }
  state.themeQueue = Array.from(existing.values()).slice(-120);
}

function gapSeverityRank(value: GapSeverity): number {
  if (value === 'critical') return 3;
  if (value === 'elevated') return 2;
  return 1;
}

async function runCandidateExpansionSweep(args: {
  registry: IntelligenceAutomationRegistry;
  state: IntelligenceAutomationState;
}): Promise<{ themeIds: string[]; acceptedAny: boolean }> {
  if (!args.registry.candidateAutomation.enabled) {
    return { themeIds: [], acceptedAny: false };
  }
  if (!shouldRunEvery(args.state.lastCandidateExpansionAt, args.registry.candidateAutomation.everyMinutes)) {
    return { themeIds: [], acceptedAny: false };
  }

  const snapshot = await getInvestmentIntelligenceSnapshot();
  if (!snapshot || snapshot.universePolicy.mode === 'manual') {
    args.state.lastCandidateExpansionAt = nowIso();
    return { themeIds: [], acceptedAny: false };
  }

  const minSeverity = gapSeverityRank(args.registry.candidateAutomation.minGapSeverity);
  const candidateThemes = Array.from(new Set(
    snapshot.coverageGaps
      .filter((gap) => gapSeverityRank(gap.severity) >= minSeverity)
      .sort((a, b) => gapSeverityRank(b.severity) - gapSeverityRank(a.severity))
      .map((gap) => gap.themeId),
  )).slice(0, args.registry.candidateAutomation.maxThemesPerCycle);

  const themeIds: string[] = [];
  let acceptedAny = false;

  for (const themeId of candidateThemes) {
    const theme = getInvestmentThemeDefinition(themeId);
    if (!theme) continue;
    const proposals = await runWithRetry(themeId, 'candidate-expansion', Math.max(1, args.registry.defaults.maxRetries - 1), async () => (
      proposeCandidatesWithCodex({
        theme,
        gaps: snapshot.coverageGaps.filter((gap) => gap.themeId === themeId),
        topMappings: snapshot.directMappings.filter((mapping) => mapping.themeId === themeId),
      })
    ), args.state);
    if (!proposals || proposals.length === 0) continue;
    const inserted = await ingestCodexCandidateExpansionProposals(themeId, proposals);
    if (!inserted.length) continue;
    themeIds.push(themeId);
    if (inserted.some((review) => review.status === 'accepted')) {
      acceptedAny = true;
    }
  }

  args.state.lastCandidateExpansionAt = nowIso();
  return { themeIds, acceptedAny };
}

export async function runIntelligenceAutomationCycle(args: {
  registryPath?: string;
  statePath?: string;
} = {}): Promise<IntelligenceAutomationCycleResult> {
  const startedAt = nowIso();
  const registry = await loadAutomationRegistry(args.registryPath);
  const state = await loadAutomationState(args.statePath);
  applyPromotedThemes(state);

  const touchedDatasets = new Set<string>();
  const replayRuns: IntelligenceAutomationCycleResult['replayRuns'] = [];
  const promotedThemes: string[] = [];
  const candidateThemes: string[] = [];
  const enabledDatasets = registry.datasets.filter((dataset) => dataset.enabled);
  const nowMs = Date.now();

  for (const dataset of enabledDatasets) {
    const datasetState = getDatasetState(state, dataset.id);
    if (datasetState.nextEligibleAt && asTs(datasetState.nextEligibleAt) > nowMs) {
      continue;
    }
    const schedule = {
      fetchEveryMinutes: Number(dataset.schedule?.fetchEveryMinutes) || registry.defaults.fetchEveryMinutes,
      replayEveryMinutes: Number(dataset.schedule?.replayEveryMinutes) || registry.defaults.replayEveryMinutes,
      walkForwardLocalHour: Number(dataset.schedule?.walkForwardLocalHour) || registry.defaults.walkForwardLocalHour,
      themeDiscoveryEveryMinutes: Number(dataset.schedule?.themeDiscoveryEveryMinutes) || registry.defaults.themeDiscoveryEveryMinutes,
    };

    const releaseDatasetLock = await acquireLock(`dataset:${dataset.id}`, registry.defaults.lockTtlMinutes);
    if (!releaseDatasetLock) {
      appendRun(state, {
        id: `${dataset.id}:dataset-lock:${startedAt}`,
        datasetId: dataset.id,
        kind: 'fetch',
        status: 'skipped',
        startedAt,
        completedAt: nowIso(),
        attempts: 0,
        detail: 'Dataset cycle skipped because another worker holds the lock.',
      });
      continue;
    }

    try {
      touchedDatasets.add(dataset.id);
      datasetState.nextEligibleAt = null;
      let latestArtifactPath = datasetState.artifacts[datasetState.artifacts.length - 1] || null;

      if (shouldRunEvery(datasetState.lastFetchAt, schedule.fetchEveryMinutes, nowMs)) {
        latestArtifactPath = await runWithRetry(dataset.id, 'fetch', registry.defaults.maxRetries, async () => {
          const artifactPath = await fetchHistoricalDatasetArtifact(registry, dataset);
          datasetState.lastFetchAt = nowIso();
          datasetState.artifacts = [...datasetState.artifacts, artifactPath].slice(-(registry.defaults.artifactRetentionCount * 2));
          return artifactPath;
        }, state);

        await runWithRetry(dataset.id, 'import', registry.defaults.maxRetries, async () => {
          const result = await processHistoricalDump(String(latestArtifactPath), {
            datasetId: dataset.id,
            provider: dataset.provider,
            dbPath: registry.defaults.dbPath,
            bucketHours: Number(dataset.importOptions?.bucketHours) || registry.defaults.bucketHours,
            warmupFrameCount: Number(dataset.importOptions?.warmupFrameCount) || registry.defaults.warmupFrameCount,
            ...dataset.importOptions,
          });
          datasetState.lastImportAt = nowIso();
          datasetState.lastError = null;
          datasetState.consecutiveFailures = 0;
          return result;
        }, state);
      }

      const replayDue = shouldRunEvery(datasetState.lastReplayAt, schedule.replayEveryMinutes, nowMs)
        || (datasetState.lastImportAt && asTs(datasetState.lastReplayAt) < asTs(datasetState.lastImportAt));
      if (replayDue) {
        const frames = await loadHistoricalReplayFramesFromDuckDb({
          dbPath: registry.defaults.dbPath,
          datasetId: dataset.id,
          includeWarmup: true,
          maxFrames: Math.max(24, Math.round((Number(dataset.replayOptions?.dedupeWindowHours) || 0) || ((registry.defaults.replayWindowDays * 24) / registry.defaults.bucketHours))),
          ...dataset.frameLoadOptions,
        });
        const run = await runWithRetry(dataset.id, 'replay', registry.defaults.maxRetries, async () => {
          const replayRun = await runHistoricalReplay(frames, {
            label: `${dataset.label} / scheduled replay`,
            retainLearningState: false,
            warmupFrameCount: Number(dataset.replayOptions?.warmupFrameCount) || registry.defaults.warmupFrameCount,
            horizonsHours: registry.defaults.horizonsHours.slice(),
            ...dataset.replayOptions,
          });
          datasetState.lastReplayAt = nowIso();
          return replayRun;
        }, state);
        replayRuns.push(toReplaySummary(dataset.id, run));

        if (shouldRunEvery(datasetState.lastThemeDiscoveryAt, schedule.themeDiscoveryEveryMinutes, nowMs)) {
          const knownThemes = [...listBaseInvestmentThemes(), ...state.promotedThemes.map((entry) => entry.theme)];
          const queue = discoverThemeQueue(frames, knownThemes, state.themeQueue);
          mergeThemeQueue(state, queue.filter((item) => item.datasetIds.includes(dataset.id)));
          datasetState.lastThemeDiscoveryAt = nowIso();
          appendRun(state, {
            id: `${dataset.id}:theme-discovery:${datasetState.lastThemeDiscoveryAt}`,
            datasetId: dataset.id,
            kind: 'theme-discovery',
            status: 'ok',
            startedAt: datasetState.lastThemeDiscoveryAt,
            completedAt: nowIso(),
            attempts: 1,
            detail: `theme discovery queue size=${state.themeQueue.filter((item) => item.status === 'open').length}`,
          });
        }
      }

      if (shouldRunNightly(datasetState.lastWalkForwardAt, schedule.walkForwardLocalHour)) {
        const frames = await loadHistoricalReplayFramesFromDuckDb({
          dbPath: registry.defaults.dbPath,
          datasetId: dataset.id,
          includeWarmup: true,
          ...dataset.frameLoadOptions,
        });
        const run = await runWithRetry(dataset.id, 'walk-forward', registry.defaults.maxRetries, async () => {
          const walkForwardRun = await runWalkForwardBacktest(frames, {
            label: `${dataset.label} / scheduled walk-forward`,
            retainLearningState: false,
            warmupFrameCount: Number(dataset.walkForwardOptions?.warmupFrameCount) || registry.defaults.warmupFrameCount,
            horizonsHours: registry.defaults.horizonsHours.slice(),
            ...dataset.walkForwardOptions,
          });
          datasetState.lastWalkForwardAt = nowIso();
          return walkForwardRun;
        }, state);
        replayRuns.push(toReplaySummary(dataset.id, run));
      }
      datasetState.consecutiveFailures = 0;
      datasetState.lastError = null;
    } catch (error) {
      datasetState.consecutiveFailures += 1;
      datasetState.lastError = error instanceof Error ? error.message : String(error);
      datasetState.nextEligibleAt = new Date(Date.now() + backoffMs(datasetState.consecutiveFailures)).toISOString();
    } finally {
      await releaseDatasetLock();
    }
  }

  const sourceAutomation = await runWithRetry('global', 'source-automation', Math.max(1, registry.defaults.maxRetries - 1), async () => (
    runSourceAutomationSweep(registry.sourceAutomation)
  ), state);

  const knownThemes = [...listBaseInvestmentThemes(), ...state.promotedThemes.map((entry) => entry.theme)];
  let promotionsToday = state.promotedThemes.filter((entry) => sameLocalDay(entry.promotedAt, nowIso())).length;
  for (const queueItem of state.themeQueue
    .filter((item) => item.status === 'open' && item.signalScore >= registry.themeAutomation.minDiscoveryScore)
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 3)) {
    if (registry.themeAutomation.mode === 'manual') break;
    const releaseThemeLock = await acquireLock(`theme:${queueItem.topicKey}`, registry.defaults.lockTtlMinutes);
    if (!releaseThemeLock) continue;
    try {
      const proposal = await runWithRetry(queueItem.topicKey, 'theme-proposer', Math.max(1, registry.defaults.maxRetries - 1), async () => (
        proposeThemeWithCodex(queueItem, knownThemes)
      ), state);
      if (!proposal) continue;
      queueItem.status = 'proposed';
      queueItem.proposedThemeId = proposal.id;
      queueItem.updatedAt = nowIso();

      if (autoPromoteTheme(proposal, queueItem, registry, knownThemes, promotionsToday)) {
        const promoted = {
          id: proposal.id,
          sourceTopicKey: queueItem.topicKey,
          promotedAt: nowIso(),
          confidence: proposal.confidence,
          autoPromoted: true,
          theme: buildThemeDefinitionFromProposal(proposal),
        } satisfies PromotedThemeState;
        state.promotedThemes = [
          ...state.promotedThemes.filter((entry) => entry.id !== promoted.id),
          promoted,
        ];
        queueItem.status = 'promoted';
        queueItem.promotedThemeId = proposal.id;
        queueItem.updatedAt = nowIso();
        knownThemes.push(promoted.theme);
        promotedThemes.push(promoted.id);
        promotionsToday += 1;
      }
    } finally {
      await releaseThemeLock();
    }
  }

  applyPromotedThemes(state);

  const replayTriggeredByTheme = new Set<string>();
  for (const promotedThemeId of promotedThemes) {
    const relatedQueueItem = state.themeQueue.find((item) => item.promotedThemeId === promotedThemeId);
    for (const datasetId of relatedQueueItem?.datasetIds || []) {
      if (replayTriggeredByTheme.has(datasetId)) continue;
      const dataset = enabledDatasets.find((entry) => entry.id === datasetId);
      if (!dataset) continue;
      const frames = await loadHistoricalReplayFramesFromDuckDb({
        dbPath: registry.defaults.dbPath,
        datasetId,
        includeWarmup: true,
        ...dataset.frameLoadOptions,
      });
      const rerun = await runWithRetry(datasetId, 'replay', registry.defaults.maxRetries, async () => {
        const replayRun = await runHistoricalReplay(frames, {
          label: `${dataset.label} / theme-refresh replay`,
          retainLearningState: false,
          warmupFrameCount: Number(dataset.replayOptions?.warmupFrameCount) || registry.defaults.warmupFrameCount,
          horizonsHours: registry.defaults.horizonsHours.slice(),
          ...dataset.replayOptions,
        });
        const datasetState = getDatasetState(state, datasetId);
        datasetState.lastReplayAt = nowIso();
        return replayRun;
      }, state);
      replayRuns.push(toReplaySummary(datasetId, rerun));
      replayTriggeredByTheme.add(datasetId);
    }
  }

  const candidateExpansion = await runCandidateExpansionSweep({ registry, state });
  candidateThemes.push(...candidateExpansion.themeIds);

  if (candidateExpansion.acceptedAny) {
    for (const dataset of enabledDatasets) {
      if (replayTriggeredByTheme.has(dataset.id)) continue;
      const frames = await loadHistoricalReplayFramesFromDuckDb({
        dbPath: registry.defaults.dbPath,
        datasetId: dataset.id,
        includeWarmup: true,
        ...dataset.frameLoadOptions,
      });
      const rerun = await runWithRetry(dataset.id, 'replay', registry.defaults.maxRetries, async () => {
        const replayRun = await runHistoricalReplay(frames, {
          label: `${dataset.label} / candidate-refresh replay`,
          retainLearningState: false,
          warmupFrameCount: Number(dataset.replayOptions?.warmupFrameCount) || registry.defaults.warmupFrameCount,
          horizonsHours: registry.defaults.horizonsHours.slice(),
          ...dataset.replayOptions,
        });
        const datasetState = getDatasetState(state, dataset.id);
        datasetState.lastReplayAt = nowIso();
        return replayRun;
      }, state);
      replayRuns.push(toReplaySummary(dataset.id, rerun));
    }
  }

  for (const dataset of enabledDatasets) {
    await pruneArtifacts(path.resolve(registry.defaults.artifactDir, dataset.id), registry.defaults.artifactRetentionCount, registry.defaults.retentionDays);
  }
  state.runs = state.runs.filter((run) => asTs(run.completedAt) >= Date.now() - registry.defaults.retentionDays * 86_400_000);
  state.themeQueue = state.themeQueue.filter((item) => item.status === 'open' || asTs(item.updatedAt) >= Date.now() - registry.defaults.retentionDays * 86_400_000);
  await saveAutomationState(state, args.statePath || DEFAULT_STATE_PATH);

  return {
    startedAt,
    completedAt: nowIso(),
    datasetCount: enabledDatasets.length,
    touchedDatasets: Array.from(touchedDatasets),
    replayRuns,
    promotedThemes,
    candidateThemes,
    sourceAutomation,
    queueOpenCount: state.themeQueue.filter((item) => item.status === 'open').length,
  };
}

export async function getIntelligenceAutomationStatus(args: {
  registryPath?: string;
  statePath?: string;
} = {}): Promise<{ registry: IntelligenceAutomationRegistry; state: IntelligenceAutomationState }> {
  const [registry, state] = await Promise.all([
    loadAutomationRegistry(args.registryPath),
    loadAutomationState(args.statePath),
  ]);
  return { registry, state };
}

export async function runIntelligenceAutomationWorker(args: {
  registryPath?: string;
  statePath?: string;
  pollIntervalMinutes?: number;
  once?: boolean;
} = {}): Promise<void> {
  const intervalMs = Math.max(1, Math.round(args.pollIntervalMinutes || 5)) * 60_000;
  do {
    await runIntelligenceAutomationCycle({
      registryPath: args.registryPath,
      statePath: args.statePath,
    });
    if (args.once) return;
    await sleep(intervalMs);
  } while (true);
}
