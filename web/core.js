const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  view: 'stream',
  signals: [],
  run: null,
  briefing: null,
  sources: [],
  configuredSources: [],
  search: '',
  status: 'all',
  sort: 'score',
  selected: null,
  loading: true,
  threshold: 48,
};

const viewMeta = {
  stream: ['INTELLIGENCE STREAM', 'What changed'],
  map: ['SIGNAL FIELD', 'How stories connect'],
  briefing: ['SNAPSHOT BRIEFING', 'What matters now'],
  sources: ['SOURCE UNIVERSE', 'Coverage & health'],
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function clamp(value, min = 0, max = 1) { return Math.min(max, Math.max(min, value)); }
function fmt(value) { return new Intl.NumberFormat('en-US', { notation: value > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value || 0); }
function fmtDate(value) {
  if (!value) return 'No snapshot yet';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}
function timeAgo(value) {
  if (!value) return 'recently';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.round(diff / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
function scoreColor(score) {
  if (score >= 70) return '#b8ff60';
  if (score >= 55) return '#ffc55d';
  if (score >= 40) return '#6fa8ff';
  return '#667080';
}
function sourceLabel(signal) {
  const names = [...new Set((signal.items || []).map(item => item.source_name).filter(Boolean))];
  if (!names.length) return 'No sources';
  return names.length > 2 ? `${names.slice(0, 2).join(' · ')} +${names.length - 2}` : names.join(' · ');
}
function idOf(signal) { return signal.cluster_id || signal.id; }
function titleOf(signal) { return signal.representative_title || signal.title || 'Untitled signal'; }
function jaccard(a = [], b = []) {
  const left = new Set(a), right = new Set(b);
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const value of left) if (right.has(value)) overlap++;
  return overlap / new Set([...left, ...right]).size;
}
function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadData() {
  state.loading = true;
  render();
  try {
    const [signalData, briefingData, sourceData] = await Promise.all([
      api('/api/signals'), api('/api/briefing'), api('/api/sources'),
    ]);
    state.signals = signalData.signals || [];
    state.run = signalData.run || null;
    state.threshold = signalData.signal_threshold || 48;
    state.briefing = briefingData;
    state.sources = sourceData.sources || [];
    state.configuredSources = sourceData.configured || [];
  } catch (error) {
    console.error(error);
  } finally {
    state.loading = false;
    render();
  }
}

function setView(view) {
  if (!viewMeta[view]) return;
  state.view = view;
  $$('.nav-item').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
  });
  $('#view-eyebrow').textContent = viewMeta[view][0];
  $('#view-title').textContent = viewMeta[view][1];
  render();
  $('#main-content').focus({ preventScroll: true });
}

function snapshotBar() {
  const run = state.run;
  const healthy = state.sources.filter(source => source.status === 'ok').length;
  const totalSources = state.sources.length || state.configuredSources.filter(source => source.enabled !== false).length;
  return `
    <section class="snapshot-bar" aria-label="Latest snapshot metrics">
      <div class="snapshot-cell snapshot-meta">
        <div class="meta-copy"><span>Latest snapshot</span><strong>${run ? escapeHtml(run.id) : 'No run yet'}</strong><time>${run ? fmtDate(run.finished_at) : 'Run a snapshot to begin'}</time></div>
        <span class="health-pill">${healthy}/${totalSources || 0} sources online</span>
      </div>
      <div class="snapshot-cell"><strong>${fmt(run?.deduped_count)}</strong><span>Unique items</span></div>
      <div class="snapshot-cell"><strong>${fmt(run?.cluster_count)}</strong><span>Story clusters</span></div>
      <div class="snapshot-cell"><strong>${fmt(run?.signal_count)}</strong><span>Signals</span></div>
      <div class="snapshot-cell"><strong>${totalSources || 0}</strong><span>Sources checked</span></div>
    </section>`;
}

function loadingView() {
  return `<div class="content-shell">${snapshotBar()}<div class="loading-grid">${Array.from({length:7}, () => '<div class="skeleton"></div>').join('')}</div></div>`;
}

function filteredSignals() {
  const query = state.search.trim().toLowerCase();
  const signals = state.signals.filter(signal => {
    if (state.status !== 'all' && signal.status !== state.status) return false;
    if (!query) return true;
    const haystack = `${titleOf(signal)} ${(signal.tokens || []).join(' ')} ${sourceLabel(signal)}`.toLowerCase();
    return haystack.includes(query);
  });
  return [...signals].sort((a, b) => {
    if (state.sort === 'fresh') return new Date(b.last_seen || 0) - new Date(a.last_seen || 0);
    if (state.sort === 'breadth') return (b.source_count || 0) - (a.source_count || 0) || (b.signal_score || 0) - (a.signal_score || 0);
    if (state.sort === 'velocity') return (b.components?.velocity || 0) - (a.components?.velocity || 0) || (b.signal_score || 0) - (a.signal_score || 0);
    return (b.signal_score || 0) - (a.signal_score || 0);
  });
}

function signalRow(signal) {
  const score = Number(signal.signal_score || 0);
  const velocity = Math.round((signal.components?.velocity || 0) * 100);
  const bars = [0.25, 0.42, 0.36, 0.58, clamp((signal.components?.velocity || .2), .14, 1)].map(v => `<i style="height:${Math.round(v * 22)}px"></i>`).join('');
  return `<div class="signal-row" role="button" tabindex="0" data-signal="${escapeHtml(idOf(signal))}">
    <div><div class="score-ring" style="--score:${score};--score-color:${scoreColor(score)}"><span>${Math.round(score)}</span></div></div>
    <div class="signal-main">
      <div class="signal-title"><strong title="${escapeHtml(titleOf(signal))}">${escapeHtml(titleOf(signal))}</strong><span class="status-label ${escapeHtml(signal.status || 'stable')}">${escapeHtml(signal.status || 'stable')}</span></div>
      <div class="signal-sub"><span>${escapeHtml(sourceLabel(signal))}</span><span>•</span><span>${timeAgo(signal.last_seen)}</span><span class="terms">${escapeHtml((signal.tokens || []).slice(0,4).join(' · '))}</span></div>
    </div>
    <div><span class="metric-value">${signal.source_count || 0}</span><span class="metric-label">sources</span></div>
    <div><span class="metric-value">${fmt(signal.engagement)}</span><span class="metric-label">engagement</span></div>
    <div><span class="metric-value">${velocity}%</span><span class="metric-label">velocity</span></div>
    <div class="mini-spark">${bars}</div>
  </div>`;
}

function streamView() {
  const signals = filteredSignals();
  return `<div class="content-shell">
    ${snapshotBar()}
    <div class="toolbar">
      <label class="search-field"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg><input id="signal-search" autocomplete="off" placeholder="Search title, source, or term" value="${escapeHtml(state.search)}" aria-label="Search signals"></label>
      <div class="filter-group" aria-label="Signal status">
        ${['all','new','rising','stable'].map(status => `<button class="filter-button ${state.status === status ? 'is-active' : ''}" data-status="${status}">${status[0].toUpperCase()+status.slice(1)}</button>`).join('')}
      </div>
      <select class="sort-select" id="signal-sort" aria-label="Sort signals">
        <option value="score" ${state.sort==='score'?'selected':''}>Signal score</option>
        <option value="velocity" ${state.sort==='velocity'?'selected':''}>Velocity</option>
        <option value="breadth" ${state.sort==='breadth'?'selected':''}>Source breadth</option>
        <option value="fresh" ${state.sort==='fresh'?'selected':''}>Freshest</option>
      </select>
    </div>
    ${signals.length ? `<section class="signal-table">
      <div class="signal-head"><div>Score</div><div>Story cluster</div><div>Coverage</div><div>Activity</div><div>Change</div><div>Momentum</div></div>
      ${signals.map(signalRow).join('')}
    </section>` : `<div class="empty-state"><strong>${state.run ? 'No signals match this view' : 'No snapshot yet'}</strong><p>${state.run ? 'Change the search or status filter.' : 'Beacon only runs when you ask it to. Start a snapshot to collect sources, cluster stories, and score signals.'}</p>${state.run ? '' : '<button class="run-button inline-run"><span class="run-icon"></span><span>Run first snapshot</span></button>'}</div>`}
  </div>`;
}

function nodeColor(signal) {
  const status = signal.status;
  if (status === 'new') return '#b8ff60';
  if (status === 'rising') return '#ffc55d';
  if ((signal.components?.breadth || 0) > .55) return '#6be6df';
  return '#6fa8ff';
}

function mapPosition(signal, index, total) {
  const hash = hashString(idOf(signal) + titleOf(signal));
  const angle = ((hash % 360) * Math.PI) / 180 + index * 0.19;
  const score = clamp((signal.signal_score || 0) / 100, .1, 1);
  const ring = 13 + ((hash >>> 8) % 25) + (1 - score) * 23;
  return {
    x: clamp(50 + Math.cos(angle) * ring, 8, 92),
    y: clamp(50 + Math.sin(angle) * ring * .83, 8, 92),
  };
}
