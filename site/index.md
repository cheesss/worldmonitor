---
layout: home
title: Lattice Current
summary: Real-time global intelligence, AI-assisted analysis, ontology graphs, and historical replay from one codebase.
status: stable
variants:
  - full
  - tech
  - finance
updated: 2026-03-16
owner: core
hero:
  name: Lattice Current
  text: Real-time intelligence with AI, ontology graphs, and backtesting
  tagline: An independent public research fork for live monitoring, event-to-market analysis, and replay-driven decision support.
  image:
    src: /images/hero/worldmonitor-hero.jpg
    alt: Lattice Current sanitized hero image
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Architecture
      link: /architecture
    - theme: alt
      text: Playground
      link: /playground
    - theme: alt
      text: GitHub Repo
      link: https://github.com/cheesss/lattice-current
features:
  - title: Multi-variant intelligence workspace
    details: Full, tech, and finance variants share one codebase while exposing different panels, feeds, and workflows.
  - title: AI plus evidence-first analysis
    details: Summaries, deduction, Q&A, and structured analytics stay tied to live evidence, not free-form chat alone.
  - title: Replay and backtesting
    details: Historical replay, walk-forward validation, and investment idea tracking turn live monitoring into testable workflows.
---

## Start here

The home page now carries the two closest read-only surfaces to the actual app: a detailed 3D globe and a flat operations map. Both run on mock data but use the same visual grammar as the product.

<div class="lc-home-signalbar">
  <div class="lc-home-signalbar-item">
    <span>Operating modes</span>
    <strong>Full / Tech / Finance</strong>
  </div>
  <div class="lc-home-signalbar-item">
    <span>Core loop</span>
    <strong>Signal -> Score -> Connect -> Replay</strong>
  </div>
  <div class="lc-home-signalbar-item">
    <span>Best entry</span>
    <strong>Map -> Hub -> Replay -> Scenario</strong>
  </div>
</div>

<ClientOnly>
  <AppGradeGlobeShowcase locale="en" />
</ClientOnly>

<ClientOnly>
  <AppGradeFlatMapShowcase locale="en" />
</ClientOnly>

## Fork position

This is an independent public research fork. It does not claim to be the official upstream distribution or hosted service.

## Variants

- **Full**: geopolitics, conflict, infrastructure, military, macro spillover
- **Tech**: AI, startups, cloud, cyber, supply-chain and ecosystem monitoring
- **Finance**: cross-asset, macro, central-bank, transmission, replay, and investment workflows

## Explore only what you need

<div class="lc-home-route-grid">
  <div class="lc-home-route-card">
    <span class="lc-route-kicker">Hands-on path</span>
    <h3>Home map surfaces -> features</h3>
    <p>Use the globe and flat map above first, then open feature docs only after you know which surface matters.</p>
    <a href="/playground">Open playground</a>
  </div>
  <div class="lc-home-route-card">
    <span class="lc-route-kicker">System path</span>
    <h3>Architecture -> runtime ownership</h3>
    <p>Open the topology only when you need to know where a layer runs, what it owns, and how storage and replay fit together.</p>
    <a href="/architecture">Open architecture docs</a>
  </div>
  <div class="lc-home-route-card">
    <span class="lc-route-kicker">Model path</span>
    <h3>AI and backtesting</h3>
    <p>Use the model and replay docs when you need the reasoning behind the scores, priors, and validation loop.</p>
    <a href="/ai-backtesting/">Open AI and backtesting docs</a>
  </div>
  <div class="lc-home-route-card">
    <span class="lc-route-kicker">Visual path</span>
    <h3>Dedicated globe route</h3>
    <p>The same 3D surface also stays available as a focused route when you want the globe without the rest of the home stack.</p>
    <a href="/showcase/globe">Open globe showcase</a>
  </div>
</div>

## Public docs policy

<div class="policy-callout">
Public docs intentionally describe product behavior, architecture, and algorithms while omitting or sanitizing sensitive operating details, private feeds, credentials, and internal-only workflows.
</div>

## Start here

- [Getting Started](/getting-started)
- [Features](/features/)
- [AI & Backtesting](/ai-backtesting/)
- [Algorithms](/algorithms)
- [Legal](/legal/)

## Latest update

- [2026-03: App-grade globe and 2D map moved onto the home page](/updates/2026-03-home-map-surfaces)
- [2026-03: Interactive globe added to the docs home](/updates/2026-03-interactive-globe-home)
- [2026-03: GitHub Pages docs launch and publication policy](/updates/2026-03-docs-launch)
