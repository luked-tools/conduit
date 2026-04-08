function updatePaletteHighlight() {
  document.querySelectorAll('.add-node-btn[data-nodetype]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nodetype === lastNodeType);
  });
}

function getCanvasObjectKey(kind, id) {
  return `${kind}:${id}`;
}

function makeCanvasOrderEntry(kind, id) {
  return { kind, id };
}

function isValidCanvasOrderKind(kind) {
  return kind === 'node' || kind === 'arrow';
}

function getCanvasObjectByEntry(entry) {
  if (!entry || !isValidCanvasOrderKind(entry.kind) || !entry.id) return null;
  if (entry.kind === 'node') return state.nodes.find(node => node.id === entry.id) || null;
  if (entry.kind === 'arrow') return state.arrows.find(arrow => arrow.id === entry.id) || null;
  return null;
}

function getDefaultCanvasOrderEntries() {
  const orderedNodes = getSortedNodeLayerEntries();
  const boundaryEntries = orderedNodes
    .filter(entry => entry.node.type === 'boundary')
    .map(entry => makeCanvasOrderEntry('node', entry.node.id));
  const arrowEntries = getSortedArrowLayerEntries()
    .map(entry => makeCanvasOrderEntry('arrow', entry.arrow.id));
  const contentNodeEntries = orderedNodes
    .filter(entry => entry.node.type !== 'boundary')
    .map(entry => makeCanvasOrderEntry('node', entry.node.id));
  return [...boundaryEntries, ...arrowEntries, ...contentNodeEntries];
}

function syncLegacyLayerValuesFromCanvasOrder() {
  let nodeLayer = 0;
  let arrowLayer = 0;
  (state.canvasOrder || []).forEach(entry => {
    if (entry.kind === 'node') {
      const node = state.nodes.find(item => item.id === entry.id);
      if (node) node.z = ++nodeLayer;
      return;
    }
    if (entry.kind === 'arrow') {
      const arrow = state.arrows.find(item => item.id === entry.id);
      if (arrow) arrow.z = ++arrowLayer;
    }
  });
}

function normalizeCanvasOrder(preferredEntries = null) {
  const defaults = preferredEntries || getDefaultCanvasOrderEntries();
  const existing = Array.isArray(state.canvasOrder) ? state.canvasOrder : [];
  const seen = new Set();
  const next = [];

  existing.forEach(entry => {
    if (!entry || !isValidCanvasOrderKind(entry.kind) || !entry.id) return;
    if (!getCanvasObjectByEntry(entry)) return;
    const key = getCanvasObjectKey(entry.kind, entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(makeCanvasOrderEntry(entry.kind, entry.id));
  });

  defaults.forEach(entry => {
    if (!entry || !isValidCanvasOrderKind(entry.kind) || !entry.id) return;
    if (!getCanvasObjectByEntry(entry)) return;
    const key = getCanvasObjectKey(entry.kind, entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(makeCanvasOrderEntry(entry.kind, entry.id));
  });

  state.canvasOrder = next;
  syncLegacyLayerValuesFromCanvasOrder();
  return state.canvasOrder;
}

function rebuildCanvasOrderFromLegacyLayers() {
  state.canvasOrder = getDefaultCanvasOrderEntries();
  syncLegacyLayerValuesFromCanvasOrder();
  return state.canvasOrder;
}

function appendCanvasOrderEntry(kind, id) {
  if (!isValidCanvasOrderKind(kind) || !id) return false;
  normalizeCanvasOrder();
  state.canvasOrder = (state.canvasOrder || []).filter(entry => !(entry.kind === kind && entry.id === id));
  state.canvasOrder.push(makeCanvasOrderEntry(kind, id));
  syncLegacyLayerValuesFromCanvasOrder();
  return true;
}

function getCanvasLayerEntries() {
  normalizeCanvasOrder();
  return state.canvasOrder.map((entry, index) => ({
    ...entry,
    index,
    key: getCanvasObjectKey(entry.kind, entry.id),
    object: getCanvasObjectByEntry(entry)
  })).filter(entry => !!entry.object);
}

function getCanvasLayerPosition(kind, id) {
  const ordered = getCanvasLayerEntries();
  const index = ordered.findIndex(entry => entry.kind === kind && entry.id === id);
  return { index, count: ordered.length };
}

function getCanvasRenderLayerValue(kind, id) {
  const { index } = getCanvasLayerPosition(kind, id);
  return index >= 0 ? index + 1 : 1;
}

function canMoveCanvasLayer(kind, id, mode) {
  const { index, count } = getCanvasLayerPosition(kind, id);
  if (index < 0) return false;
  if (mode === 'front') return index < count - 1;
  if (mode === 'back') return index > 0;
  if (mode === 'forward') return index < count - 1;
  if (mode === 'backward') return index > 0;
  return false;
}

function moveCanvasLayer(kind, id, mode) {
  normalizeCanvasOrder();
  const ordered = state.canvasOrder.slice();
  const index = ordered.findIndex(entry => entry.kind === kind && entry.id === id);
  if (index < 0) return false;

  const lastIndex = ordered.length - 1;
  let targetIndex = index;
  if (mode === 'front') targetIndex = lastIndex;
  else if (mode === 'back') targetIndex = 0;
  else if (mode === 'forward') targetIndex = Math.min(lastIndex, index + 1);
  else if (mode === 'backward') targetIndex = Math.max(0, index - 1);
  else return false;

  if (targetIndex === index) return false;
  const [entry] = ordered.splice(index, 1);
  ordered.splice(targetIndex, 0, entry);
  state.canvasOrder = ordered;
  syncLegacyLayerValuesFromCanvasOrder();
  return true;
}

function moveCanvasLayerRelative(sourceKind, sourceId, targetKind, targetId, position) {
  normalizeCanvasOrder();
  const ordered = state.canvasOrder.slice();
  const sourceIndex = ordered.findIndex(entry => entry.kind === sourceKind && entry.id === sourceId);
  const targetIndexInitial = ordered.findIndex(entry => entry.kind === targetKind && entry.id === targetId);
  if (sourceIndex < 0 || targetIndexInitial < 0) return false;
  if (sourceKind === targetKind && sourceId === targetId) return false;

  const [sourceEntry] = ordered.splice(sourceIndex, 1);
  const targetIndex = ordered.findIndex(entry => entry.kind === targetKind && entry.id === targetId);
  if (targetIndex < 0) return false;

  const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
  ordered.splice(insertIndex, 0, sourceEntry);
  state.canvasOrder = ordered;
  syncLegacyLayerValuesFromCanvasOrder();
  return true;
}

function moveCanvasLayerToDisplayIndex(kind, id, displayIndex) {
  const display = getCanvasLayerEntries().slice().reverse();
  const sourceIndex = display.findIndex(entry => entry.kind === kind && entry.id === id);
  if (sourceIndex < 0) return false;

  const boundedIndex = Math.max(0, Math.min(display.length - 1, displayIndex));
  if (boundedIndex === sourceIndex) return false;

  const [entry] = display.splice(sourceIndex, 1);
  display.splice(boundedIndex, 0, entry);
  state.canvasOrder = display.slice().reverse().map(item => makeCanvasOrderEntry(item.kind, item.id));
  syncLegacyLayerValuesFromCanvasOrder();
  return true;
}

function getNodeLayerValue(node, fallbackIndex = 0) {
  if (typeof node?.z === 'number' && Number.isFinite(node.z)) return node.z;
  return (node?.type === 'boundary' ? 1000 : 2000) + fallbackIndex;
}

function getArrowLayerValue(arrow, fallbackIndex = 0) {
  if (typeof arrow?.z === 'number' && Number.isFinite(arrow.z)) return arrow.z;
  return 1000 + fallbackIndex;
}

function getArrowRenderBaseZ() {
  return 2;
}

function getBoundaryRenderBaseZ() {
  return -1000;
}

function getNodeRenderBaseZ() {
  return 1000;
}

function getRenderedNodeLayerValue(node, fallbackIndex = 0) {
  return getCanvasRenderLayerValue('node', node?.id);
}

function getRenderedArrowLayerValue(arrow) {
  return getCanvasRenderLayerValue('arrow', arrow?.id);
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
  return getCanvasLayerPosition('node', nodeId);
}

function getArrowLayerPosition(arrowId) {
  return getCanvasLayerPosition('arrow', arrowId);
}

function canMoveNodeLayer(nodeId, mode) {
  return canMoveCanvasLayer('node', nodeId, mode);
}

let _nodeLayerTargetMode = null;
let _quickConnectMode = null;

function isNodeLayerTargetMode(nodeId, mode) {
  return !!_nodeLayerTargetMode
    && _nodeLayerTargetMode.sourceId === nodeId
    && _nodeLayerTargetMode.mode === mode;
}

function getNodeLayerTargetBannerText(mode) {
  if (mode === 'front-of') return 'Layer order - click a node to bring this node in front of it';
  if (mode === 'behind') return 'Layer order - click a node to place this node behind it';
  return 'Layer order - click a node';
}

function updateNodeLayerTargetUI() {
  const banner = document.getElementById('layer-target-banner');
  const text = document.getElementById('layer-target-text');
  const wrap = document.getElementById('canvas-wrap');
  if (!banner || !text || !wrap) return;

  if (_nodeLayerTargetMode) {
    text.textContent = getNodeLayerTargetBannerText(_nodeLayerTargetMode.mode);
    banner.classList.add('active');
    wrap.classList.add('layer-target-mode');
    wrap.style.cursor = 'crosshair';
  } else {
    banner.classList.remove('active');
    wrap.classList.remove('layer-target-mode');
    if (!wireActive && !_brushActive) wrap.style.cursor = '';
  }
}

function updateQuickConnectUI() {
  const banner = document.getElementById('quick-connect-banner');
  const text = document.getElementById('quick-connect-text');
  const wrap = document.getElementById('canvas-wrap');
  if (!banner || !text || !wrap) return;

  if (_quickConnectMode) {
    const sourceNode = state.nodes.find(node => node.id === _quickConnectMode.sourceId);
    const sourceName = sourceNode ? (sourceNode.title || sourceNode.tag || 'selected node').replace(/\n/g, ' ') : 'selected node';
    text.textContent = `Quick connect — click a node to connect from ${sourceName}`;
    banner.classList.add('active');
    wrap.classList.add('quick-connect-mode');
    wrap.style.cursor = 'crosshair';
  } else {
    banner.classList.remove('active');
    wrap.classList.remove('quick-connect-mode');
    if (!wireActive && !_brushActive && !_nodeLayerTargetMode) wrap.style.cursor = '';
  }
}

function cancelQuickConnectMode() {
  if (!_quickConnectMode) return;
  _quickConnectMode = null;
  updateQuickConnectUI();
  renderSidebar();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function startQuickConnectMode(nodeId) {
  const node = state.nodes.find(x => x.id === nodeId);
  if (!node) return false;
  if (_quickConnectMode && _quickConnectMode.sourceId === nodeId) {
    cancelQuickConnectMode();
    return false;
  }

  if (_brushActive) cancelStyleBrush();
  if (_nodeLayerTargetMode) cancelNodeLayerTargetMode();
  if (_inlineNodeEditor) closeInlineNodeEdit();
  if (selectedNode !== nodeId) selectNode(nodeId);

  _quickConnectMode = { sourceId: nodeId };
  updateQuickConnectUI();
  renderSidebar();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
  return true;
}

function applyQuickConnectTarget(targetId) {
  if (!_quickConnectMode) return false;
  const sourceId = _quickConnectMode.sourceId;
  if (!targetId || targetId === sourceId) return false;
  const sourceNode = state.nodes.find(node => node.id === sourceId);
  const targetNode = state.nodes.find(node => node.id === targetId);
  if (!sourceNode || !targetNode) return false;

  const { fromPos, toPos } = getBestPos(sourceId, targetId);
  pushUndo();
  const id = nextArrowId();
  state.arrows.push({
    id,
    from: sourceId,
    to: targetId,
    fromPos,
    toPos,
    direction: nextArrowType,
    lineStyle: nextArrowLineStyle,
    strokeStyle: 'solid',
    label: '',
    labelOffsetX: 0,
    labelOffsetY: 0,
    color: '',
    dash: false,
    bend: 0
  });
  normalizeArrowLayers();
  appendCanvasOrderEntry('arrow', id);
  cancelQuickConnectMode();
  render();
  selectArrow(id);
  saveToLocalStorage();

  const targetName = (targetNode.title || targetNode.tag || 'target node').replace(/\n/g, ' ');
  setStatusModeMessage(`Connected to ${targetName}`, { fade: true, autoClearMs: 1600 });
  return true;
}

function cancelNodeLayerTargetMode() {
  if (!_nodeLayerTargetMode) return;
  _nodeLayerTargetMode = null;
  updateNodeLayerTargetUI();
  renderSidebar();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function startNodeLayerTargetMode(nodeId, mode) {
  const node = state.nodes.find(x => x.id === nodeId);
  if (!node) return false;
  if (_nodeLayerTargetMode && _nodeLayerTargetMode.sourceId === nodeId && _nodeLayerTargetMode.mode === mode) {
    cancelNodeLayerTargetMode();
    return false;
  }

  if (_brushActive) cancelStyleBrush();
  if (_inlineNodeEditor) closeInlineNodeEdit();
  if (selectedNode !== nodeId) selectNode(nodeId);

  _nodeLayerTargetMode = { sourceId: nodeId, mode };
  updateNodeLayerTargetUI();
  renderSidebar();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
  return true;
}

function moveNodeLayerRelative(sourceId, targetId, mode) {
  if (!sourceId || !targetId || sourceId === targetId) return false;
  pushUndo();
  const moved = moveCanvasLayerRelative('node', sourceId, 'node', targetId, mode === 'front-of' ? 'after' : 'before');
  if (!moved) return false;
  render();
  selectNode(sourceId);
  saveToLocalStorage();

  const targetNode = state.nodes.find(node => node.id === targetId);
  const targetName = targetNode ? (targetNode.title || targetNode.tag || 'target node').replace(/\n/g, ' ') : 'target node';
  const labels = {
    'front-of': `Node placed in front of ${targetName}`,
    'behind': `Node placed behind ${targetName}`
  };
  setStatusModeMessage(labels[mode] || 'Layer updated', { fade: true, autoClearMs: 1800 });
  return true;
}

function applyNodeLayerTarget(targetId) {
  if (!_nodeLayerTargetMode) return false;
  const { sourceId, mode } = _nodeLayerTargetMode;
  if (!targetId || targetId === sourceId) return false;
  const applied = moveNodeLayerRelative(sourceId, targetId, mode);
  cancelNodeLayerTargetMode();
  return applied;
}

function canMoveArrowLayer(arrowId, mode) {
  return canMoveCanvasLayer('arrow', arrowId, mode);
}

function moveNodeLayer(nodeId, mode) {
  if (_nodeLayerTargetMode && _nodeLayerTargetMode.sourceId === nodeId) cancelNodeLayerTargetMode();
  pushUndo();
  const moved = moveCanvasLayer('node', nodeId, mode);
  if (!moved) return false;
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
  pushUndo();
  const moved = moveCanvasLayer('arrow', arrowId, mode);
  if (!moved) return false;
  renderNodes();
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

function moveNodeLayerToDisplayIndex(nodeId, displayIndex) {
  pushUndo();
  const moved = moveCanvasLayerToDisplayIndex('node', nodeId, displayIndex);
  if (!moved) return false;
  render();
  selectNode(nodeId);
  saveToLocalStorage();
  setStatusModeMessage('Node layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveArrowLayerToDisplayIndex(arrowId, displayIndex) {
  pushUndo();
  const moved = moveCanvasLayerToDisplayIndex('arrow', arrowId, displayIndex);
  if (!moved) return false;
  renderNodes();
  selectArrow(arrowId);
  saveToLocalStorage();
  setStatusModeMessage('Connection layer order updated', { fade: true, autoClearMs: 1500 });
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
  appendCanvasOrderEntry('node', id);
  render();
  selectNode(id);
  saveToLocalStorage();
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
  appendCanvasOrderEntry('node', id);
  render();
  selectNode(id);
  saveToLocalStorage();
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
  closeFnModal();
  closeNodeModal();
  if (typeof closeAppearancePanel === 'function') closeAppearancePanel();
  selectedNode = null;
  selectedArrow = null;
  state.nodes = [];
  state.arrows = [];
  state.canvasOrder = [];
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
