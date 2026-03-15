---
title: "2026-03: 自動ソース承認と候補拡張"
summary: スケジューラが source registry を自動処理し、coverage gap に対して Codex 候補を提案し、active universe が変わると replay を再実行します。
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03: 自動ソース承認と候補拡張

- discovered RSS/API source に対する guarded 自動承認 / 自動有効化を追加
- coverage gap 上位テーマに対して scheduler が Codex candidate expansion を実行
- Codex 候補を ingest した時点で universe policy を即時再評価
- 新しい候補が accepted になると replay を再実行して active universe の変更を反映

これにより、人が押していた `source acceptance` と `Ask Codex` の日常作業を減らせます。ただし Codex が直接トレードを決定するわけではなく、source policy と universe policy が引き続き deterministic gate として残ります。
