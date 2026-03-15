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
- source registry auto-accept and auto-activation sweeps
- theme discovery queue
- guarded Codex theme proposals
- guarded Codex candidate expansion for coverage gaps

## Why it exists

Backtests are only useful when they run on a fixed schedule against a known dataset set. Theme discovery is only useful when repeated unmapped motifs are surfaced and promoted in a controlled way.

## Automation loop

1. Read `config/intelligence-datasets.json`
2. Fetch enabled historical sources on schedule
3. Import into bitemporal DuckDB history
4. Run replay on cadence
5. Run nightly walk-forward
6. Sweep source registries through guarded auto-accept / auto-activate policy
7. Refresh theme discovery queue from recent frames
8. Ask Codex for theme proposals only for high-signal queue items
9. Auto-promote only when guarded thresholds pass
10. Ask Codex for candidate expansion only on top coverage gaps
11. Re-run replay when accepted candidates changed the active universe

## Theme discovery

The queue is built from repeated motifs in replay frames that do not fit the current theme trigger set well enough.

It looks for:

- repeated phrases
- multi-source repetition
- multi-region repetition
- low overlap with the current theme catalog

Codex is not the direct execution engine here. It proposes reusable backtest themes. The scheduler then applies deterministic promotion gates.

## Source automation

The worker now sweeps discovered feeds and discovered API sources.

Under `guarded-auto`, it can:

- approve draft feed candidates that already look like valid RSS/Atom endpoints
- activate approved feed candidates when confidence is high enough
- refresh API source health in batches
- promote healthy API candidates from `draft` to `approved` or `active`

Manual override still exists, but routine registry maintenance no longer requires repeated button clicks.

## Candidate expansion

After replay, the worker inspects coverage gaps and can ask Codex for additional liquid symbols.

Those proposals are:

- inserted into the candidate review store
- immediately re-evaluated against the current universe policy
- replayed again if any candidate is auto-accepted

## Current policy

- default mode: `guarded-auto`
- queue items need repeated samples and source diversity
- Codex confidence must clear the configured threshold
- proposals need multiple liquid candidate assets
- promoted themes are added to the next replay cycle, not hot-patched into the currently running decision
- source candidates and API candidates are only auto-activated when confidence and structural checks pass
- candidate expansion proposals are only auto-accepted when the universe policy clears them

## Files and commands

- registry: `config/intelligence-datasets.json`
- scheduler script: `scripts/intelligence-scheduler.mjs`
- scheduler service: `src/services/server/intelligence-automation.ts`
- theme discovery: `src/services/theme-discovery.ts`
- Codex theme proposer: `src/services/server/codex-theme-proposer.ts`
- Codex candidate proposer: `src/services/server/codex-candidate-proposer.ts`
- source automation: `src/services/server/source-automation.ts`

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
