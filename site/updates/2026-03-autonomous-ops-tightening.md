---
title: "2026-03: Autonomous source acceptance and candidate expansion"
summary: The scheduler now auto-sweeps source registries, asks Codex for missing coverage candidates, and uses score, diversity, and cooldown controls to avoid one-sided automation.
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
- Replaced raw-confidence approvals with composite scoring in source and candidate automation
- Added sector, asset-kind, category, domain, and base-url caps to avoid over-concentration
- Added cooldown and region-balance controls for scheduler-driven candidate expansion
- Added promotion-score and novelty-overlap gates for Codex-driven theme promotion
- Added autonomous keyword lifecycle review so weak autonomous terms can retire without manual cleanup
- Added automatic theme-queue hygiene for low-signal or stale motifs
- Added automatic idea-card suppression for weak operator-facing ideas

## Why it matters

The biggest remaining manual steps were routine source acceptance and pressing `Ask Codex` for missing investment coverage. Those are now part of the unattended worker loop under deterministic guardrails, and the worker is less likely to keep reinforcing the same theme, source family, or sector repeatedly.

## User impact

- `Source Ops` still allows manual overrides, but routine approval and activation work can now happen without operator clicks
- `Investment Workflow` still shows the review queue, but the scheduler can now populate and auto-accept eligible candidates before you open the panel
- `Replay` and `walk-forward` results can adapt faster because accepted universe changes now trigger a replay refresh
- Auto-approvals should now be more balanced because the worker penalizes crowding and respects caps instead of relying on a single threshold
- Operators should spend less time manually deleting weak keywords or ignoring low-quality idea cards because the unattended loop now cleans both paths

## Safety boundary

- Codex still does not directly decide trades
- source candidates still need confidence and structure checks
- candidate proposals still need to pass the current universe policy
- auto-accepted candidates still remain subject to probation and auto-demotion
- scheduler-driven candidate expansion now respects theme cooldowns and region balancing before it asks Codex again
