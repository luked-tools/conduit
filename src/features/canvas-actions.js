function updatePaletteHighlight() {
  document.querySelectorAll('.add-node-btn[data-nodetype]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nodetype === lastNodeType);
  });
}

function getNodeLayerValue(node, fallbackIndex = 0) {
  if (typeof node?.z === 'number' && Number.isFinite(node.z)) return node.z;
  return (node?.type === 'boundary' ? 1000 : 2000) + fallbackIndex;
}

function getArrowLayerValue(arrow, fallbackIndex = 0) {
  if (typeof arrow?.z === 'number' && Number.isFinite(arrow.z)) return arrow.z;
  return 1000 + fallbackIndex;
}

function getSortedNodeLayerEntries() {
  return state.nodes
    .map((node, index) => ({ node, index, layer: getNodeLayerValue(node, index) }))
    .sort((a, b) => (a.layer - b.layer) || (a.index - b.index));
}

function getSortedArrowLayerEntries() {
  return state.arrows
    .map((arrow, index) => ({ arrow, index, layer: getArrowLayerValue(arrow, index) }))
    .sort((a, b) => (a.layer - b.layer) || (a.index - b.index));
}

function normalizeNodeLayers(entries = getSortedNodeLayerEntries()) {
  entries.forEach((entry, index) => {
    entry.node.z = index + 1;
  });
}

function normalizeArrowLayers(entries = getSortedArrowLayerEntries()) {
  entries.forEach((entry, index) => {
    entry.arrow.z = index + 1;
  });
}

function getNodeLayerPosition(nodeId) {
  const ordered = getSortedNodeLayerEntries();
  const index = ordered.findIndex(entry => entry.node.id === nodeId);
  return { index, count: ordered.length };
}

function getArrowLayerPosition(arrowId) {
  const ordered = getSortedArrowLayerEntries();
  const index = ordered.findIndex(entry => entry.arrow.id === arrowId);
  return { index, count: ordered.length };
}

function canMoveNodeLayer(nodeId, mode) {
  const { index, count } = getNodeLayerPosition(nodeId);
  if (index < 0) return false;
  if (mode === 'front') return index < count - 1;
  if (mode === 'back') return index > 0;
  if (mode === 'forward') return index < count - 1;
  if (mode === 'backward') return index > 0;
  return false;
}

function canMoveArrowLayer(arrowId, mode) {
  const { index, count } = getArrowLayerPosition(arrowId);
  if (index < 0) return false;
  if (mode === 'front') return index < count - 1;
  if (mode === 'back') return index > 0;
  if (mode === 'forward') return index < count - 1;
  if (mode === 'backward') return index > 0;
  return false;
}

function moveNodeLayer(nodeId, mode) {
  const ordered = getSortedNodeLayerEntries();
  const index = ordered.findIndex(entry => entry.node.id === nodeId);
  if (index < 0) return false;

  const lastIndex = ordered.length - 1;
  let targetIndex = index;
  if (mode === 'front') targetIndex = lastIndex;
  else if (mode === 'back') targetIndex = 0;
  else if (mode === 'forward') targetIndex = Math.min(lastIndex, index + 1);
  else if (mode === 'backward') targetIndex = Math.max(0, index - 1);
  else return false;

  if (targetIndex === index) return false;

  pushUndo();
  const [entry] = ordered.splice(index, 1);
  ordered.splice(targetIndex, 0, entry);
  normalizeNodeLayers(ordered);
  render();
  selectNode(nodeId);
  saveToLocalStorage();

  const labels = {
    front: 'Node brought to front',
    forward: 'Node moved forward',
    backward: 'Node moved backward',
    back: 'Node sent to back'
  };
  setStatusModeMessage(labels[mode] || 'Layer updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveArrowLayer(arrowId, mode) {
  const ordered = getSortedArrowLayerEntries();
  const index = ordered.findIndex(entry => entry.arrow.id === arrowId);
  if (index < 0) return false;

  const lastIndex = ordered.length - 1;
  let targetIndex = index;
  if (mode === 'front') targetIndex = lastIndex;
  else if (mode === 'back') targetIndex = 0;
  else if (mode === 'forward') targetIndex = Math.min(lastIndex, index + 1);
  else if (mode === 'backward') targetIndex = Math.max(0, index - 1);
  else return false;

  if (targetIndex === index) return false;

  pushUndo();
  const [entry] = ordered.splice(index, 1);
  ordered.splice(targetIndex, 0, entry);
  normalizeArrowLayers(ordered);
  renderArrows();
  selectArrow(arrowId);
  saveToLocalStorage();

  const labels = {
    front: 'Connection brought to front',
    forward: 'Connection moved forward',
    backward: 'Connection moved backward',
    back: 'Connection sent to back'
  };
  setStatusModeMessage(labels[mode] || 'Connection order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function addMode(type) {
  pushUndo();
  lastNodeType = type;
  updatePaletteHighlight();
  const id = nextNodeId();
  const cx = (-panX + canvasWrap.clientWidth / 2) / scale - 100;
  const cy = (-panY + canvasWrap.clientHeight / 2) / scale - 50;
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type === 'boundary' ? 'Boundary Box' : type === 'external' ? 'External Entity' : 'New System',
    subtitle: '',
    x: cx, y: cy, w: type === 'boundary' ? 300 : 180, h: type === 'boundary' ? 200 : 100,
    color: '', textColor: '', functions: []
  });
  normalizeNodeLayers();
  render();
  selectNode(id);
}

function addModeAt(type, canvasX, canvasY) {
  pushUndo();
  lastNodeType = type;
  updatePaletteHighlight();
  const id = nextNodeId();
  const w = type === 'boundary' ? 300 : 180, h = type === 'boundary' ? 200 : 100;
  const x = Math.round((canvasX - w / 2) / 10) * 10;
  const y = Math.round((canvasY - h / 2) / 10) * 10;
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type === 'boundary' ? 'Boundary Box' : type === 'external' ? 'External Entity' : 'New System',
    subtitle: '',
    x, y, w, h, color: '', textColor: '', functions: []
  });
  normalizeNodeLayers();
  render();
  selectNode(id);
}

function setStatusModeMessage(text = '', { fade = false, autoClearMs = 0, color = '' } = {}) {
  const sb = document.getElementById('sb-mode');
  if (!sb) return;

  clearTimeout(sb._modeTimer);
  clearTimeout(sb._modeClearTimer);

  sb.textContent = text;
  sb.style.color = color || '';

  if (fade) {
    sb.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (sb.textContent === text) sb.style.opacity = '1';
      });
    });
  } else {
    sb.style.opacity = '1';
  }

  if (autoClearMs > 0) {
    sb._modeTimer = setTimeout(() => {
      if (sb.textContent !== text) return;
      sb.style.opacity = '0';
      sb._modeClearTimer = setTimeout(() => {
        if (sb.textContent === text) sb.textContent = '';
      }, 500);
    }, autoClearMs);
  }
}

let _canvasNoticeTimer = null;

function showCanvasNotice(text = '', { tone = 'accent', autoHideMs = 0 } = {}) {
  const banner = document.getElementById('canvas-notice-banner');
  const label = document.getElementById('canvas-notice-text');
  if (!banner || !label) return;
  if (_canvasNoticeTimer) {
    clearTimeout(_canvasNoticeTimer);
    _canvasNoticeTimer = null;
  }
  label.textContent = text;
  banner.classList.remove('danger');
  if (tone === 'danger') banner.classList.add('danger');
  banner.classList.add('active');
  if (autoHideMs > 0) {
    _canvasNoticeTimer = setTimeout(() => {
      hideCanvasNotice();
    }, autoHideMs);
  }
}

function hideCanvasNotice() {
  const banner = document.getElementById('canvas-notice-banner');
  if (!banner) return;
  if (_canvasNoticeTimer) {
    clearTimeout(_canvasNoticeTimer);
    _canvasNoticeTimer = null;
  }
  banner.classList.remove('active', 'danger');
}

function setIOPillLabel(el, prefix, text) {
  if (!el) return;
  el.textContent = '';
  const prefixSpan = document.createElement('span');
  prefixSpan.className = 'io-pill-prefix';
  prefixSpan.textContent = prefix;
  el.appendChild(prefixSpan);
  el.appendChild(document.createTextNode(text));
}

function clearCanvas() {
  pushUndo();
  cancelWire();
  closeBasicModal();
  closeConnectModal();
  closeFnModal();
  closeNodeModal();
  if (typeof closeAppearancePanel === 'function') closeAppearancePanel();
  selectedNode = null;
  selectedArrow = null;
  state.nodes = [];
  state.arrows = [];
  resetDiagramCounters();
  render();
  saveToLocalStorage();
  setStatusModeMessage('Canvas cleared', { fade: true, autoClearMs: 1800 });
}

function confirmClearCanvas() {
  if (!state.nodes.length && !state.arrows.length) return;
  openBasicModal({
    title: 'Clear canvas',
    body: '<div style="font-size:12px;color:var(--text2);line-height:1.6;">Remove all nodes, boundary boxes, and connections from the canvas? Your diagram title, subtitle, and theme will be kept. You can still undo this.</div>',
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      { label: 'Clear canvas', className: 'tb-btn danger', onClick: clearCanvas }
    ]
  });
}
