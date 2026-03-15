---
title: Automation & Theme Discovery
summary: Dataset registry, scheduler worker, retry/retention, theme discovery queue, and Codex-backed theme promotion.
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# Automation & Theme Discovery

## What it does

Runs the historical intelligence loop without daily operator intervention:

- dataset registry
- scheduler worker
- fetch -> import -> replay
- nightly walk-forward
- lock, retry, and retention handling
- theme discovery queue
- guarded Codex theme proposals

## Why it exists

Backtests are only useful when they run on a fixed schedule against a known dataset set. Theme discovery is only useful when repeated unmapped motifs are surfaced and promoted in a controlled way.

## Automation loop

1. Read `config/intelligence-datasets.json`
2. Fetch enabled historical sources on schedule
3. Import into bitemporal DuckDB history
4. Run replay on cadence
5. Run nightly walk-forward
6. Refresh theme discovery queue from recent frames
7. Ask Codex for theme proposals only for high-signal queue items
8. Auto-promote only when guarded thresholds pass

## Theme discovery

The queue is built from repeated motifs in replay frames that do not fit the current theme trigger set well enough.

It looks for:

- repeated phrases
- multi-source repetition
- multi-region repetition
- low overlap with the current theme catalog

Codex is not the direct execution engine here. It proposes reusable backtest themes. The scheduler then applies deterministic promotion gates.

## Current policy

- default mode: `guarded-auto`
- queue items need repeated samples and source diversity
- Codex confidence must clear the configured threshold
- proposals need multiple liquid candidate assets
- promoted themes are added to the next replay cycle, not hot-patched into the currently running decision

## Files and commands

- registry: `config/intelligence-datasets.json`
- scheduler script: `scripts/intelligence-scheduler.mjs`
- scheduler service: `src/services/server/intelligence-automation.ts`
- theme discovery: `src/services/theme-discovery.ts`
- Codex theme proposer: `src/services/server/codex-theme-proposer.ts`

Commands:

```bash
npm run intelligence:scheduler:once
npm run intelligence:scheduler
node --import tsx scripts/intelligence-scheduler.mjs status
```

## Limits

- Codex can propose backtest themes, but it does not blindly override the scheduler policy.
- A promoted theme still depends on market data and replay coverage.
- Empty or disabled dataset registries do nothing by design.
