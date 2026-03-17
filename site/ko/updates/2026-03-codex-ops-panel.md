---
title: "2026-03: Codex Ops 패널과 활성화/큐 진단"
summary: Codex 전용 운영 패널을 추가해 자동화 활성 조건, 빈 큐 원인, Codex가 만든 소스/테마/데이터셋만 따로 볼 수 있게 했습니다.
status: beta
variants:
  - full
  - finance
updated: 2026-03-17
owner: core
---

# 2026-03: Codex Ops 패널과 활성화/큐 진단

앱의 Codex Hub 안에 Codex Ops 패널이 추가되었습니다.

이 패널은 아래 세 가지를 한 곳에서 보여줍니다.

1. Codex 자동화가 실제로 켜져 있는지
2. 왜 theme 또는 dataset queue가 아직 비어 있는지
3. Codex가 실제로 추가한 소스, 테마, 데이터셋이 무엇인지

## 포함된 정보

- 짧은 활성화 체크리스트
- 빈 큐 진단
- 인증 오류로 막힌 dataset과 재시도 시각
- codex-playwright로 발견된 feed/API source만 별도 표시
- Codex가 승격한 theme만 표시
- Codex가 제안한 dataset proposal만 표시
- Codex 관련 최근 automation run

