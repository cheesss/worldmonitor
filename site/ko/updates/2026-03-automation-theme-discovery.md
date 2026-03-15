---
title: 2026-03 자동화와 테마 발견
summary: unattended replay scheduler, dataset registry, theme discovery queue, guarded Codex theme proposer.
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03 자동화와 테마 발견

- dataset registry 추가
- scheduler worker 추가
- `fetch -> import -> replay -> nightly walk-forward` 자동화
- lock / retry / retention 추가
- 반복 신호 기반 theme discovery queue 추가
- guarded Codex theme proposer 추가

Codex는 새 백테스트 테마를 제안할 수 있지만, guarded mode에서는 여전히 정책 임계치를 통과해야 승격됩니다.
