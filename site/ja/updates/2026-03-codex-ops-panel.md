---
title: "2026-03: Codex Ops パネルと起動/キュー診断"
summary: Codex 専用の運用パネルを追加し、起動条件、空キューの理由、Codex が追加したソース/テーマ/データセットだけを確認できるようにしました。
status: beta
variants:
  - full
  - finance
updated: 2026-03-17
owner: core
---

# 2026-03: Codex Ops パネルと起動/キュー診断

アプリの Codex Hub に Codex Ops パネルを追加しました。

このパネルは次の三つを一か所で確認できます。

1. Codex 自動化が実際に有効か
2. なぜ theme または dataset queue がまだ空なのか
3. Codex が実際に追加したソース、テーマ、データセットは何か

## 含まれる情報

- 短い起動チェックリスト
- 空キュー診断
- 認証エラーで止まっている dataset と再試行時刻
- codex-playwright が発見した feed/API source のみ
- Codex が昇格させた theme のみ
- Codex が提案した dataset proposal のみ
- Codex 関連の最近の automation run

