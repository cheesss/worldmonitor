---
title: "2026-03: App-grade globe and 2D map moved onto the home page"
summary: "The docs home now carries the heavier 3D globe and a desktop-style 2D operations map, both backed by mock data and product-grade visual language."
status: stable
variants:
  - full
  - tech
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03: App-grade globe and 2D map moved onto the home page

## What changed

- replaced the lightweight home map widgets with the app-grade 3D globe surface
- added a new app-grade 2D operations map directly on the home page
- kept the dedicated `showcase/globe` route as an optional focused view
- updated the feature index so the home page is now the first visual entry point

## Why it matters

The main page now shows the closest read-only approximation of the real product without making visitors jump to a separate showcase route first.

## User impact

- visitors can rotate a richer 3D globe immediately on the home page
- visitors can also click through a 2D flat map with hotspot, relation, lane, and density layers
- the docs home now behaves more like a product surface and less like a static landing page
