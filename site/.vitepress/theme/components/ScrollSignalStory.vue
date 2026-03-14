<template>
  <section class="lc-section lc-scroll-story">
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

    <div class="lc-story-layout">
      <div class="lc-story-visual-shell">
        <div class="lc-story-visual sticky-panel">
          <div class="lc-story-progress">
            <span
              v-for="(step, index) in steps"
              :key="step.id"
              class="lc-story-progress-dot"
              :class="{ 'is-active': index <= activeIndex }"
            />
          </div>
          <div class="lc-story-visual-card">
            <p class="lc-kicker">{{ active.metric }}</p>
            <h3>{{ active.title }}</h3>
            <p>{{ active.summary }}</p>
            <div class="lc-story-rings" :style="{ '--lc-ring-shift': `${activeIndex}` }">
              <span class="ring ring-a"></span>
              <span class="ring ring-b"></span>
              <span class="ring ring-c"></span>
              <span class="pulse"></span>
            </div>
            <div class="lc-chip-row">
              <span v-for="tag in active.tags" :key="tag" class="lc-chip">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lc-story-steps">
        <article
          v-for="(step, index) in steps"
          :key="step.id"
          :ref="(el) => setStepRef(el, index)"
          class="lc-story-step"
          :class="{ 'is-active': index === activeIndex }"
        >
          <button class="lc-story-step-button" type="button" @click="activeIndex = index">
            <span class="lc-story-step-index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <p class="lc-kicker">{{ step.kicker }}</p>
              <h3>{{ step.title }}</h3>
              <p>{{ step.body }}</p>
            </div>
          </button>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

type Locale = 'en' | 'ko' | 'ja';
type StoryStep = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  summary: string;
  metric: string;
  tags: string[];
};

type StoryCopy = {
  kicker: string;
  title: string;
  lead: string;
  badges: string[];
  steps: StoryStep[];
};

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' });

const content: Record<Locale, StoryCopy> = {
  en: {
    kicker: 'Scroll-driven walkthrough',
    title: 'The system changes state as you move through the workflow',
    lead: 'This section reacts to scroll and click. Move down the story and the visual panel updates to match the current operating stage.',
    badges: ['Scroll reactive', 'Sticky visual', 'Click override'],
    steps: [
      {
        id: 's1',
        kicker: 'Intake',
        title: 'Signals enter as live feeds and market snapshots',
        body: 'Feeds, APIs, local sidecars, and market snapshots are merged into one working surface before anything is scored.',
        summary: 'Intake pressure rises as fresh sources land in the current snapshot.',
        metric: 'feed pressure',
        tags: ['feeds', 'snapshots', 'freshness']
      },
      {
        id: 's2',
        kicker: 'Normalization',
        title: 'Noisy inputs get turned into structured objects',
        body: 'Deduplication, clustering, and entity resolution make different sources comparable, searchable, and replay-safe.',
        summary: 'Structure density increases as raw articles become reusable event objects.',
        metric: 'structure density',
        tags: ['clusters', 'entities', 'PiT-safe']
      },
      {
        id: 's3',
        kicker: 'Scoring',
        title: 'Risk, credibility, and regime state are layered in',
        body: 'Signals are weighted through credibility, instability, convergence, and market-regime logic before they affect decisions.',
        summary: 'Analytical weighting narrows the field into operational signals.',
        metric: 'signal weight',
        tags: ['credibility', 'regime', 'instability']
      },
      {
        id: 's4',
        kicker: 'Propagation',
        title: 'Stories spread through graph and transmission links',
        body: 'The same event can connect to countries, sectors, commodities, and assets. Transmission logic makes those paths visible.',
        summary: 'Propagation branches widen as event-to-market paths become explicit.',
        metric: 'transmission depth',
        tags: ['ontology', 'multi-hop', 'assets']
      },
      {
        id: 's5',
        kicker: 'Validation',
        title: 'Replay closes the loop with historical outcomes',
        body: 'Historical replay and walk-forward validation feed the result back into live priors so the system improves with use.',
        summary: 'Feedback closes the loop and updates the operating priors.',
        metric: 'feedback gain',
        tags: ['replay', 'walk-forward', 'priors']
      }
    ]
  },
  ko: {
    kicker: '스크롤 반응형 설명',
    title: '스크롤에 따라 시스템 상태가 바뀌는 흐름 설명',
    lead: '이 섹션은 스크롤과 클릭에 반응합니다. 아래로 내려가면 좌측 시각 패널이 현재 운영 단계에 맞게 바뀝니다.',
    badges: ['스크롤 반응', 'sticky 시각 패널', '클릭 전환'],
    steps: [
      {
        id: 's1',
        kicker: '유입',
        title: '신호는 실시간 피드와 시장 스냅샷으로 들어옵니다',
        body: '피드, API, 로컬 sidecar, 시장 스냅샷이 하나의 작업 표면으로 모인 뒤에야 점수화가 시작됩니다.',
        summary: '새 소스가 현재 스냅샷에 들어오면서 intake pressure가 올라갑니다.',
        metric: 'feed pressure',
        tags: ['피드', '스냅샷', 'freshness']
      },
      {
        id: 's2',
        kicker: '정규화',
        title: '노이즈가 많은 입력이 구조화 객체로 바뀝니다',
        body: '중복 제거, 클러스터링, 엔티티 정규화가 서로 다른 소스를 비교 가능하고, 검색 가능하며, replay-safe한 이벤트 객체로 만듭니다.',
        summary: '원문 기사가 재사용 가능한 이벤트 객체로 바뀌며 구조 밀도가 올라갑니다.',
        metric: 'structure density',
        tags: ['클러스터', '엔티티', 'PiT-safe']
      },
      {
        id: 's3',
        kicker: '점수화',
        title: '리스크, credibility, regime 상태가 겹쳐집니다',
        body: '신호는 의사결정에 영향을 주기 전에 credibility, instability, convergence, market-regime 로직을 통과해 가중됩니다.',
        summary: '분석 가중치가 넓은 입력을 운영 신호로 좁혀 줍니다.',
        metric: 'signal weight',
        tags: ['credibility', 'regime', 'instability']
      },
      {
        id: 's4',
        kicker: '전이',
        title: '스토리는 그래프와 전이 링크를 따라 퍼집니다',
        body: '같은 이벤트가 국가, 섹터, 원자재, 자산으로 연결될 수 있습니다. 전이 로직이 그 경로를 보이게 합니다.',
        summary: 'event-to-market 경로가 드러나면서 파급 가지가 넓어집니다.',
        metric: 'transmission depth',
        tags: ['ontology', 'multi-hop', '자산']
      },
      {
        id: 's5',
        kicker: '검증',
        title: '리플레이가 과거 결과로 루프를 닫습니다',
        body: 'historical replay와 walk-forward 검증이 결과를 live prior에 다시 반영해 시스템이 사용할수록 더 나아지게 합니다.',
        summary: '피드백이 루프를 닫고 운영 prior를 업데이트합니다.',
        metric: 'feedback gain',
        tags: ['리플레이', 'walk-forward', 'prior']
      }
    ]
  },
  ja: {
    kicker: 'スクロール反応型ガイド',
    title: 'スクロールに合わせてシステム状態が切り替わる説明',
    lead: 'このセクションはスクロールとクリックに反応します。下へ進むと左側のビジュアルが現在の運用段階に合わせて変化します。',
    badges: ['スクロール反応', 'sticky ビジュアル', 'クリック切替'],
    steps: [
      {
        id: 's1',
        kicker: '流入',
        title: 'シグナルはライブフィードと市場スナップショットとして入る',
        body: 'フィード、API、ローカル sidecar、市場スナップショットは、スコアリング前に1つの作業面へ集約されます。',
        summary: '新しいソースが現在スナップショットへ入るにつれて intake pressure が上がります。',
        metric: 'feed pressure',
        tags: ['フィード', 'スナップショット', 'freshness']
      },
      {
        id: 's2',
        kicker: '正規化',
        title: 'ノイズの多い入力が構造化オブジェクトへ変わる',
        body: '重複排除、クラスタリング、エンティティ正規化によって、異なるソースが比較可能で検索可能な replay-safe イベントになります。',
        summary: '生記事が再利用可能なイベントへ変わり、構造密度が上がります。',
        metric: 'structure density',
        tags: ['クラスタ', 'エンティティ', 'PiT-safe']
      },
      {
        id: 's3',
        kicker: 'スコア化',
        title: 'リスク、credibility、regime 状態が重なる',
        body: 'シグナルは意思決定へ影響する前に credibility、instability、convergence、market-regime ロジックで重み付けされます。',
        summary: '分析重み付けが広い入力を運用シグナルへ絞り込みます。',
        metric: 'signal weight',
        tags: ['credibility', 'regime', 'instability']
      },
      {
        id: 's4',
        kicker: '伝播',
        title: 'ストーリーはグラフと伝播リンクに沿って広がる',
        body: '同じイベントが国、セクター、商品、資産へ接続されます。伝播ロジックがその経路を見えるようにします。',
        summary: 'event-to-market 経路が明示されるにつれて波及枝が広がります。',
        metric: 'transmission depth',
        tags: ['ontology', 'multi-hop', '資産']
      },
      {
        id: 's5',
        kicker: '検証',
        title: 'リプレイが過去結果でループを閉じる',
        body: 'historical replay と walk-forward 検証が結果を live prior に戻し、使うほどシステムが改善するようにします。',
        summary: 'フィードバックがループを閉じ、運用 prior を更新します。',
        metric: 'feedback gain',
        tags: ['リプレイ', 'walk-forward', 'prior']
      }
    ]
  }
};

const copy = content[props.locale];
const steps = copy.steps;
const activeIndex = ref(0);
const stepRefs = ref<(HTMLElement | null)[]>([]);
let observer: IntersectionObserver | null = null;

const active = computed(() => steps[activeIndex.value] ?? steps[0]);

function setStepRef(el: Element | null, index: number) {
  stepRefs.value[index] = el as HTMLElement | null;
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const idx = Number((visible.target as HTMLElement).dataset.storyIndex);
      if (!Number.isNaN(idx)) activeIndex.value = idx;
    },
    {
      rootMargin: '-20% 0px -35% 0px',
      threshold: [0.2, 0.4, 0.6, 0.8]
    }
  );

  stepRefs.value.forEach((el, index) => {
    if (!el || !observer) return;
    el.dataset.storyIndex = String(index);
    observer.observe(el);
  });
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.lc-story-layout {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(300px, 0.95fr) minmax(0, 1.05fr);
  align-items: start;
}

.lc-story-visual-shell {
  position: relative;
}

.sticky-panel {
  position: sticky;
  top: 88px;
}

.lc-story-visual {
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(8, 15, 29, 0.92), rgba(15, 23, 42, 0.9));
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.22);
}

.lc-story-progress {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  padding: 18px 18px 0;
}

.lc-story-progress-dot {
  height: 6px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  transition: background 180ms ease, transform 180ms ease;
}

.lc-story-progress-dot.is-active {
  background: linear-gradient(90deg, rgba(96, 165, 250, 0.88), rgba(251, 191, 36, 0.88));
  transform: scaleY(1.4);
}

.lc-story-visual-card {
  position: relative;
  min-height: 420px;
  padding: 28px 24px;
}

.lc-story-rings {
  position: relative;
  margin: 28px auto 20px;
  width: 220px;
  height: 220px;
}

.ring,
.pulse {
  position: absolute;
  inset: 50%;
  transform: translate(-50%, -50%);
  border-radius: 999px;
}

.ring {
  border: 1px solid rgba(148, 163, 184, 0.16);
  transition: transform 260ms ease, border-color 260ms ease, opacity 260ms ease;
}

.ring-a {
  width: calc(74px + var(--lc-ring-shift) * 12px);
  height: calc(74px + var(--lc-ring-shift) * 12px);
  border-color: rgba(96, 165, 250, 0.42);
}

.ring-b {
  width: calc(132px + var(--lc-ring-shift) * 10px);
  height: calc(132px + var(--lc-ring-shift) * 10px);
  border-color: rgba(251, 191, 36, 0.26);
}

.ring-c {
  width: calc(186px + var(--lc-ring-shift) * 8px);
  height: calc(186px + var(--lc-ring-shift) * 8px);
  border-color: rgba(45, 212, 191, 0.2);
}

.pulse {
  width: 24px;
  height: 24px;
  background: radial-gradient(circle at center, rgba(251, 191, 36, 0.9), rgba(96, 165, 250, 0.35));
  box-shadow: 0 0 34px rgba(96, 165, 250, 0.36);
  animation: lcPulse 2.4s ease-in-out infinite;
}

@keyframes lcPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.88; }
  50% { transform: translate(-50%, -50%) scale(1.18); opacity: 1; }
}

.lc-story-steps {
  display: grid;
  gap: 16px;
}

.lc-story-step {
  min-height: 220px;
}

.lc-story-step-button {
  width: 100%;
  text-align: left;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  padding: 22px;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.7), rgba(9, 17, 31, 0.72));
  color: inherit;
  cursor: pointer;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.lc-story-step.is-active .lc-story-step-button,
.lc-story-step-button:hover {
  transform: translateY(-2px);
  border-color: rgba(96, 165, 250, 0.4);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.18);
}

.lc-story-step-index {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(96, 165, 250, 0.12);
  color: #8fd1ff;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.lc-story-step-button h3 {
  margin: 6px 0 10px;
}

.lc-chip-row,
.lc-badge-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 980px) {
  .lc-story-layout {
    grid-template-columns: 1fr;
  }

  .sticky-panel {
    position: relative;
    top: auto;
  }

  .lc-story-step {
    min-height: auto;
  }
}
</style>
