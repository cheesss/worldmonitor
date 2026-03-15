# Intelligence Automation Runbook

## Purpose

Run historical fetch, import, replay, walk-forward, source acceptance, candidate expansion, and theme discovery without daily operator intervention.

## Files

- registry: `config/intelligence-datasets.json`
- state: `data/automation/intelligence-scheduler-state.json`
- locks: `data/automation/locks/*.lock.json`
- scheduler entrypoint: `scripts/intelligence-scheduler.mjs`
- automation service: `src/services/server/intelligence-automation.ts`

## Core loop

1. Load dataset registry
2. Acquire dataset lock
3. Fetch historical payload
4. Write artifact to `data/historical/automation/<dataset-id>/`
5. Import into DuckDB archive
6. Run replay when cadence is due
7. Run nightly walk-forward when local hour threshold is met
8. Sweep discovered sources and API sources through guarded auto-accept / auto-activate policy
9. Refresh theme discovery queue
10. Ask Codex for theme proposals only for top queue items
11. Auto-promote only if policy thresholds pass
12. Ask Codex for candidate expansion on top coverage gaps
13. Auto-accept only if universe policy thresholds pass
14. Re-run replay if new accepted candidates changed the active universe
15. Release lock
16. Apply retention to artifacts and scheduler history

## Commands

Run one cycle:

```bash
npm run intelligence:scheduler:once
```

Run worker loop:

```bash
npm run intelligence:scheduler
```

Inspect registry and state:

```bash
node --import tsx scripts/intelligence-scheduler.mjs status
```

## Locking

- lock scope is per dataset and per theme queue item
- lock files live under `data/automation/locks`
- stale locks expire by TTL and are reclaimed automatically

## Retry

- failures are retried automatically
- backoff grows exponentially from 5 minutes
- the dataset state carries `nextEligibleAt` after repeated failure

## Retention

- scheduler run history is trimmed by age
- old fetch artifacts are pruned per dataset
- old non-open queue items are pruned by retention window

## Theme discovery and Codex

### Theme discovery

The discovery queue is built from replay-frame motifs that repeat across:

- samples
- sources
- regions

and do not overlap too much with the current theme catalog.

### Codex theme proposer

Codex can now propose reusable backtest themes from queue items.

Codex proposal output is expected to include:

- theme id and label
- trigger set
- sectors and commodities
- thesis and invalidation
- liquid candidate assets

### Promotion policy

Default mode is `guarded-auto`.

A theme is auto-promoted only when:

- discovery score clears the threshold
- sample count is sufficient
- source diversity is sufficient
- Codex confidence clears the threshold
- at least the minimum number of liquid assets is proposed
- daily promotion budget is not exhausted

## Important limitation

Codex can propose backtest themes and candidate assets, but it is still not the final execution engine. The scheduler policy and universe policy remain the deterministic gates.

## Source automation

The scheduler now also runs a source registry sweep.

Default mode is `guarded-auto`.

It can:

- auto-approve discovered feed candidates that pass confidence and feed-shape checks
- auto-activate approved feed candidates when their confidence is high enough
- refresh API source health in batches
- auto-approve and auto-activate API sources when confidence, schema, and health thresholds pass

This does not remove manual override. It removes the need to click through routine approvals.

## Candidate expansion automation

The scheduler now looks at coverage gaps after replay and theme promotion.

When the gap policy allows it, the worker:

- selects the highest-priority gap themes
- asks Codex for additional liquid symbols
- ingests proposals into the candidate review store
- applies the current universe policy immediately
- replays again if any newly inserted candidate is auto-accepted

This means investment idea coverage can widen without waiting for a human to press `Ask Codex`.
