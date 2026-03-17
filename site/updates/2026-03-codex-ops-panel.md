---
title: "2026-03: Codex Ops panel for activation checks and queue diagnosis"
summary: Added a Codex-only operations view that shows activation gates, empty-queue diagnosis, and only the sources, themes, and datasets created by Codex.
status: beta
variants:
  - full
  - finance
updated: 2026-03-17
owner: core
---

# 2026-03: Codex Ops panel for activation checks and queue diagnosis

The app now exposes a dedicated `Codex Ops` panel inside `Codex Hub`.

It is narrower than `Source Ops` on purpose. The goal is to make Codex-driven automation inspectable without mixing it with every manual or heuristic source workflow.

## What it shows

- a short activation checklist for Codex automation
- a direct diagnosis of why the theme or dataset queue is still empty
- blocked datasets and retry windows
- only `codex-playwright` feed and API discoveries
- only Codex-promoted themes
- only Codex dataset proposals
- recent Codex-adjacent automation runs

## Why this matters

Before this panel, the system had Codex-backed source, theme, and dataset automation, but the operator still had to infer whether it was actually armed by checking several different places.

Now the operator can answer three questions in one place:

1. Is Codex automation live?
2. What is blocking it?
3. What did Codex actually add?
