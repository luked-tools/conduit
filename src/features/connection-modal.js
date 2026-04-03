// Connection modal extracted from main.js

// ══════════════════════════════════════════════
// CONNECTION MODAL
// ══════════════════════════════════════════════
let connState = {
  fromId: null,
  toId: null,
  dir: 'directed',
  fromPort: 'auto',
  toPort: 'auto',
  activePicker: null   // 'from' | 'to'
};

function getConnNodeType(type) {
  return type === 'external' || type === 'boundary' ? type : 'internal';
}

function openConnectModal(presetFromId) {
  connState = { fromId: presetFromId || null, toId: null, dir: 'directed', fromPort: 'auto', toPort: 'auto', activePicker: null };
  document.getElementById('conn-label-input').value = '';
  document.getElementById('conn-error').textContent = '';
  document.getElementById('conn-picker-wrap').style.display = 'none';
  setConnDir('directed');
  setConnPort('from', 'auto');
  setConnPort('to', 'auto');
  renderConnNodeDisplay('from');
  renderConnNodeDisplay('to');
  renderConnPreview();
  renderConnExisting();
  const _el_conn_modal_overlay_add = document.getElementById('conn-modal-overlay'); if (_el_conn_modal_overlay_add) _el_conn_modal_overlay_add.classList.add('open');
  document.body.style.overflow = 'hidden';
  // If preset from, open the 'to' picker immediately
  if (presetFromId) {
    setTimeout(() => openNodePicker('to'), 80);
  }
}

function closeConnectModal() {
  closeAllNodePickers();
  const _el_conn_modal_overlay_remove = document.getElementById('conn-modal-overlay'); if (_el_conn_modal_overlay_remove) _el_conn_modal_overlay_remove.classList.remove('open');
  document.body.style.overflow = '';
  connState.activePicker = null;
}

// ── Inline dropdown node pickers ──
function renderConnNodeDisplay(side) {
  const id = side === 'from' ? connState.fromId : connState.toId;
  const el = document.getElementById('conn-' + side + '-display');
  const content = el.querySelector('.conn-node-picker-content');
  if (!id) {
    el.className = 'conn-node-picker';
    content.innerHTML = '<div class="conn-node-picker-hint">Click to select…</div>';
    return;
  }
  const n = state.nodes.find(x => x.id === id);
  if (!n) return;
  const nodeType = getConnNodeType(n.type);
  el.className = 'conn-node-picker selected' + (nodeType === 'external' ? ' external' : '');
  content.innerHTML =
    (n.tag ? '<div class="conn-node-picker-tag">' + escapeHtml(n.tag) + '</div>' : '') +
    '<div class="conn-node-picker-name">' + escapeHtml((n.title || '').replace(/\n/g, ' ')) + '</div>';
}

function openNodePicker(side) {
  const el = document.getElementById('conn-' + side + '-display');
  const isOpen = el.classList.contains('open');
  // Close any open picker first
  closeAllNodePickers();
  if (isOpen) return; // toggle off
  connState.activePicker = side;
  el.classList.add('open');
  const inp = document.getElementById('conn-' + side + '-search');
  if (inp) { inp.value = ''; inp.focus(); }
  renderInlinePickerList(side, '');
}

function closeAllNodePickers() {
  ['from', 'to'].forEach(side => {
    const el = document.getElementById('conn-' + side + '-display');
    if (el) el.classList.remove('open');
  });
  connState.activePicker = null;
}

function renderInlinePickerList(side, query) {
  const list = document.getElementById('conn-' + side + '-list');
  if (!list) return;
  list.innerHTML = '';
  const nodes = state.nodes; // all types including boundary
  const q = (query || '').toLowerCase();
  const filtered = nodes.filter(n => {
    if (!q) return true;
    return (n.title || '').toLowerCase().includes(q) ||
           (n.tag   || '').toLowerCase().includes(q) ||
           (n.subtitle || '').toLowerCase().includes(q);
  });
  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:10px 12px;font-size:11px;color:var(--text3);font-style:italic;">No nodes found</div>';
    return;
  }
  const currentSel = side === 'from' ? connState.fromId : connState.toId;
  filtered.forEach(n => {
    const nodeType = getConnNodeType(n.type);
    const opt = document.createElement('div');
    opt.className = 'conn-node-option' + (n.id === currentSel ? ' active' : '');
    opt.innerHTML =
      '<span class="conn-node-opt-badge ' + nodeType + '">' + escapeHtml(n.tag || nodeType.slice(0,3).toUpperCase()) + '</span>' +
      '<div class="conn-node-opt-text"><div class="conn-node-opt-name">' + escapeHtml((n.title || '').replace(/\n/g, ' ')) + '</div>' +
      (n.subtitle ? '<div class="conn-node-opt-sub">' + escapeHtml((n.subtitle || '').replace(/\n/g,' ').slice(0,60)) + '</div>' : '') +
      '</div>';
    opt.addEventListener('click', e => {
      e.stopPropagation();
      if (side === 'from') connState.fromId = n.id;
      else                 connState.toId   = n.id;
      closeAllNodePickers();
      renderConnNodeDisplay(side);
      renderConnPreview();
      renderConnExisting();
      const err = document.getElementById('conn-error');
      if (err) err.textContent = '';
    });
    list.appendChild(opt);
  });
}

// Wire up search inputs
document.getElementById('conn-from-search').addEventListener('input', e => {
  renderInlinePickerList('from', e.target.value);
});
document.getElementById('conn-to-search').addEventListener('input', e => {
  renderInlinePickerList('to', e.target.value);
});

// Legacy — kept so any external calls don't break
function renderNodePickerList(query) {
  if (connState.activePicker) renderInlinePickerList(connState.activePicker, query);
}

// Close pickers when clicking outside the modal node row
document.getElementById('conn-modal').addEventListener('click', e => {
  if (!e.target.closest('.conn-node-picker')) closeAllNodePickers();
});

function swapConnNodes() {
  [connState.fromId, connState.toId] = [connState.toId, connState.fromId];
  [connState.fromPort, connState.toPort] = [connState.toPort, connState.fromPort];
  renderConnNodeDisplay('from');
  renderConnNodeDisplay('to');
  renderConnPreview();
  renderConnExisting();
}

function setConnDir(dir) {
  connState.dir = dir;
  document.querySelectorAll('.conn-dir-btn').forEach(b => b.classList.toggle('active', b.dataset.dir === dir));
  renderConnPreview();
}

function setConnPort(side, port) {
  if (side === 'from') connState.fromPort = port;
  else                 connState.toPort   = port;
  const grid = document.getElementById('conn-' + side + '-ports');
  grid.querySelectorAll('.conn-port-btn').forEach(b => b.classList.toggle('active', b.dataset.port === port));
  renderConnPreview();
}

function renderConnPreview() {
  const fromNode = connState.fromId ? state.nodes.find(x => x.id === connState.fromId) : null;
  const toNode   = connState.toId   ? state.nodes.find(x => x.id === connState.toId)   : null;
  const label    = document.getElementById('conn-label-input').value;

  const fromEl = document.getElementById('conn-preview-from');
  const toEl   = document.getElementById('conn-preview-to');
  const lineEl = document.getElementById('conn-preview-line');
  const lblEl  = document.getElementById('conn-preview-lbl');

  fromEl.textContent = fromNode ? (fromNode.title || '').replace(/\n/g,' ') : 'From';
  fromEl.style.opacity = fromNode ? '1' : '0.35';
  fromEl.className = 'conn-preview-from' + (fromNode && fromNode.type === 'external' ? ' ext' : '');

  toEl.textContent = toNode ? (toNode.title || '').replace(/\n/g,' ') : 'To';
  toEl.style.opacity = toNode ? '1' : '0.35';
  toEl.className = 'conn-preview-to' + (toNode && toNode.type === 'external' ? ' ext' : '');

  const arrows = { directed: '──→', bidirectional: '←──→', undirected: '────' };
  lineEl.textContent = arrows[connState.dir] || '──→';
  lblEl.textContent = label || '';
}

document.getElementById('conn-label-input').addEventListener('input', renderConnPreview);

function renderConnExisting() {
  const wrap = document.getElementById('conn-existing-wrap');
  const list = document.getElementById('conn-existing-list');
  if (!connState.fromId) { wrap.style.display = 'none'; return; }
  const related = state.arrows.filter(a => a.from === connState.fromId || a.to === connState.fromId);
  if (related.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = '';
  related.forEach(a => {
    const otherId = a.from === connState.fromId ? a.to : a.from;
    const other = state.nodes.find(x => x.id === otherId);
    if (!other) return;
    const isOut = a.from === connState.fromId;
    const item = document.createElement('div');
    item.className = 'conn-existing-item';
    const dirIcon = a.direction === 'bidirectional' ? '↔' : isOut ? '→' : '←';
    item.innerHTML =
      '<span class="conn-existing-dir">' + dirIcon + '</span>' +
      '<div class="conn-existing-info">' +
        '<span style="font-weight:600;color:var(--text);">' + escapeHtml((other.title||'').replace(/\n/g,' ')) + '</span>' +
        (a.label ? ' <span class="conn-existing-label">· ' + escapeHtml(a.label) + '</span>' : '') +
      '</div>' +
      '<button class="conn-existing-del" title="Delete this connection">×</button>';
    item.querySelector('.conn-existing-del').addEventListener('click', () => {
      pushUndo();
    state.arrows = state.arrows.filter(x => x.id !== a.id);
      renderArrows();
      renderConnExisting();
      updateStatusBar();
    });
    list.appendChild(item);
  });
}

function createConnection() {
  const errEl = document.getElementById('conn-error');
  if (!connState.fromId) { errEl.textContent = 'Please select a From node.'; return; }
  if (!connState.toId)   { errEl.textContent = 'Please select a To node.';   return; }
  if (connState.fromId === connState.toId) { errEl.textContent = 'From and To must be different nodes.'; return; }

  // Resolve 'auto' ports
  const best = getBestPos(connState.fromId, connState.toId);
  const fromPort = connState.fromPort === 'auto' ? best.fromPos : connState.fromPort;
  const toPort   = connState.toPort   === 'auto' ? best.toPos   : connState.toPort;

  const id = nextArrowId();
  state.arrows.push({
    id,
    from: connState.fromId,
    to:   connState.toId,
    fromPos: fromPort,
    toPos:   toPort,
    direction: connState.dir,
    lineStyle: nextArrowLineStyle,
    label: document.getElementById('conn-label-input').value.trim(),
    labelOffsetX: 0, labelOffsetY: 0,
    color: '', dash: false, bend: 0
  });
  renderArrows();
  updateStatusBar();

  // Reset for another connection, keep from node
  const prevFrom = connState.fromId;
  connState.toId = null;
  connState.fromPort = 'auto';
  connState.toPort = 'auto';
  document.getElementById('conn-label-input').value = '';
  errEl.textContent = '';
  renderConnNodeDisplay('to');
  renderConnPreview();
  renderConnExisting();

  // Flash the button green briefly
  const btn = document.getElementById('conn-create-btn');
  btn.textContent = '✓ Created!';
  btn.style.background = 'var(--accent3)';
  setTimeout(() => { btn.textContent = 'Create Connection'; btn.style.background = ''; }, 1200);
}

// Close on overlay click
document.getElementById('conn-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('conn-modal-overlay')) closeConnectModal();
});

// Also wire up the node detail modal connections tab "Add connection" button
function openConnectFromNode(nodeId) {
  closeNodeModal();
  openConnectModal(nodeId);
}
