<template>
  <section
    ref="shellRef"
    class="lc-section lc-constellation"
    :style="{
      '--lc-mx': `${pointer.x}%`,
      '--lc-my': `${pointer.y}%`
    }"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
  >
    <div class="lc-section-head">
      <div>
        <p class="lc-kicker">{{ copy.kicker }}</p>
        <h2>{{ copy.title }}</h2>
        <p>{{ copy.lead }}</p>
      </div>
      <div class="lc-badge-row">
        <span v-for="badge in copy.badges" :key="badge" class="lc-badge">{{ badge }}</span>
      </div>
    </div>

    <div class="lc-constellation-layout">
      <div class="lc-constellation-canvas">
        <svg viewBox="0 0 100 100" class="lc-constellation-svg" aria-hidden="true">
          <circle cx="50" cy="50" r="34" class="lc-orbit-ring" />
          <circle cx="50" cy="50" r="22" class="lc-orbit-ring lc-orbit-ring-inner" />
          <line
            v-for="node in nodes"
            :key="`${node.id}-center`"
            x1="50"
            y1="50"
            :x2="positionMap[node.id].x"
            :y2="positionMap[node.id].y"
            class="lc-constellation-line"
            :class="{ 'is-active': activeIds.has(node.id) || node.id === active.id }"
          />
          <line
            v-for="edge in edges"
            :key="`${edge.from}-${edge.to}`"
            :x1="positionMap[edge.from].x"
            :y1="positionMap[edge.from].y"
            :x2="positionMap[edge.to].x"
            :y2="positionMap[edge.to].y"
            class="lc-constellation-line lc-constellation-line-secondary"
            :class="{ 'is-active': activeEdge(edge) }"
          />
        </svg>

        <div class="lc-core-node">
          <span class="lc-core-label">{{ copy.coreLabel }}</span>
          <strong>{{ copy.coreTitle }}</strong>
          <small>{{ copy.coreCaption }}</small>
        </div>

        <button
          v-for="node in nodes"
          :key="node.id"
          class="lc-node-button"
          :class="[`tone-${node.tone}`, { 'is-active': node.id === active.id }]"
          type="button"
          :style="{
            left: `${positionMap[node.id].x}%`,
            top: `${positionMap[node.id].y}%`
          }"
          @click="activeId = node.id"
        >
          <span class="lc-node-chip">{{ node.metric }}</span>
          <strong>{{ node.title }}</strong>
        </button>
      </div>

      <div class="lc-constellation-detail">
        <div class="lc-mini-card lc-constellation-main">
          <p class="lc-kicker">{{ active.kicker }}</p>
          <h3>{{ active.title }}</h3>
          <p>{{ active.body }}</p>
          <div class="lc-chip-row">
            <span v-for="tag in active.tags" :key="tag" class="lc-chip">{{ tag }}</span>
          </div>
        </div>

        <div class="lc-mini-card">
          <p class="lc-mini-label">{{ copy.connectionsLabel }}</p>
          <div class="lc-link-row">
            <button
              v-for="relation in active.relations"
              :key="relation.id"
              class="lc-link-pill lc-link-pill-button"
              type="button"
              @click="activeId = relation.id"
            >
              {{ relation.label }}
            </button>
          </div>
        </div>

        <div class="lc-mini-card">
          <p class="lc-mini-label">{{ copy.surfacesLabel }}</p>
          <ul>
            <li v-for="surface in active.surfaces" :key="surface">{{ surface }}</li>
          </ul>
        </div>

        <div class="lc-mini-card">
          <p class="lc-mini-label">{{ copy.docsLabel }}</p>
          <div class="lc-link-row">
            <a v-for="link in active.links" :key="link.href" class="lc-link-pill" :href="link.href">{{ link.label }}</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

type Locale = 'en' | 'ko' | 'ja';
type Tone = 'blue' | 'amber' | 'teal' | 'rose' | 'slate' | 'violet';
type LinkItem = { label: string; href: string };
type Relation = { id: string; label: string };
type NodeItem = {
  id: string;
  title: string;
  metric: string;
  kicker: string;
  body: string;
  tags: string[];
  surfaces: string[];
  relations: Relation[];
  links: LinkItem[];
  tone: Tone;
};

type Copy = {
  kicker: string;
  title: string;
  lead: string;
  badges: string[];
  coreLabel: string;
  coreTitle: string;
  coreCaption: string;
  connectionsLabel: string;
  surfacesLabel: string;
  docsLabel: string;
};

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' });

function withLocale(locale: Locale, route: string) {
  return locale === 'en' ? route : `/${locale}${route}`;
}

const shellRef = ref<HTMLElement | null>(null);
const pointer = reactive({ x: 50, y: 50 });

function onPointerMove(event: PointerEvent) {
  const rect = shellRef.value?.getBoundingClientRect();
  if (!rect) return;
  pointer.x = ((event.clientX - rect.left) / rect.width) * 100;
  pointer.y = ((event.clientY - rect.top) / rect.height) * 100;
}

function onPointerLeave() {
  pointer.x = 50;
  pointer.y = 50;
}

function createContent(locale: Locale): { copy: Copy; nodes: NodeItem[]; edges: Array<{ from: string; to: string }> } {
  const docs = {
    live: withLocale(locale, '/features/live-intelligence'),
    invest: withLocale(locale, '/features/investment-replay'),
    ai: withLocale(locale, '/ai-backtesting/'),
    arch: withLocale(locale, '/architecture'),
    algorithms: withLocale(locale, '/algorithms'),
    api: withLocale(locale, '/api')
  };

  const baseNodes = {
    en: {
      copy: {
        kicker: 'Constellation graph',
        title: 'A spider graph of how the product surfaces connect',
        lead: 'Click any node in the constellation to see how a feature is wired into adjacent systems, docs, and runtime surfaces.',
        badges: ['Radial graph', 'Click to pivot', 'Cross-surface links'],
        coreLabel: 'Core system',
        coreTitle: 'Lattice Current',
        coreCaption: 'Signals, graph context, decision support, replay',
        connectionsLabel: 'Connected nodes',
        surfacesLabel: 'User-facing surfaces',
        docsLabel: 'Open docs'
      },
      nodes: [
        {
          id: 'live',
          title: 'Live Monitoring',
          metric: 'feeds',
          kicker: 'Operations layer',
          body: 'Live monitoring is the intake surface for global events, alerts, hotspots, and map-centric signal review.',
          tags: ['map', 'alerts', 'hotspots'],
          surfaces: ['Live map', 'Country instability', 'Threat cards'],
          relations: [{ id: 'graph', label: 'Ontology Graph' }, { id: 'transmission', label: 'Transmission' }, { id: 'ai', label: 'AI Analysis' }],
          links: [{ label: 'Live Intelligence', href: docs.live }, { label: 'Architecture', href: docs.arch }],
          tone: 'blue'
        },
        {
          id: 'ai',
          title: 'AI Analysis',
          metric: 'reasoning',
          kicker: 'Inference layer',
          body: 'AI layers summarize and interpret the operating snapshot while remaining tied to evidence, graph context, and replay constraints.',
          tags: ['Q&A', 'summaries', 'deduction'],
          surfaces: ['Analysis Hub', 'AI briefs', 'Evidence-first responses'],
          relations: [{ id: 'live', label: 'Live Monitoring' }, { id: 'replay', label: 'Replay' }, { id: 'graph', label: 'Ontology Graph' }],
          links: [{ label: 'AI & Backtesting', href: docs.ai }, { label: 'Algorithms', href: docs.algorithms }],
          tone: 'violet'
        },
        {
          id: 'graph',
          title: 'Ontology',
          metric: 'entities',
          kicker: 'Knowledge layer',
          body: 'The graph layer turns noisy sources into entities, relation paths, accepted constraints, and replayable graph states.',
          tags: ['entities', 'constraints', 'reified events'],
          surfaces: ['Ontology page', 'Graph themes', 'Relation history'],
          relations: [{ id: 'live', label: 'Live Monitoring' }, { id: 'ai', label: 'AI Analysis' }, { id: 'resource', label: 'Resource Profiler' }],
          links: [{ label: 'Architecture', href: docs.arch }, { label: 'Algorithms', href: docs.algorithms }],
          tone: 'teal'
        },
        {
          id: 'transmission',
          title: 'Transmission',
          metric: 'spillover',
          kicker: 'Propagation layer',
          body: 'Transmission modeling links events to countries, sectors, assets, and macro regimes so stories can be evaluated as decision paths.',
          tags: ['event-to-market', 'regime', 'asset mapping'],
          surfaces: ['Impact screener', 'Signal ridge', 'Investment cards'],
          relations: [{ id: 'live', label: 'Live Monitoring' }, { id: 'replay', label: 'Replay' }, { id: 'resource', label: 'Resource Profiler' }],
          links: [{ label: 'Investment & Replay', href: docs.invest }, { label: 'Algorithms', href: docs.algorithms }],
          tone: 'amber'
        },
        {
          id: 'replay',
          title: 'Replay',
          metric: 'validation',
          kicker: 'Historical layer',
          body: 'Historical replay and walk-forward validation feed outcome signals back into priors, sizing logic, and operator trust.',
          tags: ['PiT', 'walk-forward', 'backtests'],
          surfaces: ['Backtest Lab', 'Historical analogs', 'Run comparisons'],
          relations: [{ id: 'ai', label: 'AI Analysis' }, { id: 'transmission', label: 'Transmission' }, { id: 'resource', label: 'Resource Profiler' }],
          links: [{ label: 'Investment & Replay', href: docs.invest }, { label: 'AI & Backtesting', href: docs.ai }],
          tone: 'rose'
        },
        {
          id: 'resource',
          title: 'Resource Profiling',
          metric: 'runtime',
          kicker: 'Observability layer',
          body: 'Resource profiling reveals where the product spends time, heap, storage, and sidecar capacity so live and historical paths stay operable.',
          tags: ['heap', 'storage', 'hot paths'],
          surfaces: ['Resource Profiler', 'Archive telemetry', 'Runtime traces'],
          relations: [{ id: 'graph', label: 'Ontology' }, { id: 'transmission', label: 'Transmission' }, { id: 'replay', label: 'Replay' }],
          links: [{ label: 'Architecture', href: docs.arch }, { label: 'API', href: docs.api }],
          tone: 'slate'
        }
      ]
    },
    ko: {
      copy: {
        kicker: '거미줄 연결도',
        title: '기능 표면이 어떻게 이어지는지 보여주는 방사형 그래프',
        lead: '연결도 안의 노드를 클릭하면 해당 기능이 어떤 주변 시스템, 문서, 사용자 표면과 이어지는지 바로 볼 수 있습니다.',
        badges: ['방사형 그래프', '클릭 전환', '기능 간 연결'],
        coreLabel: '코어 시스템',
        coreTitle: 'Lattice Current',
        coreCaption: '신호, 그래프 컨텍스트, 의사결정 지원, 리플레이',
        connectionsLabel: '연결된 노드',
        surfacesLabel: '사용자 표면',
        docsLabel: '열 수 있는 문서'
      },
      nodes: [
        {
          id: 'live',
          title: '실시간 모니터링',
          metric: 'feeds',
          kicker: '운영 계층',
          body: '실시간 모니터링은 글로벌 이벤트, 경보, 핫스팟, 맵 중심 신호 검토를 받아들이는 입구입니다.',
          tags: ['맵', '경보', '핫스팟'],
          surfaces: ['라이브 맵', '국가 불안정', '위협 카드'],
          relations: [{ id: 'graph', label: '온톨로지' }, { id: 'transmission', label: '전이' }, { id: 'ai', label: 'AI 분석' }],
          links: [{ label: '실시간 인텔리전스', href: docs.live }, { label: '아키텍처', href: docs.arch }],
          tone: 'blue'
        },
        {
          id: 'ai',
          title: 'AI 분석',
          metric: 'reasoning',
          kicker: '추론 계층',
          body: 'AI 계층은 운영 스냅샷을 요약하고 해석하지만, 항상 근거, 그래프 컨텍스트, 리플레이 제약과 연결된 상태를 유지합니다.',
          tags: ['Q&A', '요약', 'deduction'],
          surfaces: ['Analysis Hub', 'AI 브리프', '근거 중심 응답'],
          relations: [{ id: 'live', label: '실시간 모니터링' }, { id: 'replay', label: '리플레이' }, { id: 'graph', label: '온톨로지' }],
          links: [{ label: 'AI · 백테스트', href: docs.ai }, { label: '알고리즘', href: docs.algorithms }],
          tone: 'violet'
        },
        {
          id: 'graph',
          title: '온톨로지',
          metric: 'entities',
          kicker: '지식 계층',
          body: '그래프 계층은 노이즈가 많은 소스를 엔티티, 관계 경로, 허용/거부 제약, 리플레이 가능한 그래프 상태로 바꿉니다.',
          tags: ['엔티티', '제약', 'reified event'],
          surfaces: ['Ontology 페이지', '그래프 테마', '관계 이력'],
          relations: [{ id: 'live', label: '실시간 모니터링' }, { id: 'ai', label: 'AI 분석' }, { id: 'resource', label: '리소스 프로파일러' }],
          links: [{ label: '아키텍처', href: docs.arch }, { label: '알고리즘', href: docs.algorithms }],
          tone: 'teal'
        },
        {
          id: 'transmission',
          title: '전이',
          metric: 'spillover',
          kicker: '파급 계층',
          body: '전이 모델은 이벤트를 국가, 섹터, 자산, 매크로 regime과 연결해 스토리를 실제 의사결정 경로로 평가할 수 있게 만듭니다.',
          tags: ['event-to-market', 'regime', 'asset mapping'],
          surfaces: ['영향도 스크리너', 'Signal ridge', '투자 카드'],
          relations: [{ id: 'live', label: '실시간 모니터링' }, { id: 'replay', label: '리플레이' }, { id: 'resource', label: '리소스 프로파일러' }],
          links: [{ label: '투자 · 리플레이', href: docs.invest }, { label: '알고리즘', href: docs.algorithms }],
          tone: 'amber'
        },
        {
          id: 'replay',
          title: '리플레이',
          metric: 'validation',
          kicker: '히스토리컬 계층',
          body: '히스토리컬 리플레이와 워크포워드 검증은 결과 신호를 prior, 사이징 로직, 운영자 신뢰도에 다시 반영합니다.',
          tags: ['PiT', 'walk-forward', 'backtests'],
          surfaces: ['Backtest Lab', '유사 사례', '런 비교'],
          relations: [{ id: 'ai', label: 'AI 분석' }, { id: 'transmission', label: '전이' }, { id: 'resource', label: '리소스 프로파일러' }],
          links: [{ label: '투자 · 리플레이', href: docs.invest }, { label: 'AI · 백테스트', href: docs.ai }],
          tone: 'rose'
        },
        {
          id: 'resource',
          title: '리소스 프로파일링',
          metric: 'runtime',
          kicker: '관측성 계층',
          body: '리소스 프로파일링은 제품이 어디에서 시간, 힙, 저장소, sidecar 용량을 쓰는지 보여줘 라이브 경로와 히스토리컬 경로가 실제로 운영 가능하게 유지되도록 돕습니다.',
          tags: ['heap', 'storage', 'hot path'],
          surfaces: ['Resource Profiler', '아카이브 텔레메트리', '런타임 추적'],
          relations: [{ id: 'graph', label: '온톨로지' }, { id: 'transmission', label: '전이' }, { id: 'replay', label: '리플레이' }],
          links: [{ label: '아키텍처', href: docs.arch }, { label: 'API', href: docs.api }],
          tone: 'slate'
        }
      ]
    },
    ja: {
      copy: {
        kicker: 'クモの巣グラフ',
        title: '機能面がどう接続されるかを示す放射型グラフ',
        lead: 'ノードをクリックすると、その機能がどの周辺システム、文書、利用者向け画面と接続しているかをすぐに確認できます。',
        badges: ['放射型グラフ', 'クリックで切替', '機能間リンク'],
        coreLabel: 'コアシステム',
        coreTitle: 'Lattice Current',
        coreCaption: 'シグナル、グラフ文脈、意思決定支援、リプレイ',
        connectionsLabel: '接続ノード',
        surfacesLabel: 'ユーザー向け画面',
        docsLabel: '開くドキュメント'
      },
      nodes: [
        {
          id: 'live',
          title: 'ライブ監視',
          metric: 'feeds',
          kicker: '運用層',
          body: 'ライブ監視は、グローバルイベント、アラート、ホットスポット、地図中心のシグナル確認を受け持つ入口です。',
          tags: ['地図', 'アラート', 'ホットスポット'],
          surfaces: ['ライブ地図', '国別不安定指数', '脅威カード'],
          relations: [{ id: 'graph', label: 'オントロジー' }, { id: 'transmission', label: '伝播' }, { id: 'ai', label: 'AI 分析' }],
          links: [{ label: 'ライブインテリジェンス', href: docs.live }, { label: 'アーキテクチャ', href: docs.arch }],
          tone: 'blue'
        },
        {
          id: 'ai',
          title: 'AI 分析',
          metric: 'reasoning',
          kicker: '推論層',
          body: 'AI 層は運用スナップショットを要約して解釈しますが、常に証拠、グラフ文脈、リプレイ制約に結びついています。',
          tags: ['Q&A', '要約', 'deduction'],
          surfaces: ['Analysis Hub', 'AI ブリーフ', '証拠ベース応答'],
          relations: [{ id: 'live', label: 'ライブ監視' }, { id: 'replay', label: 'リプレイ' }, { id: 'graph', label: 'オントロジー' }],
          links: [{ label: 'AI・バックテスト', href: docs.ai }, { label: 'アルゴリズム', href: docs.algorithms }],
          tone: 'violet'
        },
        {
          id: 'graph',
          title: 'オントロジー',
          metric: 'entities',
          kicker: '知識層',
          body: 'グラフ層はノイズの多いソースをエンティティ、関係経路、許可/拒否制約、リプレイ可能なグラフ状態へ変換します。',
          tags: ['エンティティ', '制約', 'reified event'],
          surfaces: ['Ontology ページ', 'グラフテーマ', '関係履歴'],
          relations: [{ id: 'live', label: 'ライブ監視' }, { id: 'ai', label: 'AI 分析' }, { id: 'resource', label: 'リソースプロファイラ' }],
          links: [{ label: 'アーキテクチャ', href: docs.arch }, { label: 'アルゴリズム', href: docs.algorithms }],
          tone: 'teal'
        },
        {
          id: 'transmission',
          title: '伝播',
          metric: 'spillover',
          kicker: '波及層',
          body: '伝播モデルはイベントを国、セクター、資産、マクロ regime に接続し、ストーリーを実際の意思決定経路として評価できるようにします。',
          tags: ['event-to-market', 'regime', 'asset mapping'],
          surfaces: ['インパクトスクリーナー', 'Signal ridge', '投資カード'],
          relations: [{ id: 'live', label: 'ライブ監視' }, { id: 'replay', label: 'リプレイ' }, { id: 'resource', label: 'リソースプロファイラ' }],
          links: [{ label: '投資・リプレイ', href: docs.invest }, { label: 'アルゴリズム', href: docs.algorithms }],
          tone: 'amber'
        },
        {
          id: 'replay',
          title: 'リプレイ',
          metric: 'validation',
          kicker: 'ヒストリカル層',
          body: 'ヒストリカルリプレイとウォークフォワード検証は、結果シグナルを prior、サイズ調整ロジック、運用者の信頼へ戻します。',
          tags: ['PiT', 'walk-forward', 'backtests'],
          surfaces: ['Backtest Lab', 'ヒストリカル類似例', 'ラン比較'],
          relations: [{ id: 'ai', label: 'AI 分析' }, { id: 'transmission', label: '伝播' }, { id: 'resource', label: 'リソースプロファイラ' }],
          links: [{ label: '投資・リプレイ', href: docs.invest }, { label: 'AI・バックテスト', href: docs.ai }],
          tone: 'rose'
        },
        {
          id: 'resource',
          title: 'リソース計測',
          metric: 'runtime',
          kicker: '可観測性層',
          body: 'リソース計測は、製品がどこで時間、ヒープ、ストレージ、sidecar 容量を消費するかを示し、ライブ経路とヒストリカル経路の運用性を保ちます。',
          tags: ['heap', 'storage', 'hot path'],
          surfaces: ['Resource Profiler', 'アーカイブテレメトリ', 'ランタイムトレース'],
          relations: [{ id: 'graph', label: 'オントロジー' }, { id: 'transmission', label: '伝播' }, { id: 'replay', label: 'リプレイ' }],
          links: [{ label: 'アーキテクチャ', href: docs.arch }, { label: 'API', href: docs.api }],
          tone: 'slate'
        }
      ]
    }
  } as const;

  const edges = [
    { from: 'live', to: 'ai' },
    { from: 'live', to: 'graph' },
    { from: 'live', to: 'transmission' },
    { from: 'graph', to: 'ai' },
    { from: 'graph', to: 'resource' },
    { from: 'transmission', to: 'replay' },
    { from: 'transmission', to: 'resource' },
    { from: 'replay', to: 'ai' },
    { from: 'replay', to: 'resource' }
  ];

  return { copy: baseNodes[locale].copy, nodes: baseNodes[locale].nodes, edges };
}

const { copy, nodes, edges } = createContent(props.locale);
const activeId = ref(nodes[0].id);
const active = computed(() => nodes.find((node) => node.id === activeId.value) ?? nodes[0]);
const activeIds = computed(() => new Set(active.value.relations.map((relation) => relation.id).concat(active.value.id)));
const positionMap = {
  live: { x: 50, y: 10 },
  ai: { x: 82, y: 28 },
  transmission: { x: 82, y: 72 },
  replay: { x: 50, y: 90 },
  resource: { x: 18, y: 72 },
  graph: { x: 18, y: 28 }
} as const;

function activeEdge(edge: { from: string; to: string }) {
  return edge.from === active.value.id || edge.to === active.value.id || activeIds.value.has(edge.from) && activeIds.value.has(edge.to);
}
</script>

<style scoped>
.lc-constellation {
  overflow: hidden;
}

.lc-constellation::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--lc-mx, 50%) var(--lc-my, 50%), rgba(96, 165, 250, 0.14), transparent 22%);
  pointer-events: none;
}

.lc-constellation-layout {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, 0.85fr);
  align-items: center;
}

.lc-constellation-canvas {
  position: relative;
  min-height: 520px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background:
    radial-gradient(circle at center, rgba(30, 41, 59, 0.68), rgba(2, 6, 23, 0.2) 60%),
    linear-gradient(180deg, rgba(9, 17, 31, 0.82), rgba(15, 23, 42, 0.88));
}

.lc-constellation-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.lc-orbit-ring {
  fill: none;
  stroke: rgba(148, 163, 184, 0.12);
  stroke-width: 0.35;
}

.lc-orbit-ring-inner {
  stroke: rgba(96, 165, 250, 0.12);
}

.lc-constellation-line {
  stroke: rgba(96, 165, 250, 0.18);
  stroke-width: 0.42;
  transition: stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease;
}

.lc-constellation-line-secondary {
  stroke: rgba(148, 163, 184, 0.14);
  stroke-dasharray: 1.4 1.6;
}

.lc-constellation-line.is-active {
  stroke: rgba(251, 191, 36, 0.7);
  stroke-width: 0.72;
  opacity: 1;
}

.lc-core-node {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 188px;
  padding: 18px;
  text-align: center;
  border-radius: 999px;
  border: 1px solid rgba(96, 165, 250, 0.22);
  background: linear-gradient(180deg, rgba(22, 78, 99, 0.72), rgba(15, 23, 42, 0.9));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.3);
}

.lc-core-node strong,
.lc-node-button strong {
  display: block;
}

.lc-core-label,
.lc-core-node small {
  display: block;
}

.lc-core-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8fd1ff;
  margin-bottom: 6px;
}

.lc-core-node strong {
  font-size: 18px;
}

.lc-core-node small {
  margin-top: 6px;
  color: #cbd5e1;
}

.lc-node-button {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 172px;
  min-height: 84px;
  border-radius: 18px;
  padding: 14px;
  text-align: left;
  color: inherit;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.86);
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
}

.lc-node-button:hover,
.lc-node-button.is-active {
  transform: translate(-50%, calc(-50% - 4px));
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.3);
}

.lc-node-button.tone-blue:hover,
.lc-node-button.tone-blue.is-active { border-color: rgba(96, 165, 250, 0.52); }
.lc-node-button.tone-amber:hover,
.lc-node-button.tone-amber.is-active { border-color: rgba(251, 191, 36, 0.52); }
.lc-node-button.tone-teal:hover,
.lc-node-button.tone-teal.is-active { border-color: rgba(45, 212, 191, 0.52); }
.lc-node-button.tone-rose:hover,
.lc-node-button.tone-rose.is-active { border-color: rgba(251, 113, 133, 0.52); }
.lc-node-button.tone-slate:hover,
.lc-node-button.tone-slate.is-active { border-color: rgba(148, 163, 184, 0.52); }
.lc-node-button.tone-violet:hover,
.lc-node-button.tone-violet.is-active { border-color: rgba(167, 139, 250, 0.52); }

.lc-node-chip {
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 11px;
  margin-bottom: 8px;
  background: rgba(148, 163, 184, 0.1);
  color: #8fd1ff;
}

.lc-node-button strong {
  font-size: 15px;
  margin-bottom: 4px;
}

.lc-constellation-detail {
  display: grid;
  gap: 14px;
}

.lc-constellation-main {
  min-height: 172px;
}

.lc-mini-card ul {
  margin: 0;
  padding-left: 18px;
}

.lc-mini-card li + li {
  margin-top: 6px;
}

.lc-link-row,
.lc-chip-row,
.lc-badge-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.lc-link-pill-button {
  cursor: pointer;
}

@media (max-width: 1080px) {
  .lc-constellation-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .lc-constellation-canvas {
    min-height: 620px;
  }

  .lc-node-button {
    width: 148px;
  }

  .lc-core-node {
    width: 156px;
  }
}
</style>
