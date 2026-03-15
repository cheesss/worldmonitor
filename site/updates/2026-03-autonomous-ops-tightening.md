---
title: "2026-03: Autonomous source acceptance and candidate expansion"
summary: The scheduler now auto-sweeps source registries, asks Codex for missing coverage candidates, and replays again when the active universe changes.
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03: Autonomous source acceptance and candidate expansion

## What changed

- Added guarded source automation for discovered RSS feeds and discovered API sources
- Added scheduler-driven Codex candidate expansion for top coverage gaps
- Added immediate universe-policy evaluation when Codex candidate proposals are ingested
- Added automatic replay refresh when new accepted candidates changed the active universe

## Why it matters

The biggest remaining manual steps were routine source acceptance and pressing `Ask Codex` for missing investment coverage. Those are now part of the unattended worker loop under deterministic guardrails.

## User impact

- `Source Ops` still allows manual overrides, but routine approval and activation work can now happen without operator clicks
- `Investment Workflow` still shows the review queue, but the scheduler can now populate and auto-accept eligible candidates before you open the panel
- `Replay` and `walk-forward` results can adapt faster because accepted universe changes now trigger a replay refresh

## Safety boundary

- Codex still does not directly decide trades
- source candidates still need confidence and structure checks
- candidate proposals still need to pass the current universe policy
- auto-accepted candidates still remain subject to probation and auto-demotion
