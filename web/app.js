function mapView() {
  const signals = state.signals.slice(0, 40);
  if (!signals.length) return `<div class="content-shell">${snapshotBar()}<div class="empty-state"><strong>No signal field yet</strong><p>Run a snapshot first. Beacon will map lexical relationships between the strongest story clusters.</p></div></div>`;
  const positions = new Map(signals.map((signal, index) => [idOf(signal), mapPosition(signal, index, signals.length)]));
  const edges = [];
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const similarity = jaccard(signals[i].tokens, signals[j].tokens);
      if (similarity >= .22) edges.push([signals[i], signals[j], similarity]);
    }
  }
  const lines = edges.slice(0, 80).map(([a,b,sim]) => {
    const p1 = positions.get(idOf(a)), p2 = positions.get(idOf(b));
    return `<line x1="${p1.x}%" y1="${p1.y}%" x2="${p2.x}%" y2="${p2.y}%" style="opacity:${clamp(sim * 1.6,.12,.55)}"></line>`;
  }).join('');
  const nodes = signals.map(signal => {
    const p = positions.get(idOf(signal));
    const size = Math.round(48 + clamp((signal.signal_score || 0) / 100) * 58);
    return `<button class="map-node" data-signal="${escapeHtml(idOf(signal))}" style="left:${p.x}%;top:${p.y}%;--size:${size}px;--node-color:${nodeColor(signal)}" aria-label="${escapeHtml(titleOf(signal))}"><div><strong>${escapeHtml(titleOf(signal))}</strong><span>${Math.round(signal.signal_score || 0)}</span></div></button>`;
  }).join('');
  return `<div class="content-shell">
    ${snapshotBar()}
    <div class="map-layout">
      <section class="signal-map" aria-label="Signal relationship map"><svg class="map-svg">${lines}</svg>${nodes}</section>
      <aside class="map-side"><div class="panel-head"><span class="eyebrow">STRONGEST NODES</span><h2>Signal leaders</h2></div><div class="map-list">${signals.slice(0,12).map(signal => `<button data-signal="${escapeHtml(idOf(signal))}"><strong>${escapeHtml(titleOf(signal))}</strong><span>${Math.round(signal.signal_score || 0)} score · ${signal.source_count || 0} sources · ${escapeHtml(signal.status || 'stable')}</span></button>`).join('')}</div></aside>
    </div>
  </div>`;
}

function briefRows(items = []) {
  return items.map((signal, index) => `<div class="brief-row" role="button" tabindex="0" data-signal="${escapeHtml(idOf(signal))}"><span class="brief-rank">${String(index + 1).padStart(2,'0')}</span><strong>${escapeHtml(titleOf(signal))}</strong><span>${signal.source_count || 0} sources</span><span>${Math.round(signal.signal_score || 0)} score</span></div>`).join('');
}

function briefingView() {
  const brief = state.briefing || { top: [], rising: [], new: [], cross_source: [], stats: {} };
  const hero = brief.top?.[0];
  if (!hero) return `<div class="content-shell">${snapshotBar()}<div class="empty-state"><strong>No briefing yet</strong><p>The briefing is generated deterministically from the strongest signals in the latest snapshot.</p></div></div>`;
  return `<div class="content-shell">
    ${snapshotBar()}
    <div class="briefing-grid">
      <section class="brief-hero" role="button" tabindex="0" data-signal="${escapeHtml(idOf(hero))}">
        <div><span class="eyebrow">LEAD SIGNAL · ${escapeHtml((hero.status || 'stable').toUpperCase())}</span><h2>${escapeHtml(titleOf(hero))}</h2></div>
        <div class="brief-hero-footer"><div class="hero-score">${Math.round(hero.signal_score || 0)}<small>/ 100</small></div><div class="hero-meta">${hero.source_count || 0} independent sources<br>${fmt(hero.engagement)} observed engagement<br>${escapeHtml((hero.tokens || []).slice(0,5).join(' · '))}</div></div>
      </section>
      <aside class="brief-side-card"><span class="eyebrow">SNAPSHOT SHAPE</span><h3>Signal composition</h3><div class="brief-stats">
        <div class="brief-stat"><strong>${brief.stats?.signals || 0}</strong><span>Above threshold</span></div>
        <div class="brief-stat"><strong>${brief.stats?.rising || 0}</strong><span>Rising</span></div>
        <div class="brief-stat"><strong>${brief.stats?.new || 0}</strong><span>New</span></div>
        <div class="brief-stat"><strong>${brief.stats?.cross_source || 0}</strong><span>Cross-source</span></div>
      </div></aside>
    </div>
    <section class="brief-section"><div class="section-head"><h3 class="section-title">Strongest signals</h3><span>ranked by composite evidence</span></div>${briefRows(brief.top?.slice(1,8) || [])}</section>
    ${brief.rising?.length ? `<section class="brief-section"><div class="section-head"><h3 class="section-title">Accelerating</h3><span>gaining velocity vs previous snapshot</span></div>${briefRows(brief.rising)}</section>` : ''}
    ${brief.cross_source?.length ? `<section class="brief-section"><div class="section-head"><h3 class="section-title">Cross-source confirmation</h3><span>3+ independent sources</span></div>${briefRows(brief.cross_source)}</section>` : ''}
  </div>`;
}

function sourcesView() {
  const completed = new Map(state.sources.map(source => [source.source_id, source]));
  const all = state.configuredSources.map(config => ({
    ...config,
    ...(completed.get(config.id) || { source_id: config.id, source_name: config.name || config.id, source_type: config.type, status: 'not_run', item_count: 0, elapsed_ms: 0 }),
  }));
  const healthy = all.filter(source => source.status === 'ok').length;
  const items = all.reduce((sum, source) => sum + (source.item_count || 0), 0);
  const avg = all.filter(source => source.elapsed_ms).length ? Math.round(all.reduce((sum, source) => sum + (source.elapsed_ms || 0), 0) / all.filter(source => source.elapsed_ms).length) : 0;
  return `<div class="content-shell">
    ${snapshotBar()}
    <div class="source-summary">
      <div class="source-stat"><strong>${all.length}</strong><span>Configured sources</span></div>
      <div class="source-stat"><strong>${healthy}</strong><span>Healthy</span></div>
      <div class="source-stat"><strong>${items}</strong><span>Items collected</span></div>
      <div class="source-stat"><strong>${avg ? `${avg}ms` : '—'}</strong><span>Average fetch</span></div>
    </div>
    <div class="source-grid">${all.map(source => `<article class="source-card">
      <div class="source-top"><div class="source-name"><div class="source-icon">${escapeHtml((source.source_type || source.type || 'src').slice(0,3))}</div><div><strong>${escapeHtml(source.source_name || source.name || source.id)}</strong><span>${escapeHtml(source.source_type || source.type || 'source')}</span></div></div><span class="source-health ${source.status === 'error' ? 'error' : ''}" title="${escapeHtml(source.status || 'not run')}"></span></div>
      <div class="source-metrics"><span><strong>${source.item_count || 0}</strong> items</span><span><strong>${source.elapsed_ms ? `${source.elapsed_ms}ms` : '—'}</strong> fetch</span><span>${escapeHtml(source.status || 'not run')}</span></div>
      ${source.error ? `<p style="color:#ff7d7d;font-size:12px;line-height:1.5;margin:12px 0 0">${escapeHtml(source.error)}</p>` : ''}
    </article>`).join('')}</div>
  </div>`;
}

function render() {
  const main = $('#main-content');
  if (state.loading) { main.innerHTML = loadingView(); bindContentEvents(); return; }
  const views = { stream: streamView, map: mapView, briefing: briefingView, sources: sourcesView };
  main.innerHTML = views[state.view]();
  bindContentEvents();
}

function openSignal(id, updateHash = true) {
  const signal = state.signals.find(item => idOf(item) === id) || state.briefing?.top?.find(item => idOf(item) === id);
  if (!signal) return;
  state.selected = signal;
  const components = signal.components || {};
  const componentNames = ['novelty','velocity','breadth','rank_momentum','persistence','engagement_velocity','source_diversity'];
  const items = signal.items || [];
  $('#drawer-content').innerHTML = `<div class="drawer-body">
    <div class="drawer-score"><strong>${Math.round(signal.signal_score || 0)}</strong><span>SIGNAL SCORE</span></div>
    <h2>${escapeHtml(titleOf(signal))}</h2>
    <div class="drawer-meta">
      <span class="status-label ${escapeHtml(signal.status || 'stable')}">${escapeHtml(signal.status || 'stable')}</span>
      <span>${signal.source_count || 0} sources</span>
      <span>${signal.item_count || items.length} items</span>
      <span>${timeAgo(signal.last_seen)}</span>
      <button class="text-button" id="copy-signal-link" style="color:var(--accent);margin-left:auto;font-weight:600">🔗 Copy link</button>
    </div>
    <div class="component-list">${componentNames.map(name => {
      const value = clamp(Number(components[name] || 0));
      return `<div class="component-row"><span>${escapeHtml(name.replaceAll('_',' '))}</span><div class="component-track"><i style="width:${Math.round(value*100)}%"></i></div><strong>${Math.round(value*100)}</strong></div>`;
    }).join('')}</div>
    <div class="evidence-title"><strong>Source evidence</strong><span>${items.length} observations</span></div>
    ${items.map(item => `<a class="evidence-item" href="${escapeHtml(item.url || '#')}" target="_blank" rel="noreferrer"><span class="evidence-source">${escapeHtml(item.source_name)} · ${escapeHtml(item.source_type)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text || `${Object.entries(item.metrics || {}).slice(0,4).map(([k,v]) => `${k}: ${v}`).join(' · ')}`)}</p></a>`).join('') || '<p style="color:#6c788a;font-size:13px">No source items stored.</p>'}
  </div>`;
  const drawer = $('#detail-drawer');
  drawer.classList.add('is-open');
  drawer.setAttribute('aria-hidden', 'false');
  $('#drawer-backdrop').classList.add('is-open');
  $('#drawer-backdrop').setAttribute('aria-hidden', 'false');

  $('#copy-signal-link')?.addEventListener('click', async () => {
    const url = `${window.location.origin}${window.location.pathname}#signal=${idOf(signal)}`;
    await copyToClipboard(url);
    const btn = $('#copy-signal-link');
    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '🔗 Copy link', 2000); }
  });

  if (updateHash) {
    window.location.hash = `signal=${idOf(signal)}`;
  }
}

function closeDrawer(updateHash = true) {
  $('#detail-drawer').classList.remove('is-open');
  $('#detail-drawer').setAttribute('aria-hidden', 'true');
  $('#drawer-backdrop').classList.remove('is-open');
  $('#drawer-backdrop').setAttribute('aria-hidden', 'true');
  state.selected = null;
  if (updateHash) {
    window.location.hash = state.view;
  }
}

function checkUrlHashForSignal() {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('signal=')) {
    const id = hash.replace('signal=', '');
    if (id) openSignal(id, false);
  }
}

function handleHashRouting() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  if (['stream', 'map', 'briefing', 'sources'].includes(hash)) {
    if (state.selected) closeDrawer(false);
    setView(hash, false);
  } else if (hash.startsWith('signal=')) {
    const id = hash.replace('signal=', '');
    if (id && state.signals.length) {
      openSignal(id, false);
    }
  }
}

function bindContentEvents() {
  const search = $('#signal-search');
  if (search) {
    search.addEventListener('input', event => {
      const cursor = event.target.selectionStart;
      state.search = event.target.value;
      render();
      const next = $('#signal-search');
      if (next) { next.focus(); next.setSelectionRange(cursor, cursor); }
    });
  }
  $$('.filter-button').forEach(button => button.addEventListener('click', () => { state.status = button.dataset.status; render(); }));
  $('#signal-sort')?.addEventListener('change', event => { state.sort = event.target.value; render(); });
  
  const scoreSlider = $('#score-slider');
  if (scoreSlider) {
    scoreSlider.addEventListener('input', event => {
      state.minScore = Number(event.target.value);
      const valEl = $('#score-val');
      if (valEl) valEl.textContent = `${state.minScore}+`;
      render();
      const nextSlider = $('#score-slider');
      if (nextSlider) nextSlider.focus();
    });
  }

  $$('[data-signal]').forEach(element => {
    const activate = () => openSignal(element.dataset.signal);
    element.addEventListener('click', activate);
    element.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
  });
  $('.inline-run')?.addEventListener('click', runSnapshot);
}

async function runSnapshot() {
  const button = $('#run-button');
  const progress = $('#run-progress');
  const bar = $('#progress-bar');
  const message = $('#progress-message');
  const count = $('#progress-count');
  button.disabled = true;
  button.classList.add('is-running');
  $('#run-label').textContent = 'Running';
  progress.classList.remove('is-hidden');
  bar.style.width = '6%';
  message.textContent = 'Preparing sources';
  count.textContent = '';

  const events = new EventSource('/api/run/stream');
  events.onmessage = async event => {
    const payload = JSON.parse(event.data);
    message.textContent = payload.message || payload.phase;
    if (payload.total) {
      const pct = Math.max(8, Math.round(((payload.completed || 0) / payload.total) * 72));
      bar.style.width = `${pct}%`;
      count.textContent = `${payload.completed || 0}/${payload.total}`;
    }
    if (payload.phase === 'processing') bar.style.width = '78%';
    if (payload.phase === 'clustering') bar.style.width = '85%';
    if (payload.phase === 'scoring') bar.style.width = '92%';
    if (payload.phase === 'complete') {
      bar.style.width = '100%';
      count.textContent = `${payload.signal_count} signals`;
      events.close();
      state.selectedRunId = null;
      await loadData();
      setTimeout(() => progress.classList.add('is-hidden'), 900);
      button.disabled = false;
      button.classList.remove('is-running');
      $('#run-label').textContent = 'Run snapshot';
    }
    if (payload.phase === 'error') {
      events.close();
      button.disabled = false;
      button.classList.remove('is-running');
      $('#run-label').textContent = 'Run snapshot';
      bar.style.width = '100%';
      bar.style.background = '#ff7d7d';
      count.textContent = 'failed';
    }
  };
  events.onerror = () => {
    if (button.disabled) {
      events.close();
      button.disabled = false;
      button.classList.remove('is-running');
      $('#run-label').textContent = 'Run snapshot';
      message.textContent = 'Connection closed';
    }
  };
}

// Navigation & Global Events
$$('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('#run-button').addEventListener('click', runSnapshot);
$('#close-drawer').addEventListener('click', () => closeDrawer());
$('#drawer-backdrop').addEventListener('click', () => closeDrawer());
$('#focus-search').addEventListener('click', () => { setView('stream'); setTimeout(() => $('#signal-search')?.focus(), 0); });
$('#open-about').addEventListener('click', () => $('#about-dialog').showModal());
$('#close-about').addEventListener('click', () => $('#about-dialog').close());

// History Selector
$('#history-picker').addEventListener('change', event => {
  state.selectedRunId = event.target.value || null;
  loadData(state.selectedRunId);
});

// Export Dialog Handlers
$('#export-button').addEventListener('click', () => $('#export-dialog').showModal());
$('#close-export').addEventListener('click', () => $('#export-dialog').close());

$('#export-briefing-copy').addEventListener('click', async () => {
  const md = generateBriefingMarkdown();
  await copyToClipboard(md);
  const btn = $('#export-briefing-copy');
  btn.textContent = '✓ Copied!';
  setTimeout(() => btn.textContent = 'Copy to clipboard', 2000);
});

$('#export-briefing-download').addEventListener('click', () => {
  const md = generateBriefingMarkdown();
  const runId = state.run?.id || 'snapshot';
  downloadFile(`beacon-briefing-${runId}.md`, md, 'text/markdown;charset=utf-8');
});

$('#export-signals-csv').addEventListener('click', () => {
  const csv = generateSignalsCSV();
  const runId = state.run?.id || 'snapshot';
  downloadFile(`beacon-signals-${runId}.csv`, csv, 'text/csv;charset=utf-8');
});

$('#export-signals-json').addEventListener('click', () => {
  const json = generateSignalsJSON();
  const runId = state.run?.id || 'snapshot';
  downloadFile(`beacon-snapshot-${runId}.json`, json, 'application/json;charset=utf-8');
});

// Settings & Scoring Profile Handlers
const COMPONENT_LABELS = {
  novelty: 'Novelty',
  velocity: 'Velocity',
  breadth: 'Source Breadth',
  rank_momentum: 'Rank Momentum',
  persistence: 'Persistence',
  engagement_velocity: 'Engagement Impact',
  source_diversity: 'Source Diversity',
};

function renderSettingsModal() {
  const modes = state.scoringModes || {};
  const activeMode = state.scoringMode || 'balanced';
  const modeGrid = $('#mode-selector-grid');
  
  if (modeGrid) {
    modeGrid.innerHTML = Object.values(modes).map(m => {
      const isSelected = m.id === activeMode;
      return `<button class="mode-card ${isSelected ? 'is-selected' : ''}" data-mode="${escapeHtml(m.id)}">
        <div class="mode-card-header">
          <strong>${escapeHtml(m.name)}</strong>
          <span class="mode-badge ${m.id}">${escapeHtml(m.badge || m.id)}</span>
        </div>
        <p>${escapeHtml(m.description)}</p>
      </button>`;
    }).join('');

    $$('.mode-card', modeGrid).forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedId = btn.dataset.mode;
        state.scoringMode = selectedId;
        const modeInfo = state.scoringModes[selectedId];
        if (modeInfo?.weights) {
          state.weights = { ...modeInfo.weights };
        }
        renderSettingsModal();
        recalculateSignalsLocally();
        updateActiveModeBadge();
      });
    });
  }

  // Render Weight Sliders
  const slidersGrid = $('#weight-sliders');
  if (slidersGrid) {
    const weights = state.weights || {};
    slidersGrid.innerHTML = Object.entries(COMPONENT_LABELS).map(([key, label]) => {
      const val = Math.round((Number(weights[key]) || 0) * 100);
      return `<div class="weight-slider-item">
        <div class="weight-slider-head">
          <span>${escapeHtml(label)}</span>
          <strong id="val-${key}">${val}%</strong>
        </div>
        <input type="range" class="weight-range" data-key="${key}" min="0" max="50" step="1" value="${val}">
      </div>`;
    }).join('');

    $$('.weight-range', slidersGrid).forEach(slider => {
      slider.addEventListener('input', e => {
        const key = e.target.dataset.key;
        const val = Number(e.target.value);
        $(`#val-${key}`).textContent = `${val}%`;
        state.weights[key] = val / 100;
        updateWeightTotalDisplay();
        recalculateSignalsLocally();
      });
    });
  }

  // Threshold slider
  const threshSlider = $('#settings-threshold-slider');
  const threshDisplay = $('#threshold-val-display');
  if (threshSlider && threshDisplay) {
    threshSlider.value = state.threshold;
    threshDisplay.textContent = `${state.threshold} / 100`;
    threshSlider.oninput = (e) => {
      state.threshold = Number(e.target.value);
      threshDisplay.textContent = `${state.threshold} / 100`;
      recalculateSignalsLocally();
    };
  }

  updateWeightTotalDisplay();
}

function updateWeightTotalDisplay() {
  const total = Object.values(state.weights).reduce((s, w) => s + (Number(w) || 0), 0);
  const totalPct = Math.round(total * 100);
  const disp = $('#weight-total-display');
  if (disp) {
    disp.textContent = `Total: ${totalPct}%`;
    disp.style.color = Math.abs(totalPct - 100) > 3 ? '#ff7d7d' : 'var(--accent)';
  }
}

$('#settings-button')?.addEventListener('click', () => {
  renderSettingsModal();
  $('#settings-dialog')?.showModal();
});

$('#close-settings')?.addEventListener('click', () => $('#settings-dialog')?.close());

$('#reset-weights-btn')?.addEventListener('click', () => {
  const modeInfo = state.scoringModes[state.scoringMode];
  if (modeInfo?.weights) {
    state.weights = { ...modeInfo.weights };
  }
  renderSettingsModal();
  recalculateSignalsLocally();
});

$('#apply-settings-btn')?.addEventListener('click', async () => {
  try {
    await api('/api/scoring/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: state.scoringMode,
        threshold: state.threshold,
        weights: state.weights,
      }),
    });
    $('#settings-dialog')?.close();
    updateActiveModeBadge();
    await loadData();
  } catch (err) {
    console.error('Failed to save scoring settings:', err);
    $('#settings-dialog')?.close();
  }
});

// Keyboard Shortcuts
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    setView('stream');
    setTimeout(() => $('#signal-search')?.focus(), 0);
  }
  if (event.key === 'Escape') {
    if (state.selected) closeDrawer();
    const exportDlg = $('#export-dialog');
    if (exportDlg?.open) exportDlg.close();
    const aboutDlg = $('#about-dialog');
    if (aboutDlg?.open) aboutDlg.close();
    const settingsDlg = $('#settings-dialog');
    if (settingsDlg?.open) settingsDlg.close();
  }
});

// Hash routing
window.addEventListener('hashchange', handleHashRouting);

// Initial Load
if (window.location.hash) {
  const initialHash = window.location.hash.slice(1);
  if (['stream', 'map', 'briefing', 'sources'].includes(initialHash)) {
    state.view = initialHash;
  }
}
loadData();

