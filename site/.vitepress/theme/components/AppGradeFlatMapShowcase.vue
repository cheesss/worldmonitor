<template>
  <section class="lc-section lc-app-flat-showcase">
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

    <div class="lc-app-globe-toolbar">
      <div class="lc-link-row">
        <button
          v-for="view in copy.views"
          :key="view.id"
          class="lc-link-pill lc-link-pill-button"
          :class="{ 'is-active': activeView === view.id }"
          type="button"
          @click="activeView = view.id"
        >
          {{ view.label }}
        </button>
      </div>
      <div class="lc-link-row">
        <button
          v-for="layer in copy.layers"
          :key="layer.id"
          class="lc-link-pill lc-link-pill-button"
          :class="{ 'is-active': activeLayers.includes(layer.id) }"
          type="button"
          @click="toggleLayer(layer.id)"
        >
          {{ layer.label }}
        </button>
      </div>
    </div>

    <div class="lc-app-globe-grid">
      <div class="lc-ops-panel lc-app-globe-visual">
        <div class="lc-console-header-row">
          <div>
            <p class="lc-mini-label">{{ copy.mapLabel }}</p>
            <h3>{{ activeHotspot.label }}</h3>
            <p>{{ activeHotspot.summary }}</p>
          </div>
          <span class="lc-risk-pill" :data-tone="activeHotspot.tone">{{ activeHotspot.risk }}</span>
        </div>

        <div ref="mapRef" class="lc-showcase-flat-shell"></div>

        <div class="lc-map-caption-row">
          <div class="lc-map-caption">
            <span>{{ copy.pathLabel }}</span>
            <strong>{{ activeHotspot.path }}</strong>
          </div>
          <div class="lc-map-caption">
            <span>{{ copy.assetsLabel }}</span>
            <strong>{{ activeHotspot.assets.join(' / ') }}</strong>
          </div>
          <div class="lc-map-caption">
            <span>{{ copy.windowLabel }}</span>
            <strong>{{ activeHotspot.window }}</strong>
          </div>
        </div>
      </div>

      <div class="lc-ops-panel lc-ops-panel-strong lc-app-globe-detail">
        <div class="lc-metric-row">
          <div class="lc-metric-card">
            <span>{{ copy.theaterLabel }}</span>
            <strong>{{ activeHotspot.theater }}</strong>
          </div>
          <div class="lc-metric-card">
            <span>{{ copy.signalLabel }}</span>
            <strong>{{ activeHotspot.signalMix }}</strong>
          </div>
          <div class="lc-metric-card">
            <span>{{ copy.statusLabel }}</span>
            <strong>{{ activeHotspot.status }}</strong>
          </div>
        </div>

        <div class="lc-ops-subcard">
          <p class="lc-mini-label">{{ copy.briefLabel }}</p>
          <ul class="lc-topology-list">
            <li v-for="line in activeHotspot.brief" :key="line">{{ line }}</li>
          </ul>
        </div>

        <div class="lc-ops-subcard">
          <p class="lc-mini-label">{{ copy.feedLabel }}</p>
          <div class="lc-feed-list">
            <div v-for="item in activeHotspot.feed" :key="item" class="lc-static-card">{{ item }}</div>
          </div>
        </div>

        <div class="lc-ops-subcard">
          <p class="lc-mini-label">{{ copy.backtestLabel }}</p>
          <div class="lc-globe-idea-panel">
            <div class="lc-globe-idea-row"><span>{{ copy.primaryLabel }}</span><strong>{{ activeHotspot.idea.primary }}</strong></div>
            <div class="lc-globe-idea-row"><span>{{ copy.hedgeLabel }}</span><strong>{{ activeHotspot.idea.hedge }}</strong></div>
            <div class="lc-globe-idea-row"><span>{{ copy.horizonLabel }}</span><strong>{{ activeHotspot.idea.horizon }}</strong></div>
            <div class="lc-globe-idea-row"><span>{{ copy.hitRateLabel }}</span><strong>{{ activeHotspot.idea.hitRate }}</strong></div>
            <p>{{ activeHotspot.idea.note }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import 'maplibre-gl/dist/maplibre-gl.css';

type Locale = 'en' | 'ko' | 'ja';
type LayerId = 'hotspots' | 'relations' | 'lanes' | 'density' | 'labels';
type ViewId = 'global' | 'mena' | 'asia' | 'europe';
type Tone = 'critical' | 'elevated' | 'watch';

interface Hotspot {
  id: string;
  label: string;
  lng: number;
  lat: number;
  tone: Tone;
  risk: string;
  theater: string;
  window: string;
  path: string;
  signalMix: string;
  status: string;
  summary: string;
  brief: string[];
  feed: string[];
  assets: string[];
  idea: { primary: string; hedge: string; horizon: string; hitRate: string; note: string };
}

interface RouteLine {
  id: string;
  kind: 'relation' | 'lane';
  source: string;
  target: string;
}

const props = withDefaults(defineProps<{ locale?: Locale }>(), { locale: 'en' });

const COPY: Record<Locale, any> = {
  en: {
    kicker: 'App-grade 2D map',
    title: 'Read-only flat operations map using the same language as the desktop surface',
    lead: 'This mock 2D map uses layered hotspots, route lines, relation links, density halos, and a right-side brief panel to mimic the live map experience.',
    badges: ['maplibre', 'layer toggles', 'read-only mock map'],
    mapLabel: 'Read-only operations map',
    pathLabel: 'Impact path',
    assetsLabel: 'Linked assets',
    windowLabel: 'Window',
    theaterLabel: 'Theater',
    signalLabel: 'Signal mix',
    statusLabel: 'Posture',
    briefLabel: 'Regional brief',
    feedLabel: 'Mock event feed',
    backtestLabel: 'Mock replay and backtest',
    primaryLabel: 'Primary',
    hedgeLabel: 'Hedge',
    horizonLabel: 'Best horizon',
    hitRateLabel: 'Hit rate',
    views: [
      { id: 'global', label: 'Global' },
      { id: 'mena', label: 'MENA' },
      { id: 'asia', label: 'Asia' },
      { id: 'europe', label: 'Europe' },
    ],
    layers: [
      { id: 'hotspots', label: 'Hotspots' },
      { id: 'relations', label: 'Relations' },
      { id: 'lanes', label: 'Lanes' },
      { id: 'density', label: 'Density' },
      { id: 'labels', label: 'Labels' },
    ],
  },
  ko: {
    kicker: '앱 수준 2D 지도',
    title: '데스크톱 지도 표면과 같은 언어로 구성한 읽기 전용 2D 운영 지도',
    lead: 'hotspot, 경로선, 관계 링크, 밀도 halo, 우측 브리프 패널을 묶어 실제 앱의 2D 지도 감각을 mock 데이터로 재현합니다.',
    badges: ['maplibre', '레이어 토글', '읽기 전용 mock 지도'],
    mapLabel: '읽기 전용 운영 지도',
    pathLabel: '영향 경로',
    assetsLabel: '연결 자산',
    windowLabel: '윈도우',
    theaterLabel: '전장',
    signalLabel: '신호 구성',
    statusLabel: '태세',
    briefLabel: '지역 브리프',
    feedLabel: '가상 이벤트 피드',
    backtestLabel: '가상 리플레이와 백테스트',
    primaryLabel: '주요 후보',
    hedgeLabel: '헤지',
    horizonLabel: '적합 기간',
    hitRateLabel: '적중률',
    views: [
      { id: 'global', label: '글로벌' },
      { id: 'mena', label: '중동·북아프리카' },
      { id: 'asia', label: '아시아' },
      { id: 'europe', label: '유럽' },
    ],
    layers: [
      { id: 'hotspots', label: '핫스팟' },
      { id: 'relations', label: '관계' },
      { id: 'lanes', label: '경로' },
      { id: 'density', label: '밀도' },
      { id: 'labels', label: '라벨' },
    ],
  },
  ja: {
    kicker: 'アプリ級 2D マップ',
    title: 'デスクトップ地?サ?フェスと同じ言語で構成した?み取り?用 2D オペレ?ションマップ',
    lead: 'hotspot、ル?ト線、relation link、density halo、右側ブリ?フパネルを組み合わせて、?アプリの 2D マップ感?を mock デ?タで再現します。',
    badges: ['maplibre', 'layer toggles', 'read-only mock map'],
    mapLabel: '?み取り?用オペレ?ションマップ',
    pathLabel: 'Impact path',
    assetsLabel: 'Linked assets',
    windowLabel: 'Window',
    theaterLabel: 'Theater',
    signalLabel: 'Signal mix',
    statusLabel: 'Posture',
    briefLabel: 'Regional brief',
    feedLabel: 'Mock event feed',
    backtestLabel: 'Mock replay and backtest',
    primaryLabel: 'Primary',
    hedgeLabel: 'Hedge',
    horizonLabel: 'Best horizon',
    hitRateLabel: 'Hit rate',
    views: [
      { id: 'global', label: 'Global' },
      { id: 'mena', label: 'MENA' },
      { id: 'asia', label: 'Asia' },
      { id: 'europe', label: 'Europe' },
    ],
    layers: [
      { id: 'hotspots', label: 'Hotspots' },
      { id: 'relations', label: 'Relations' },
      { id: 'lanes', label: 'Lanes' },
      { id: 'density', label: 'Density' },
      { id: 'labels', label: 'Labels' },
    ],
  },
};

const copy = computed(() => COPY[props.locale]);

const HOTSPOTS: Hotspot[] = [
  {
    id: 'hormuz',
    label: 'Hormuz',
    lng: 56,
    lat: 26,
    tone: 'critical',
    risk: '87',
    theater: 'Gulf energy corridor',
    window: '24h to 72h',
    path: 'Shipping stress -> energy shock -> airline hedge',
    signalMix: 'Maritime 42 / Oil 33 / State media 25',
    status: 'Critical escalation watch',
    summary: 'Detailed flat-map mock for a Gulf chokepoint route.',
    brief: [
      'The flat map emphasizes corridor directionality and lane exposure faster than the globe view.',
      'Use hotspot, lane, and density together to estimate whether the theater is widening or only flashing.',
      'This mock surface mirrors how the live app shows route stress before downstream investment notes.',
    ],
    feed: [
      'Insurers lift tanker premium guidance after seizure warning.',
      'Mock convoy routing shifts through the Gulf corridor.',
      'Energy desks elevate route-risk language across the same 24h window.',
    ],
    assets: ['USO', 'XLE', 'JETS'],
    idea: {
      primary: 'USO / XLE long',
      hedge: 'JETS short',
      horizon: '24h / 72h',
      hitRate: '64%',
      note: 'Mock replay favors energy beta first, airline hedge second.',
    },
  },
  {
    id: 'red-sea',
    label: 'Red Sea',
    lng: 39,
    lat: 20,
    tone: 'elevated',
    risk: '74',
    theater: 'Maritime logistics corridor',
    window: '12h to 72h',
    path: 'Route diversion -> freight stress -> industrial margin pressure',
    signalMix: 'Ports 38 / Shipping 34 / Commodity 28',
    status: 'Freight stress watch',
    summary: 'Detailed flat-map mock for route diversion and freight sensitivity.',
    brief: [
      'The 2D surface is strongest when you need to compare corridor shape and rerouting behavior quickly.',
      'This theater tends to show duration-sensitive pricing rather than instant conflict escalation.',
      'Mock investment route follows freight and industrial margin pressure more than one-bar noise.',
    ],
    feed: [
      'Carriers extend Cape routing guidance for another week.',
      'Insurance desks flag a second premium step-up.',
      'Importers begin warning on delivery windows and lead times.',
    ],
    assets: ['BDRY', 'XLE', 'IYT'],
    idea: {
      primary: 'Freight and energy stress basket',
      hedge: 'Europe transport hedge',
      horizon: '24h / 168h',
      hitRate: '61%',
      note: 'Mock replay rewards duration-sensitive route proxies.',
    },
  },
  {
    id: 'taiwan',
    label: 'Taiwan Strait',
    lng: 121,
    lat: 24,
    tone: 'critical',
    risk: '82',
    theater: 'Semiconductor chokepoint',
    window: '24h to 168h',
    path: 'Drill activity -> semi supply chain -> global tech hedge',
    signalMix: 'Military 36 / Chips 34 / Export controls 30',
    status: 'Semiconductor disruption watch',
    summary: 'Detailed flat-map mock for semiconductor routes, drills, and export-control stress.',
    brief: [
      'The flat map helps compare fab geography with shipping and allied posture more quickly than the globe.',
      'Mock signal quality improves when semi nodes, lanes, and relation edges all move together.',
      'This is a slower theater. The panel biases toward 72h and 168h routes rather than instant calls.',
    ],
    feed: [
      'Exercise notice widens around fab-adjacent lanes.',
      'Supplier commentary points to longer inspection windows.',
      'Memory and equipment baskets begin to rerate across Asia and US tech.',
    ],
    assets: ['SOXX', 'NVDA', 'GLD'],
    idea: {
      primary: 'SOXX / semi hedge rotation',
      hedge: 'GLD or duration',
      horizon: '72h / 168h',
      hitRate: '67%',
      note: 'Mock replay favors multi-session supply-chain repricing.',
    },
  },
  {
    id: 'eastern-europe',
    label: 'Eastern Europe',
    lng: 31,
    lat: 49,
    tone: 'elevated',
    risk: '71',
    theater: 'Security posture theater',
    window: '24h to 168h',
    path: 'Military posture -> defense rerating -> sanctions extension',
    signalMix: 'Defense 43 / Policy 31 / Energy 26',
    status: 'Defense rerating watch',
    summary: 'Detailed flat-map mock for posture, logistics degradation, and sanctions overhang.',
    brief: [
      'The flat map makes posture corridors and adjacent policy theaters easier to compare side by side.',
      'Defense baskets work better here than broad-market extrapolations.',
      'This mock route stays on multi-day validation and avoids intraday overconfidence.',
    ],
    feed: [
      'Defense names lift on posture shift.',
      'Infrastructure chatter extends operational stress.',
      'Policy desks prepare another sanctions round.',
    ],
    assets: ['ITA', 'XAR', 'IEF'],
    idea: {
      primary: 'ITA / defense basket',
      hedge: 'Rates hedge',
      horizon: '72h / 168h',
      hitRate: '63%',
      note: 'Mock replay stays focused on posture-sensitive defense proxies.',
    },
  },
];

const ROUTES: RouteLine[] = [
  { id: 'hormuz-redsea', kind: 'lane', source: 'hormuz', target: 'red-sea' },
  { id: 'redsea-europe', kind: 'relation', source: 'red-sea', target: 'eastern-europe' },
  { id: 'taiwan-hormuz', kind: 'lane', source: 'taiwan', target: 'hormuz' },
  { id: 'europe-taiwan', kind: 'relation', source: 'eastern-europe', target: 'taiwan' },
];

const VIEW_PRESETS: Record<ViewId, { center: [number, number]; zoom: number }> = {
  global: { center: [20, 24], zoom: 1.5 },
  mena: { center: [48, 25], zoom: 3.3 },
  asia: { center: [114, 29], zoom: 3.1 },
  europe: { center: [20, 48], zoom: 3.2 },
};

const mapRef = ref<HTMLDivElement | null>(null);
const activeLayers = ref<LayerId[]>(['hotspots', 'relations', 'lanes', 'density', 'labels']);
const activeView = ref<ViewId>('global');
const selectedHotspotId = ref('hormuz');
const activeHotspot = computed(() => HOTSPOTS.find((item) => item.id === selectedHotspotId.value) || HOTSPOTS[0]);

let map: any = null;

function toggleLayer(layer: LayerId): void {
  const next = new Set(activeLayers.value);
  next.has(layer) ? next.delete(layer) : next.add(layer);
  activeLayers.value = Array.from(next) as LayerId[];
}

function toneColor(tone: Tone): string {
  if (tone === 'critical') return '#ff6b57';
  if (tone === 'elevated') return '#f6b84e';
  return '#67b2ff';
}

function hotspotFeature(item: Hotspot) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
    properties: {
      id: item.id,
      label: item.label,
      risk: Number(item.risk),
      color: toneColor(item.tone),
    },
  };
}

function routeFeature(item: RouteLine) {
  const source = HOTSPOTS.find((spot) => spot.id === item.source)!;
  const target = HOTSPOTS.find((spot) => spot.id === item.target)!;
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [source.lng, source.lat],
        [(source.lng + target.lng) / 2, (source.lat + target.lat) / 2 + (item.kind === 'lane' ? 6 : 2)],
        [target.lng, target.lat],
      ],
    },
    properties: {
      id: item.id,
      kind: item.kind,
    },
  };
}

function refreshMapData(): void {
  if (!map?.isStyleLoaded()) return;
  const hotspotSource = map.getSource('wm-hotspots');
  const routeSource = map.getSource('wm-routes');
  const densitySource = map.getSource('wm-density');
  hotspotSource?.setData({ type: 'FeatureCollection', features: HOTSPOTS.map(hotspotFeature) });
  routeSource?.setData({ type: 'FeatureCollection', features: ROUTES.map(routeFeature) });
  densitySource?.setData({
    type: 'FeatureCollection',
    features: HOTSPOTS.map((item) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
      properties: { radius: Number(item.risk), color: toneColor(item.tone) },
    })),
  });

  const visible = (layer: LayerId) => (activeLayers.value.includes(layer) ? 'visible' : 'none');
  map.setLayoutProperty('wm-hotspots-layer', 'visibility', visible('hotspots'));
  map.setLayoutProperty('wm-hotspot-labels', 'visibility', visible('labels'));
  map.setLayoutProperty('wm-routes-lanes', 'visibility', visible('lanes'));
  map.setLayoutProperty('wm-routes-relations', 'visibility', visible('relations'));
  map.setLayoutProperty('wm-density-layer', 'visibility', visible('density'));
  map.setFilter('wm-hotspot-active', ['==', ['get', 'id'], selectedHotspotId.value]);
}

function focusView(view: ViewId): void {
  if (!map) return;
  const preset = VIEW_PRESETS[view];
  map.easeTo({ center: preset.center, zoom: preset.zoom, duration: 800 });
}

function focusSelected(): void {
  if (!map) return;
  map.easeTo({ center: [activeHotspot.value.lng, activeHotspot.value.lat], zoom: Math.max(map.getZoom?.() || 2, 3.2), duration: 900 });
}

onMounted(async () => {
  if (!mapRef.value) return;
  const maplibre = await import('maplibre-gl');
  map = new maplibre.Map({
    container: mapRef.value,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: VIEW_PRESETS.global.center,
    zoom: VIEW_PRESETS.global.zoom,
    attributionControl: false,
  });
  map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), 'top-right');

  map.on('load', () => {
    map.addSource('wm-hotspots', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('wm-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addSource('wm-density', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    map.addLayer({
      id: 'wm-density-layer',
      type: 'circle',
      source: 'wm-density',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'radius'], 50, 20, 90, 42],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.12,
        'circle-blur': 1,
      },
    });

    map.addLayer({
      id: 'wm-routes-lanes',
      type: 'line',
      source: 'wm-routes',
      filter: ['==', ['get', 'kind'], 'lane'],
      paint: {
        'line-color': '#77d9ff',
        'line-width': 3,
        'line-opacity': 0.75,
        'line-dasharray': [2, 1.2],
      },
    });

    map.addLayer({
      id: 'wm-routes-relations',
      type: 'line',
      source: 'wm-routes',
      filter: ['==', ['get', 'kind'], 'relation'],
      paint: {
        'line-color': '#f3b363',
        'line-width': 2.2,
        'line-opacity': 0.66,
        'line-dasharray': [0.8, 1.2],
      },
    });

    map.addLayer({
      id: 'wm-hotspots-layer',
      type: 'circle',
      source: 'wm-hotspots',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 50, 6, 90, 12],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#f8fafc',
      },
    });

    map.addLayer({
      id: 'wm-hotspot-active',
      type: 'circle',
      source: 'wm-hotspots',
      paint: {
        'circle-radius': 18,
        'circle-color': 'rgba(116,208,255,0.14)',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#74d0ff',
      },
      filter: ['==', ['get', 'id'], selectedHotspotId.value],
    });

    map.addLayer({
      id: 'wm-hotspot-labels',
      type: 'symbol',
      source: 'wm-hotspots',
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 12,
        'text-offset': [0, 1.3],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#dbeafe',
        'text-halo-color': 'rgba(5,10,22,0.86)',
        'text-halo-width': 1,
      },
    });

    map.on('click', 'wm-hotspots-layer', (event: any) => {
      const id = event.features?.[0]?.properties?.id;
      if (id) selectedHotspotId.value = String(id);
    });

    refreshMapData();
  });
});

watch(activeLayers, () => refreshMapData(), { deep: true });
watch(selectedHotspotId, () => {
  refreshMapData();
  focusSelected();
});
watch(activeView, (value) => focusView(value));

onBeforeUnmount(() => {
  try { map?.remove(); } catch { }
  map = null;
});
</script>
