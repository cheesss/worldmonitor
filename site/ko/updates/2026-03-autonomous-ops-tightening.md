---
title: "2026-03: 자동 소스 승인과 후보 확장"
summary: 스케줄러가 이제 source registry를 자동으로 정리하고, coverage gap에 대해 Codex 후보를 제안한 뒤, 활성 universe가 바뀌면 replay를 다시 실행합니다.
status: beta
variants:
  - full
  - finance
updated: 2026-03-16
owner: core
---

# 2026-03: 자동 소스 승인과 후보 확장

- discovered RSS/API source에 대한 guarded 자동 승인/활성화 추가
- coverage gap 상위 테마에 대해 scheduler가 Codex 후보 확장 실행
- Codex 후보 ingest 시 즉시 universe policy 재평가
- 새 후보가 accepted되면 replay를 다시 돌려 active universe 변경을 반영

핵심은 사람 개입이 필요했던 `source acceptance`와 `Ask Codex` 버튼 의존도를 낮춘 것입니다. 다만 Codex가 직접 매매를 결정하는 구조는 아니며, source policy와 universe policy가 여전히 deterministic gate 역할을 합니다.
