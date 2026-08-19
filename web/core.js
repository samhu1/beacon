const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  view: 'stream',
  signals: [],
  run: null,
  historyRuns: [],
  selectedRunId: null,
  briefing: null,
  sources: [],
  configuredSources: [],
  search: '',
  status: 'all',
  sort: 'score',
  minScore: 0,
  selected: null,
  loading: true,
  threshold: 48,
  scoringMode: 'balanced',
  scoringModes: {},
  weights: {
    novelty: 0.16,
    velocity: 0.18,
    breadth: 0.18,
    rank_momentum: 0.14,
    persistence: 0.10,
    engagement_velocity: 0.12,
    source_diversity: 0.12,
  },
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
  if (score >= 60) return '#f4f4f5';
  if (score >= 45) return '#cbd5e1';
  if (score >= 30) return '#94a3b8';
  return '#64748b';
}

function signalRow(signal) {
  const score = Number(signal.signal_score || 0);
  const velocity = Math.round((signal.components?.velocity || 0) * 100);
  const tierClass = score >= 50 ? 'score-high' : score >= 35 ? 'score-mid' : 'score-low';
  return `<div class="signal-row" role="button" tabindex="0" data-signal="${escapeHtml(idOf(signal))}">
    <div><div class="score-cell ${tierClass}"><span>${Math.round(score)}</span></div></div>
    <div class="signal-main">
      <div class="signal-title"><strong title="${escapeHtml(titleOf(signal))}">${escapeHtml(titleOf(signal))}</strong><span class="status-label ${escapeHtml(signal.status || 'stable')}">${escapeHtml(signal.status || 'stable')}</span></div>
      <div class="signal-sub"><span>${escapeHtml(sourceLabel(signal))}</span><span>•</span><span>${timeAgo(signal.last_seen)}</span><span class="terms">${escapeHtml((signal.tokens || []).slice(0,5).join(' · '))}</span></div>
    </div>
    <div><span class="metric-value">${signal.source_count || 0}</span><span class="metric-label">sources</span></div>
    <div><span class="metric-value">${fmt(signal.engagement)}</span><span class="metric-label">engagement</span></div>
    <div><span class="metric-value">${velocity}%</span><span class="metric-label">change</span></div>
    <div><span class="velocity-tag ${velocity >= 25 ? 'is-active' : ''}">${velocity > 0 ? '+' : ''}${velocity}%</span></div>
  </div>`;
}

function streamView() {
  const signals = filteredSignals();
  return `<div class="content-shell">
    ${snapshotBar()}
    <div class="toolbar">
      <label class="search-field"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg><input id="signal-search" autocomplete="off" placeholder="Search title, source, or term (Press /)" value="${escapeHtml(state.search)}" aria-label="Search signals"></label>
      <div class="filter-group" aria-label="Signal status">
        ${['all','new','rising','stable','cooling'].map(status => `<button class="filter-button ${state.status === status ? 'is-active' : ''}" data-status="${status}">${status[0].toUpperCase()+status.slice(1)}</button>`).join('')}
      </div>
      <div class="score-slider-group" title="Filter signals by minimum score">
        <span>Min Score</span>
        <input type="range" id="score-slider" min="0" max="90" step="5" value="${state.minScore}">
        <strong id="score-val">${state.minScore}+</strong>
      </div>
      <select class="sort-select" id="signal-sort" aria-label="Sort signals">
        <option value="score" ${state.sort==='score'?'selected':''}>Signal score</option>
        <option value="velocity" ${state.sort==='velocity'?'selected':''}>Velocity</option>
        <option value="breadth" ${state.sort==='breadth'?'selected':''}>Source breadth</option>
        <option value="fresh" ${state.sort==='fresh'?'selected':''}>Freshest</option>
      </select>
    </div>
    ${signals.length ? `<section class="signal-table">
      <div class="signal-head"><div>Score</div><div>Story cluster</div><div>Coverage</div><div>Activity</div><div>Change</div><div>Velocity</div></div>
      ${signals.map(signalRow).join('')}
    </section>` : `<div class="empty-state"><strong>${state.run ? 'No signals match this view' : 'No snapshot yet'}</strong><p>${state.run ? 'Try lowering the minimum score or clearing search filters.' : 'Beacon only runs when you ask it to. Start a snapshot to collect sources, cluster stories, and score signals.'}</p>${state.run ? '' : '<button class="run-button inline-run"><span class="run-icon"></span><span>Run first snapshot</span></button>'}</div>`}
  </div>`;
}

function nodeColor(signal) {
  const status = signal.status;
  if (status === 'new') return '#38bdf8';
  if (status === 'rising') return '#f59e0b';
  if (status === 'cooling') return '#f43f5e';
  if ((signal.components?.breadth || 0) > .55) return '#e2e8f0';
  return '#94a3b8';
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

async function loadData(targetRunId = state.selectedRunId) {
  state.loading = true;
  render();
  try {
    const runQuery = targetRunId ? `?run_id=${encodeURIComponent(targetRunId)}` : '';
    const [signalData, briefingData, sourceData, runsData, modesData] = await Promise.all([
      api(`/api/signals${runQuery}`),
      api(`/api/briefing${runQuery}`),
      api(`/api/sources${runQuery}`),
      api('/api/runs'),
      api('/api/scoring/modes').catch(() => null),
    ]);
    state.signals = signalData.signals || [];
    state.run = signalData.run || null;
    state.threshold = signalData.signal_threshold || 48;
    state.briefing = briefingData;
    state.sources = sourceData.sources || [];
    state.configuredSources = sourceData.configured || [];
    state.historyRuns = runsData.runs || [];
    
    if (modesData && modesData.modes) {
      state.scoringModes = modesData.modes;
      state.scoringMode = modesData.active_mode || 'balanced';
      state.weights = modesData.active_weights || state.weights;
      state.threshold = modesData.active_threshold || state.threshold;
    }
    
    updateHistoryPickerUI();
    updateActiveModeBadge();
  } catch (error) {
    console.error(error);
  } finally {
    state.loading = false;
    render();
    checkUrlHashForSignal();
  }
}

function updateActiveModeBadge() {
  const badge = $('#active-mode-badge');
  if (!badge) return;
  const modeInfo = state.scoringModes[state.scoringMode];
  badge.textContent = `Mode: ${modeInfo ? modeInfo.name.split(' ')[0] : 'Balanced'}`;
}

function recalculateSignalsLocally(weights = state.weights, threshold = state.threshold) {
  state.weights = { ...weights };
  state.threshold = threshold;
  state.signals = state.signals.map(s => {
    const comps = s.components || {};
    const raw = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (Number(comps[key]) || 0) * (Number(weight) || 0);
    }, 0);
    const newScore = Math.round(raw * 1000) / 10;
    return {
      ...s,
      signal_score: newScore,
    };
  });
  state.signals.sort((a, b) => (b.signal_score || 0) - (a.signal_score || 0) || (b.source_count || 0) - (a.source_count || 0));
  render();
}

function updateHistoryPickerUI() {
  const select = $('#history-picker');
  if (!select) return;
  const currentVal = state.selectedRunId || '';
  const optionsHtml = [
    '<option value="">Latest snapshot</option>',
    ...state.historyRuns.map(r => {
      const isSelected = r.id === currentVal ? 'selected' : '';
      const dateStr = fmtDate(r.finished_at || r.started_at);
      return `<option value="${escapeHtml(r.id)}" ${isSelected}>${escapeHtml(r.id.slice(0,8))} (${r.signal_count} sigs, ${dateStr})</option>`;
    })
  ].join('');
  select.innerHTML = optionsHtml;
}

function setView(view, updateHash = true) {
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
  if (updateHash) {
    if (!state.selected) {
      window.location.hash = view;
    }
  }
  $('#main-content').focus({ preventScroll: true });
}

function snapshotBar() {
  const run = state.run;
  const healthy = state.sources.filter(source => source.status === 'ok').length;
  const totalSources = state.sources.length || state.configuredSources.filter(source => source.enabled !== false).length;
  const runLabel = state.selectedRunId ? `Snapshot (${escapeHtml(state.selectedRunId.slice(0, 8))})` : 'Latest snapshot';
  return `
    <section class="snapshot-bar" aria-label="Latest snapshot metrics">
      <div class="snapshot-cell snapshot-meta">
        <div class="meta-copy"><span>${runLabel}</span><strong>${run ? escapeHtml(run.id) : 'No run yet'}</strong><time>${run ? fmtDate(run.finished_at) : 'Run a snapshot to begin'}</time></div>
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
    if (Number(signal.signal_score || 0) < state.minScore) return false;
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

function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return true;
  }
}

function generateBriefingMarkdown() {
  const run = state.run;
  const brief = state.briefing || {};
  const dateStr = fmtDate(run?.finished_at || new Date().toISOString());
  const lines = [
    `# Beacon Intelligence Briefing`,
    `*Generated on ${dateStr} • Snapshot ${run?.id || 'latest'}*`,
    ``,
    `## Summary Metrics`,
    `- **Signals Above Threshold:** ${brief.stats?.signals || 0}`,
    `- **Rising Velocity Signals:** ${brief.stats?.rising || 0}`,
    `- **New Signals:** ${brief.stats?.new || 0}`,
    `- **Cross-Source Confirmations:** ${brief.stats?.cross_source || 0}`,
    ``,
  ];

  const topSignals = brief.top || [];
  if (topSignals.length > 0) {
    lines.push(`## Top Signals`);
    topSignals.slice(0, 10).forEach((s, idx) => {
      const title = titleOf(s);
      const score = Math.round(s.signal_score || 0);
      const sources = sourceLabel(s);
      const firstItem = s.items?.[0];
      const link = firstItem?.url ? ` [Link](${firstItem.url})` : '';
      lines.push(`${idx + 1}. **${title}** (Score: ${score}/100, Status: ${s.status || 'stable'})${link}`);
      lines.push(`   - Sources: ${sources} (${s.source_count || 1} independent sources)`);
      if (s.tokens?.length) lines.push(`   - Key Terms: ${s.tokens.slice(0, 6).join(', ')}`);
    });
    lines.push(``);
  }

  if (brief.rising?.length) {
    lines.push(`## Accelerating Signals`);
    brief.rising.forEach(s => {
      lines.push(`- **${titleOf(s)}** (Score: ${Math.round(s.signal_score || 0)}, Velocity: +${Math.round((s.components?.velocity || 0) * 100)}%)`);
    });
    lines.push(``);
  }

  if (brief.cross_source?.length) {
    lines.push(`## Cross-Source Confirmation`);
    brief.cross_source.forEach(s => {
      lines.push(`- **${titleOf(s)}** (${s.source_count} sources: ${sourceLabel(s)})`);
    });
    lines.push(``);
  }

  return lines.join('\n');
}

function generateSignalsCSV() {
  const headers = ['cluster_id', 'signal_score', 'status', 'title', 'source_count', 'item_count', 'engagement', 'velocity_pct', 'sources', 'primary_url'];
  const rows = state.signals.map(s => {
    const primaryUrl = s.items?.[0]?.url || '';
    const velocity = Math.round((s.components?.velocity || 0) * 100);
    const escapeCsv = (str) => `"${String(str || '').replaceAll('"', '""')}"`;
    return [
      escapeCsv(idOf(s)),
      Math.round(s.signal_score || 0),
      escapeCsv(s.status || 'stable'),
      escapeCsv(titleOf(s)),
      s.source_count || 1,
      s.item_count || 1,
      Math.round(s.engagement || 0),
      velocity,
      escapeCsv(sourceLabel(s)),
      escapeCsv(primaryUrl),
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

function generateSignalsJSON() {
  return JSON.stringify({
    run: state.run,
    briefing: state.briefing,
    signals: state.signals,
    sources: state.sources,
  }, null, 2);
}

