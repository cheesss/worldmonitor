---
title: "2026-03: Pilot scheduler bootstrap and enabled default datasets"
summary: The default historical registry is now enabled for pilot use, and Windows scheduler helper scripts can keep the unattended loop running after restart.
status: stable
updated: 2026-03-17
owner: core
---

# 2026-03: Pilot scheduler bootstrap and enabled default datasets

The unattended research loop is now easier to turn on for a small internal pilot.

## What changed

- the default historical registry now enables:
  - `coingecko-btc-core`
  - `fred-core-cpi`
  - `gdelt-middle-east`
  - `acled-middle-east`
- Windows scheduler helper scripts now exist for:
  - running the loop with `.env.local`
  - writing logs to `data/automation/logs`
  - registering a scheduled task that restarts the unattended loop after reboot
  - falling back to a Startup-folder launcher when task registration is blocked by local policy

## What still depends on operator secrets

- `FRED_API_KEY`
- `ACLED_ACCESS_TOKEN`
- optional remote AI provider keys

The scheduler will try to use enabled datasets immediately, but provider-backed datasets still need valid credentials.
