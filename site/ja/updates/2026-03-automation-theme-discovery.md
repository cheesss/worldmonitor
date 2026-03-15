---
title: 2026-03 自動化とテーマ発見
summary: unattended replay scheduler, dataset registry, theme discovery queue, guarded Codex theme proposer.
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03 自動化とテーマ発見

- dataset registry を追加
- scheduler worker を追加
- `fetch -> import -> replay -> nightly walk-forward` を自動化
- lock / retry / retention を追加
- 反復シグナルから theme discovery queue を追加
- guarded Codex theme proposer を追加

Codex は新しいバックテスト・テーマを提案できますが、guarded mode では依然としてポリシー閾値を通過した場合のみ昇格します。
