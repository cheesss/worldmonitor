---
title: 투자 · 리플레이
summary: 이벤트-자산 매핑, 아이디어 지원, 리플레이, 워크포워드 평가.
status: beta
variants:
  - finance
  - tech
updated: 2026-03-15
owner: core
---

# 투자 · 리플레이

## 무엇을 하나요

라이브 이벤트를 자산에 연결하고, 의사결정 지원 객체를 만들며, 리플레이와 백테스트로 그 결과를 검증합니다.

## 왜 필요한가요

서사 기반 모니터링을 테스트 가능하고 리뷰 가능한 의사결정 워크플로우로 바꾸기 위해서입니다.

## 입력

- 이벤트, 테마, 전이 출력
- 시장 시계열
- 소스 및 매핑 prior
- historical replay frame

## 출력

- 투자 아이디어 카드
- 사이징 및 false-positive 가드레일
- replay / walk-forward 실행 요약
- Backtest Lab 시각화와 의사결정 비교
- coverage-aware universe 요약, review queue, gap 추적
- 승인된 동적 후보가 다음 refresh와 이후 백테스트에 참여
- manual / guarded-auto / full-auto universe policy 모드
- scheduler가 coverage gap에 대해 Codex 후보 확장을 자동 실행할 수 있음
- source registry 후보도 guarded score + diversity policy에서 자동 승인 / 활성화될 수 있음
- candidate auto-approval이 composite score + sector / asset-kind cap으로 동작
- 약한 theme motif와 저신호 autonomous keyword를 scheduler가 자동으로 retire / reject 가능
- 약한 idea card를 operator view 전에 자동 suppress 가능

## 주요 UI 표면

- Investment Workflow
- Auto Investment Ideas
- Backtest Lab
- Transmission Sankey / Network
- Coverage-aware universe review queue

## 관련 알고리즘

- event-to-market transmission
- regime weighting
- Kalman 스타일 adaptive weighting
- Hawkes intensity, transfer entropy, bandits
- historical replay와 warm-up handling
- coverage-aware candidate retrieval
- core + approved expansion 자산을 함께 보는 deterministic ranking
- Codex-assisted candidate expansion review queue
- guarded auto-approval + probation + auto-demotion
- source / role / supporting signal / crowding penalty를 함께 보는 composite auto-approval scoring
- scheduler-driven candidate expansion + accepted universe change 후 replay refresh
- novelty overlap limit + promotion score를 거치는 Codex theme auto-promotion
- score / health / diversity cap을 함께 쓰는 discovered feed / API source automation sweep
- autonomous keyword lifecycle review + theme queue hygiene
- pre-render idea-card triage + suppression

## 한계

공개 사이트는 시스템 동작을 설명하지만 비공개 운영 데이터나 민감한 시장 설정은 공개하지 않습니다.

## 변형 적용 범위

주 적용 범위는 `finance`이며, `tech`에서도 일부 기능이 확장되어 공유됩니다.
