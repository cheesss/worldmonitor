---
title: 2026-03 Automation and Theme Discovery
summary: Added unattended replay scheduling, dataset registry, theme discovery queue, and guarded Codex theme proposals.
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03 Automation and Theme Discovery

## What changed

- Added `config/intelligence-datasets.json` as a dataset registry
- Added a scheduler worker for unattended fetch, import, replay, and nightly walk-forward
- Added file-based lock, retry, and retention handling for automation jobs
- Added a theme discovery queue from repeated unmapped replay motifs
- Added guarded Codex theme proposal automation

## Why it matters

The backtest stack can now run as an operator service instead of requiring repeated manual button clicks. The theme catalog can also expand when repeated motifs appear outside the current trigger set.

## User impact

- Operators can run the historical loop with `npm run intelligence:scheduler`
- Codex can now propose reusable backtest themes
- Theme promotion is still policy-gated in guarded mode and is not a blind execution path

## Operational note

An empty or disabled dataset registry intentionally produces no scheduled work.
