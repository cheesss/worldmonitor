import {
  listDiscoveredSources,
  setDiscoveredSourceStatus,
  type DiscoveredSourceRecord,
} from '../source-registry';
import {
  listApiSourceRegistry,
  refreshApiSourceHealth,
  setApiSourceStatusWithMeta,
  type ApiSourceRecord,
} from '../api-source-registry';

export type SourceAutomationMode = 'manual' | 'guarded-auto' | 'full-auto';

export interface SourceAutomationPolicy {
  mode: SourceAutomationMode;
  minDiscoveredApproveConfidence: number;
  minDiscoveredActivateConfidence: number;
  minApiApproveConfidence: number;
  minApiActivateConfidence: number;
  maxDiscoveredActivationsPerCycle: number;
  maxApiActivationsPerCycle: number;
  requireFeedLikeUrl: boolean;
  requireHealthyApi: boolean;
  healthRefreshBatch: number;
  staleHealthHours: number;
}

export interface SourceAutomationSweepResult {
  mode: SourceAutomationMode;
  discoveredApproved: string[];
  discoveredActivated: string[];
  apiApproved: string[];
  apiActivated: string[];
  refreshedApiHealth: string[];
}

const DEFAULT_SOURCE_AUTOMATION_POLICY: SourceAutomationPolicy = {
  mode: 'guarded-auto',
  minDiscoveredApproveConfidence: 84,
  minDiscoveredActivateConfidence: 92,
  minApiApproveConfidence: 90,
  minApiActivateConfidence: 94,
  maxDiscoveredActivationsPerCycle: 6,
  maxApiActivationsPerCycle: 4,
  requireFeedLikeUrl: true,
  requireHealthyApi: true,
  healthRefreshBatch: 12,
  staleHealthHours: 12,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeSourceAutomationPolicy(policy?: Partial<SourceAutomationPolicy> | null): SourceAutomationPolicy {
  return {
    mode: policy?.mode === 'manual' || policy?.mode === 'guarded-auto' || policy?.mode === 'full-auto'
      ? policy.mode
      : DEFAULT_SOURCE_AUTOMATION_POLICY.mode,
    minDiscoveredApproveConfidence: clamp(Math.round(Number(policy?.minDiscoveredApproveConfidence) || DEFAULT_SOURCE_AUTOMATION_POLICY.minDiscoveredApproveConfidence), 40, 98),
    minDiscoveredActivateConfidence: clamp(Math.round(Number(policy?.minDiscoveredActivateConfidence) || DEFAULT_SOURCE_AUTOMATION_POLICY.minDiscoveredActivateConfidence), 50, 99),
    minApiApproveConfidence: clamp(Math.round(Number(policy?.minApiApproveConfidence) || DEFAULT_SOURCE_AUTOMATION_POLICY.minApiApproveConfidence), 40, 98),
    minApiActivateConfidence: clamp(Math.round(Number(policy?.minApiActivateConfidence) || DEFAULT_SOURCE_AUTOMATION_POLICY.minApiActivateConfidence), 50, 99),
    maxDiscoveredActivationsPerCycle: clamp(Math.round(Number(policy?.maxDiscoveredActivationsPerCycle) || DEFAULT_SOURCE_AUTOMATION_POLICY.maxDiscoveredActivationsPerCycle), 1, 20),
    maxApiActivationsPerCycle: clamp(Math.round(Number(policy?.maxApiActivationsPerCycle) || DEFAULT_SOURCE_AUTOMATION_POLICY.maxApiActivationsPerCycle), 1, 20),
    requireFeedLikeUrl: typeof policy?.requireFeedLikeUrl === 'boolean' ? policy.requireFeedLikeUrl : DEFAULT_SOURCE_AUTOMATION_POLICY.requireFeedLikeUrl,
    requireHealthyApi: typeof policy?.requireHealthyApi === 'boolean' ? policy.requireHealthyApi : DEFAULT_SOURCE_AUTOMATION_POLICY.requireHealthyApi,
    healthRefreshBatch: clamp(Math.round(Number(policy?.healthRefreshBatch) || DEFAULT_SOURCE_AUTOMATION_POLICY.healthRefreshBatch), 1, 32),
    staleHealthHours: clamp(Math.round(Number(policy?.staleHealthHours) || DEFAULT_SOURCE_AUTOMATION_POLICY.staleHealthHours), 1, 168),
  };
}

function isFeedLikeUrl(url: string): boolean {
  return /(rss|feed|atom|xml)/i.test(String(url || ''));
}

function discoveredMeetsGuardedCriteria(record: DiscoveredSourceRecord): boolean {
  return record.discoveredBy === 'codex-playwright'
    || record.discoveredBy === 'playwright'
    || ((record.topics?.length || 0) >= 2 && record.discoveredBy === 'heuristic');
}

function apiMeetsGuardedCriteria(record: ApiSourceRecord): boolean {
  return record.discoveredBy === 'codex-playwright'
    || record.discoveredBy === 'playwright'
    || (record.schemaHint !== 'unknown' && record.discoveredBy === 'heuristic');
}

function shouldApproveDiscovered(record: DiscoveredSourceRecord, policy: SourceAutomationPolicy): boolean {
  if (record.status !== 'draft') return false;
  if (record.confidence < policy.minDiscoveredApproveConfidence) return false;
  if (policy.requireFeedLikeUrl && !isFeedLikeUrl(record.url)) return false;
  if (policy.mode === 'guarded-auto') return discoveredMeetsGuardedCriteria(record);
  return true;
}

function shouldActivateDiscovered(record: DiscoveredSourceRecord, policy: SourceAutomationPolicy): boolean {
  if (record.status !== 'approved') return false;
  if (record.confidence < policy.minDiscoveredActivateConfidence) return false;
  if (policy.requireFeedLikeUrl && !isFeedLikeUrl(record.url)) return false;
  if (policy.mode === 'guarded-auto') return discoveredMeetsGuardedCriteria(record);
  return true;
}

function shouldApproveApi(record: ApiSourceRecord, policy: SourceAutomationPolicy): boolean {
  if (record.status !== 'draft') return false;
  if (record.confidence < policy.minApiApproveConfidence) return false;
  if (policy.mode === 'guarded-auto') return apiMeetsGuardedCriteria(record);
  return true;
}

function shouldActivateApi(record: ApiSourceRecord, policy: SourceAutomationPolicy): boolean {
  if (record.status !== 'approved') return false;
  if (record.confidence < policy.minApiActivateConfidence) return false;
  if (policy.requireHealthyApi && record.healthStatus !== 'ok') return false;
  if (policy.mode === 'guarded-auto') return apiMeetsGuardedCriteria(record);
  return true;
}

function staleHealth(record: ApiSourceRecord, staleHealthHours: number): boolean {
  if (!record.lastCheckedAt) return true;
  return Date.now() - record.lastCheckedAt >= staleHealthHours * 60 * 60 * 1000;
}

export async function runSourceAutomationSweep(policyInput?: Partial<SourceAutomationPolicy> | null): Promise<SourceAutomationSweepResult> {
  const policy = normalizeSourceAutomationPolicy(policyInput);
  const result: SourceAutomationSweepResult = {
    mode: policy.mode,
    discoveredApproved: [],
    discoveredActivated: [],
    apiApproved: [],
    apiActivated: [],
    refreshedApiHealth: [],
  };

  if (policy.mode === 'manual') return result;

  const discovered = await listDiscoveredSources();
  for (const record of discovered) {
    if (shouldApproveDiscovered(record, policy)) {
      const next = await setDiscoveredSourceStatus(record.id, 'approved', {
        actor: 'system',
        note: `Auto-approved by ${policy.mode} source policy.`,
      });
      if (next) result.discoveredApproved.push(next.id);
    }
  }

  const discoveredAfterApprove = await listDiscoveredSources();
  for (const record of discoveredAfterApprove) {
    if (result.discoveredActivated.length >= policy.maxDiscoveredActivationsPerCycle) break;
    if (!shouldActivateDiscovered(record, policy)) continue;
    const next = await setDiscoveredSourceStatus(record.id, 'active', {
      actor: 'system',
      note: `Auto-activated by ${policy.mode} source policy.`,
    });
    if (next) result.discoveredActivated.push(next.id);
  }

  let apiSources = await listApiSourceRegistry();
  for (const record of apiSources
    .filter((item) => item.status !== 'active' && item.status !== 'rejected' && staleHealth(item, policy.staleHealthHours))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, policy.healthRefreshBatch)) {
    const next = await refreshApiSourceHealth(record.id).catch(() => null);
    if (next) result.refreshedApiHealth.push(next.id);
  }

  apiSources = await listApiSourceRegistry();
  for (const record of apiSources) {
    if (shouldApproveApi(record, policy)) {
      const next = await setApiSourceStatusWithMeta(record.id, 'approved', {
        actor: 'system',
        note: `Auto-approved by ${policy.mode} API source policy.`,
      });
      if (next) result.apiApproved.push(next.id);
    }
  }

  apiSources = await listApiSourceRegistry();
  for (const record of apiSources) {
    if (result.apiActivated.length >= policy.maxApiActivationsPerCycle) break;
    if (!shouldActivateApi(record, policy)) continue;
    const next = await setApiSourceStatusWithMeta(record.id, 'active', {
      actor: 'system',
      note: `Auto-activated by ${policy.mode} API source policy.`,
    });
    if (next) result.apiActivated.push(next.id);
  }

  return result;
}
