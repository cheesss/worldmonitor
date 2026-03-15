import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import type { InvestmentThemeDefinition } from '../investment-intelligence';
import type { CodexThemeProposal, ThemeDiscoveryQueueItem } from '../theme-discovery';

interface CodexExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

const CODEX_TIMEOUT_MS = 95_000;

function normalize(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string): string {
  return normalize(value).replace(/\s+/g, '-').slice(0, 72) || 'theme';
}

function buildExecArgs(prompt: string): string[] {
  const args = ['exec'];
  if (process.env.CODEX_MODEL?.trim()) {
    args.push('--model', process.env.CODEX_MODEL.trim());
  }
  args.push('--json', '--skip-git-repo-check', '--sandbox', 'read-only', '--ask-for-approval', 'never', prompt);
  return args;
}

function parseCodexJsonOutput(stdout: string): string {
  let lastAgentMessage = '';
  for (const rawLine of String(stdout || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed?.type === 'item.completed' && parsed?.item?.type === 'agent_message' && typeof parsed.item.text === 'string') {
        lastAgentMessage = parsed.item.text.trim();
      }
    } catch {
      // ignore
    }
  }
  return lastAgentMessage;
}

function parseJsonObject(rawText: string): Record<string, unknown> | null {
  const text = String(rawText || '').trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      try {
        const parsed = JSON.parse(fenced[1].trim());
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
      } catch {
        return null;
      }
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getSafeEnv(): NodeJS.ProcessEnv {
  const keys = [
    'PATH', 'Path', 'PATHEXT', 'SystemRoot', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP',
    'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA',
    'PROGRAMDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'CODEX_HOME', 'HTTPS_PROXY',
    'HTTP_PROXY', 'NO_PROXY', 'LANG', 'TERM', 'CODEX_MODEL', 'CODEX_BIN',
  ];
  const env: NodeJS.ProcessEnv = {};
  for (const key of keys) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function isCodexLoggedIn(outputText: string): boolean {
  return /logged in/i.test(String(outputText || ''));
}

async function resolveCodexCommand(): Promise<string> {
  if (process.env.CODEX_BIN?.trim() && existsSync(process.env.CODEX_BIN.trim())) {
    return process.env.CODEX_BIN.trim();
  }
  const userHome = process.env.USERPROFILE || os.homedir();
  const appData = process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');
  const candidates = [
    path.join(localAppData, 'Programs', 'OpenAI', 'codex', 'codex.exe'),
    path.join(appData, 'npm', 'codex.cmd'),
    path.join(appData, 'npm', 'codex'),
  ];
  const vscodeExtRoot = path.join(userHome, '.vscode', 'extensions');
  if (existsSync(vscodeExtRoot)) {
    try {
      const entries = await readdir(vscodeExtRoot, { withFileTypes: true });
      for (const entry of entries
        .filter((item) => item.isDirectory() && item.name.startsWith('openai.chatgpt-'))
        .sort((a, b) => b.name.localeCompare(a.name))) {
        candidates.unshift(path.join(vscodeExtRoot, entry.name, 'bin', 'windows-x86_64', 'codex.exe'));
      }
    } catch {
      // ignore
    }
  }
  return candidates.find((candidate) => existsSync(candidate)) || 'codex';
}

async function runCodexCli(args: string[], timeoutMs = CODEX_TIMEOUT_MS): Promise<CodexExecResult> {
  const command = await resolveCodexCommand();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: getSafeEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: Number(code ?? 1), stdout, stderr });
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: `${stderr}\n${error.message}`.trim() });
    });
  });
}

function buildThemePrompt(queueItem: ThemeDiscoveryQueueItem, knownThemes: InvestmentThemeDefinition[]): string {
  const knownThemeRows = knownThemes
    .slice(0, 14)
    .map((theme) => `- ${theme.id}: ${theme.label} | triggers=${theme.triggers.slice(0, 6).join(', ')}`)
    .join('\n');
  return [
    'You are a theme-discovery planner for macro and geopolitical backtesting.',
    'Return strict JSON only. No markdown.',
    'Goal: convert the discovery queue item into a reusable backtest theme proposal.',
    'The proposal must be distinct from existing themes, liquid, and broad enough for replay/backtest.',
    'Use only ETF / liquid equity / commodity / fx / rate / crypto symbols.',
    'JSON schema:',
    '{',
    '  "id": "kebab-case-theme-id",',
    '  "label": "Human readable label",',
    '  "confidence": 0-100,',
    '  "reason": "one sentence",',
    '  "triggers": ["..."],',
    '  "sectors": ["..."],',
    '  "commodities": ["..."],',
    '  "timeframe": "1d-7d",',
    '  "thesis": "one paragraph",',
    '  "invalidation": ["...", "..."],',
    '  "assets": [',
    '    { "symbol": "XLE", "name": "Energy Select Sector SPDR", "assetKind": "etf", "sector": "energy", "commodity": "crude oil", "direction": "long", "role": "primary" }',
    '  ]',
    '}',
    `Queue item: ${queueItem.label}`,
    `Topic key: ${queueItem.topicKey}`,
    `Signal score: ${queueItem.signalScore}`,
    `Samples: ${queueItem.sampleCount}, sources: ${queueItem.sourceCount}, regions: ${queueItem.regionCount}`,
    `Hints: ${queueItem.hints.join(' | ') || '(none)'}`,
    `Supporting headlines: ${queueItem.supportingHeadlines.slice(0, 6).join(' || ') || '(none)'}`,
    `Suggested symbols from discovery: ${queueItem.suggestedSymbols.join(', ') || '(none)'}`,
    'Existing themes:',
    knownThemeRows || '(none)',
  ].join('\n');
}

function normalizeAssetKind(value: unknown): CodexThemeProposal['assets'][number]['assetKind'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'equity' || normalized === 'commodity' || normalized === 'fx' || normalized === 'rate' || normalized === 'crypto') {
    return normalized;
  }
  return 'etf';
}

function normalizeDirection(value: unknown): CodexThemeProposal['assets'][number]['direction'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'short' || normalized === 'hedge' || normalized === 'watch' || normalized === 'pair') {
    return normalized;
  }
  return 'long';
}

function normalizeRole(value: unknown): CodexThemeProposal['assets'][number]['role'] {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'hedge' || normalized === 'confirm') return normalized;
  return 'primary';
}

function normalizeProposal(raw: Record<string, unknown>, queueItem: ThemeDiscoveryQueueItem): CodexThemeProposal | null {
  const assets = Array.isArray(raw.assets)
    ? raw.assets
      .map((asset) => ({
        symbol: String((asset as Record<string, unknown>).symbol || '').trim().toUpperCase(),
        name: String((asset as Record<string, unknown>).name || (asset as Record<string, unknown>).symbol || '').trim(),
        assetKind: normalizeAssetKind((asset as Record<string, unknown>).assetKind),
        sector: String((asset as Record<string, unknown>).sector || 'cross-asset').trim().toLowerCase() || 'cross-asset',
        commodity: (asset as Record<string, unknown>).commodity ? String((asset as Record<string, unknown>).commodity).trim().toLowerCase() : null,
        direction: normalizeDirection((asset as Record<string, unknown>).direction),
        role: normalizeRole((asset as Record<string, unknown>).role),
      }))
      .filter((asset) => asset.symbol)
      .slice(0, 8)
    : [];
  if (assets.length === 0) return null;
  return {
    id: slugify(String(raw.id || queueItem.topicKey)),
    label: String(raw.label || queueItem.label).trim() || queueItem.label,
    confidence: Math.max(25, Math.min(95, Number(raw.confidence) || queueItem.signalScore)),
    reason: String(raw.reason || `Codex proposed a reusable theme for ${queueItem.label}.`).slice(0, 280),
    triggers: Array.isArray(raw.triggers) ? raw.triggers.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).slice(0, 18) : queueItem.hints.slice(0, 8),
    sectors: Array.isArray(raw.sectors) ? raw.sectors.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).slice(0, 8) : [],
    commodities: Array.isArray(raw.commodities) ? raw.commodities.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean).slice(0, 6) : [],
    timeframe: String(raw.timeframe || '1d-7d').trim() || '1d-7d',
    thesis: String(raw.thesis || `Repeated motif ${queueItem.label} appears to carry reusable event-to-asset structure.`).trim(),
    invalidation: Array.isArray(raw.invalidation) ? raw.invalidation.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 6) : [],
    assets,
  };
}

export async function proposeThemeWithCodex(
  queueItem: ThemeDiscoveryQueueItem,
  knownThemes: InvestmentThemeDefinition[],
): Promise<CodexThemeProposal | null> {
  const loginStatus = await runCodexCli(['login', 'status'], 8_000);
  if (loginStatus.code !== 0 || !isCodexLoggedIn(`${loginStatus.stdout}\n${loginStatus.stderr}`)) {
    return null;
  }
  const prompt = buildThemePrompt(queueItem, knownThemes);
  const result = await runCodexCli(buildExecArgs(prompt), CODEX_TIMEOUT_MS);
  if (result.code !== 0) {
    return null;
  }
  const message = parseCodexJsonOutput(result.stdout || '') || result.stdout;
  const parsed = parseJsonObject(message);
  if (!parsed) return null;
  return normalizeProposal(parsed, queueItem);
}
