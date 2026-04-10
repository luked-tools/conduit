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
  return kind === 'node' || kind === 'arrow' || kind === 'label' || kind === 'icon';
}

function getCanvasObjectByEntry(entry) {
  if (!entry || !isValidCanvasOrderKind(entry.kind) || !entry.id) return null;
  if (entry.kind === 'node') return state.nodes.find(node => node.id === entry.id) || null;
  if (entry.kind === 'arrow') return state.arrows.find(arrow => arrow.id === entry.id) || null;
  if (entry.kind === 'label') return state.labels.find(label => label.id === entry.id) || null;
  if (entry.kind === 'icon') return state.icons.find(icon => icon.id === entry.id) || null;
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
  const labelEntries = (state.labels || []).map(label => makeCanvasOrderEntry('label', label.id));
  const iconEntries = (state.icons || []).map(icon => makeCanvasOrderEntry('icon', icon.id));
  return [...boundaryEntries, ...arrowEntries, ...contentNodeEntries, ...labelEntries, ...iconEntries];
}

function syncLegacyLayerValuesFromCanvasOrder() {
  let nodeLayer = 0;
  let arrowLayer = 0;
  let labelLayer = 0;
  let iconLayer = 0;
  (state.canvasOrder || []).forEach(entry => {
    if (entry.kind === 'node') {
      const node = state.nodes.find(item => item.id === entry.id);
      if (node) node.z = ++nodeLayer;
      return;
    }
    if (entry.kind === 'arrow') {
      const arrow = state.arrows.find(item => item.id === entry.id);
      if (arrow) arrow.z = ++arrowLayer;
      return;
    }
    if (entry.kind === 'label') {
      const label = state.labels.find(item => item.id === entry.id);
      if (label) label.z = ++labelLayer;
      return;
    }
    if (entry.kind === 'icon') {
      const icon = state.icons.find(item => item.id === entry.id);
      if (icon) icon.z = ++iconLayer;
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

function getLayerMoveSelectionEntries(kind, id) {
  const selectedEntries = typeof getSelectedCanvasObjects === 'function' ? getSelectedCanvasObjects() : [];
  if (selectedEntries.length > 1 && selectedEntries.some(entry => entry.kind === kind && entry.id === id)) {
    return selectedEntries;
  }
  return [makeCanvasOrderEntry(kind, id)];
}

function canMoveSelectedCanvasLayer(mode, selectionEntries = getSelectedCanvasObjects()) {
  const selection = (selectionEntries || []).filter(entry => !!getCanvasObjectByEntry(entry));
  if (!selection.length) return false;
  const ordered = getCanvasLayerEntries();
  const selectedKeys = new Set(selection.map(entry => getCanvasObjectKey(entry.kind, entry.id)));
  if (mode === 'front') return ordered.some(entry => selectedKeys.has(entry.key) && entry.index < ordered.length - 1);
  if (mode === 'back') return ordered.some(entry => selectedKeys.has(entry.key) && entry.index > 0);
  if (mode === 'forward') return ordered.some((entry, index) => selectedKeys.has(entry.key) && index < ordered.length - 1 && !selectedKeys.has(ordered[index + 1].key));
  if (mode === 'backward') return ordered.some((entry, index) => selectedKeys.has(entry.key) && index > 0 && !selectedKeys.has(ordered[index - 1].key));
  return false;
}

function moveCanvasLayerEntries(selectionEntries, mode) {
  normalizeCanvasOrder();
  const ordered = state.canvasOrder.slice();
  const selectedKeys = new Set((selectionEntries || []).map(entry => getCanvasObjectKey(entry.kind, entry.id)));
  if (!selectedKeys.size) return false;
  if (mode === 'front') {
    const next = ordered.filter(entry => !selectedKeys.has(getCanvasObjectKey(entry.kind, entry.id)));
    const moved = ordered.filter(entry => selectedKeys.has(getCanvasObjectKey(entry.kind, entry.id)));
    state.canvasOrder = [...next, ...moved];
    syncLegacyLayerValuesFromCanvasOrder();
    return true;
  }
  if (mode === 'back') {
    const moved = ordered.filter(entry => selectedKeys.has(getCanvasObjectKey(entry.kind, entry.id)));
    const next = ordered.filter(entry => !selectedKeys.has(getCanvasObjectKey(entry.kind, entry.id)));
    state.canvasOrder = [...moved, ...next];
    syncLegacyLayerValuesFromCanvasOrder();
    return true;
  }
  if (mode === 'forward') {
    let changed = false;
    for (let i = ordered.length - 2; i >= 0; i -= 1) {
      const key = getCanvasObjectKey(ordered[i].kind, ordered[i].id);
      const nextKey = getCanvasObjectKey(ordered[i + 1].kind, ordered[i + 1].id);
      if (selectedKeys.has(key) && !selectedKeys.has(nextKey)) {
        [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
        changed = true;
      }
    }
    if (!changed) return false;
    state.canvasOrder = ordered;
    syncLegacyLayerValuesFromCanvasOrder();
    return true;
  }
  if (mode === 'backward') {
    let changed = false;
    for (let i = 1; i < ordered.length; i += 1) {
      const key = getCanvasObjectKey(ordered[i].kind, ordered[i].id);
      const prevKey = getCanvasObjectKey(ordered[i - 1].kind, ordered[i - 1].id);
      if (selectedKeys.has(key) && !selectedKeys.has(prevKey)) {
        [ordered[i - 1], ordered[i]] = [ordered[i], ordered[i - 1]];
        changed = true;
      }
    }
    if (!changed) return false;
    state.canvasOrder = ordered;
    syncLegacyLayerValuesFromCanvasOrder();
    return true;
  }
  return false;
}

function moveSelectedCanvasLayer(mode, selectionEntries = getSelectedCanvasObjects()) {
  if (!canMoveSelectedCanvasLayer(mode, selectionEntries)) return false;
  pushUndo();
  const moved = moveCanvasLayerEntries(selectionEntries, mode);
  if (!moved) return false;
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof refreshRenderedAnnotationLayers === 'function') refreshRenderedAnnotationLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function getRenderedLabelLayerValue(label) {
  return getCanvasRenderLayerValue('label', label?.id);
}

function getRenderedIconLayerValue(icon) {
  return getCanvasRenderLayerValue('icon', icon?.id);
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
  const selection = getLayerMoveSelectionEntries('node', nodeId);
  return selection.length > 1 ? canMoveSelectedCanvasLayer(mode, selection) : canMoveCanvasLayer('node', nodeId, mode);
}

function canMoveLabelLayer(labelId, mode) {
  const selection = getLayerMoveSelectionEntries('label', labelId);
  return selection.length > 1 ? canMoveSelectedCanvasLayer(mode, selection) : canMoveCanvasLayer('label', labelId, mode);
}

function canMoveIconLayer(iconId, mode) {
  const selection = getLayerMoveSelectionEntries('icon', iconId);
  return selection.length > 1 ? canMoveSelectedCanvasLayer(mode, selection) : canMoveCanvasLayer('icon', iconId, mode);
}

let _nodeLayerTargetMode = null;
let _quickConnectMode = null;

function isCanvasLayerTargetMode(kind, id, mode) {
  return !!_nodeLayerTargetMode
    && _nodeLayerTargetMode.sourceKind === kind
    && _nodeLayerTargetMode.sourceId === id
    && _nodeLayerTargetMode.mode === mode;
}

function isNodeLayerTargetMode(nodeId, mode) {
  return isCanvasLayerTargetMode('node', nodeId, mode);
}

function getNodeLayerTargetBannerText(mode) {
  if (mode === 'front-of') return 'Layer order - click a canvas object to bring this item in front of it';
  if (mode === 'behind') return 'Layer order - click a canvas object to place this item behind it';
  return 'Layer order - click a canvas object';
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
  _quickConnectMode = null;
  updateQuickConnectUI();
  selectedArrow = id;
  selectedNode = null;
  render();
  updateQuickConnectUI();
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
  return startCanvasLayerTargetMode('node', nodeId, mode);
}

function startCanvasLayerTargetMode(kind, id, mode) {
  const source = getCanvasObjectByEntry({ kind, id });
  if (!source) return false;
  if (_nodeLayerTargetMode && _nodeLayerTargetMode.sourceKind === kind && _nodeLayerTargetMode.sourceId === id && _nodeLayerTargetMode.mode === mode) {
    cancelNodeLayerTargetMode();
    return false;
  }

  if (_brushActive) cancelStyleBrush();
  if (_inlineNodeEditor) closeInlineNodeEdit();
  if (kind === 'node' && selectedNode !== id) selectNode(id);
  else if (kind === 'label' && selectedLabel !== id) selectLabel(id);
  else if (kind === 'icon' && selectedIcon !== id) selectIcon(id);
  else if (kind === 'arrow' && selectedArrow !== id) selectArrow(id);

  _nodeLayerTargetMode = { sourceKind: kind, sourceId: id, mode };
  updateNodeLayerTargetUI();
  renderSidebar();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
  return true;
}

function moveCanvasLayerRelativeWithSelection(sourceKind, sourceId, targetKind, targetId, mode) {
  if (!sourceId || !targetId || (sourceKind === targetKind && sourceId === targetId)) return false;
  pushUndo();
  const moved = moveCanvasLayerRelative(sourceKind, sourceId, targetKind, targetId, mode === 'front-of' ? 'after' : 'before');
  if (!moved) return false;
  selectedNode = sourceKind === 'node' ? sourceId : null;
  selectedArrow = sourceKind === 'arrow' ? sourceId : null;
  selectedLabel = sourceKind === 'label' ? sourceId : null;
  selectedIcon = sourceKind === 'icon' ? sourceId : null;
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof refreshRenderedAnnotationLayers === 'function') refreshRenderedAnnotationLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();

  const targetObject = getCanvasObjectByEntry({ kind: targetKind, id: targetId });
  const targetName = targetObject
    ? ((targetObject.title || targetObject.tag || targetObject.text || targetObject.iconTitle || `${targetKind}`) + '').replace(/\n/g, ' ')
    : 'target object';
  const sourceLabel = sourceKind === 'node' ? 'Node' : sourceKind === 'label' ? 'Label' : sourceKind === 'icon' ? 'Icon' : 'Connection';
  const labels = {
    'front-of': `${sourceLabel} placed in front of ${targetName}`,
    'behind': `${sourceLabel} placed behind ${targetName}`
  };
  setStatusModeMessage(labels[mode] || 'Layer updated', { fade: true, autoClearMs: 1800 });
  return true;
}

function moveNodeLayerRelative(sourceId, targetId, mode) {
  return moveCanvasLayerRelativeWithSelection('node', sourceId, 'node', targetId, mode);
}

function applyNodeLayerTarget(targetId) {
  return applyCanvasLayerTarget('node', targetId);
}

function applyCanvasLayerTarget(targetKind, targetId) {
  if (!_nodeLayerTargetMode) return false;
  const { sourceKind, sourceId, mode } = _nodeLayerTargetMode;
  if (!targetId || (targetKind === sourceKind && targetId === sourceId)) return false;
  const applied = moveCanvasLayerRelativeWithSelection(sourceKind, sourceId, targetKind, targetId, mode);
  cancelNodeLayerTargetMode();
  return applied;
}

function canMoveArrowLayer(arrowId, mode) {
  const selection = getLayerMoveSelectionEntries('arrow', arrowId);
  return selection.length > 1 ? canMoveSelectedCanvasLayer(mode, selection) : canMoveCanvasLayer('arrow', arrowId, mode);
}

function moveNodeLayer(nodeId, mode) {
  if (_nodeLayerTargetMode && _nodeLayerTargetMode.sourceId === nodeId) cancelNodeLayerTargetMode();
  const selection = getLayerMoveSelectionEntries('node', nodeId);
  if (selection.length > 1) return moveSelectedCanvasLayer(mode, selection);
  pushUndo();
  const moved = moveCanvasLayer('node', nodeId, mode);
  if (!moved) return false;
  replaceCanvasSelection([makeCanvasSelectionEntry('node', nodeId)], { kind: 'node', id: nodeId });
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();

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
  const selection = getLayerMoveSelectionEntries('arrow', arrowId);
  if (selection.length > 1) return moveSelectedCanvasLayer(mode, selection);
  pushUndo();
  const moved = moveCanvasLayer('arrow', arrowId, mode);
  if (!moved) return false;
  replaceCanvasSelection([makeCanvasSelectionEntry('arrow', arrowId)], { kind: 'arrow', id: arrowId });
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();

  const labels = {
    front: 'Connection brought to front',
    forward: 'Connection moved forward',
    backward: 'Connection moved backward',
    back: 'Connection sent to back'
  };
  setStatusModeMessage(labels[mode] || 'Connection order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveLabelLayer(labelId, mode) {
  const selection = getLayerMoveSelectionEntries('label', labelId);
  if (selection.length > 1) return moveSelectedCanvasLayer(mode, selection);
  pushUndo();
  const moved = moveCanvasLayer('label', labelId, mode);
  if (!moved) return false;
  replaceCanvasSelection([makeCanvasSelectionEntry('label', labelId)], { kind: 'label', id: labelId });
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof refreshRenderedAnnotationLayers === 'function') refreshRenderedAnnotationLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Label moved', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveIconLayer(iconId, mode) {
  const selection = getLayerMoveSelectionEntries('icon', iconId);
  if (selection.length > 1) return moveSelectedCanvasLayer(mode, selection);
  pushUndo();
  const moved = moveCanvasLayer('icon', iconId, mode);
  if (!moved) return false;
  replaceCanvasSelection([makeCanvasSelectionEntry('icon', iconId)], { kind: 'icon', id: iconId });
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof refreshRenderedAnnotationLayers === 'function') refreshRenderedAnnotationLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Icon moved', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveNodeLayerToDisplayIndex(nodeId, displayIndex) {
  pushUndo();
  const moved = moveCanvasLayerToDisplayIndex('node', nodeId, displayIndex);
  if (!moved) return false;
  selectedNode = nodeId;
  selectedArrow = null;
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Node layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveArrowLayerToDisplayIndex(arrowId, displayIndex) {
  pushUndo();
  const moved = moveCanvasLayerToDisplayIndex('arrow', arrowId, displayIndex);
  if (!moved) return false;
  selectedArrow = arrowId;
  selectedNode = null;
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Connection layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveLabelLayerToDisplayIndex(labelId, displayIndex) {
  pushUndo();
  const moved = moveCanvasLayerToDisplayIndex('label', labelId, displayIndex);
  if (!moved) return false;
  selectedLabel = labelId;
  selectedNode = null;
  selectedArrow = null;
  selectedIcon = null;
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof refreshRenderedAnnotationLayers === 'function') refreshRenderedAnnotationLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Label layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function moveIconLayerToDisplayIndex(iconId, displayIndex) {
  pushUndo();
  const moved = moveCanvasLayerToDisplayIndex('icon', iconId, displayIndex);
  if (!moved) return false;
  selectedIcon = iconId;
  selectedNode = null;
  selectedArrow = null;
  selectedLabel = null;
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof refreshRenderedAnnotationLayers === 'function') refreshRenderedAnnotationLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Icon layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function createLabelAnnotationObject(x, y) {
  return {
    id: nextLabelId(),
    x: Math.round(x / 10) * 10,
    y: Math.round(y / 10) * 10,
    text: 'Label',
    fontSize: 16,
    fontWeight: 600,
    fontStyle: 'normal',
    textColor: '',
    backgroundStyle: 'none',
    fillColor: '',
    opacity: 1
  };
}

function createIconAnnotationObject(x, y, iconData = {}) {
  const icon = getBuiltinIconDefinition(iconData.iconKey) || getBuiltinIconDefinition('gear');
  return {
    id: nextIconId(),
    x: Math.round(x / 10) * 10,
    y: Math.round(y / 10) * 10,
    iconKey: iconData.iconKey || icon?.key || '',
    iconTitle: iconData.iconTitle || icon?.title || 'Icon',
    svgMarkup: iconData.svgMarkup || icon?.svg || '',
    size: 40,
    color: '',
    opacity: 1,
    backgroundStyle: 'none',
    fillColor: ''
  };
}

function addMode(type) {
  lastNodeType = type;
  updatePaletteHighlight();
  const cx = (-panX + canvasWrap.clientWidth / 2) / scale - 100;
  const cy = (-panY + canvasWrap.clientHeight / 2) / scale - 50;
  if (type === 'icon') {
    render();
    openIconPicker({ createAt: { x: cx, y: cy } });
    return;
  }
  pushUndo();
  if (type === 'label') {
    const label = createLabelAnnotationObject(cx, cy);
    state.labels.push(label);
    appendCanvasOrderEntry('label', label.id);
    selectedLabel = label.id;
    selectedNode = null;
    selectedArrow = null;
    selectedIcon = null;
    render();
    scheduleSaveToLocalStorage();
    requestAnimationFrame(() => startInlineAnnotationEdit(label.id));
    return;
  }
  const id = nextNodeId();
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type === 'boundary' ? 'Boundary Box' : type === 'external' ? 'External Entity' : 'New System',
    subtitle: '',
    x: cx, y: cy, w: type === 'boundary' ? 300 : 180, h: type === 'boundary' ? 200 : 100,
    color: '', textColor: '', functions: []
  });
  normalizeNodeLayers();
  appendCanvasOrderEntry('node', id);
  selectedNode = id;
  selectedArrow = null;
  selectedLabel = null;
  selectedIcon = null;
  render();
  scheduleSaveToLocalStorage();
}

function addModeAt(type, canvasX, canvasY) {
  lastNodeType = type;
  updatePaletteHighlight();
  if (type === 'icon') {
    render();
    openIconPicker({ createAt: { x: canvasX, y: canvasY } });
    return;
  }
  pushUndo();
  if (type === 'label') {
    const label = createLabelAnnotationObject(canvasX, canvasY);
    state.labels.push(label);
    appendCanvasOrderEntry('label', label.id);
    selectedLabel = label.id;
    selectedNode = null;
    selectedArrow = null;
    selectedIcon = null;
    render();
    scheduleSaveToLocalStorage();
    requestAnimationFrame(() => startInlineAnnotationEdit(label.id));
    return;
  }
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
  selectedNode = id;
  selectedArrow = null;
  selectedLabel = null;
  selectedIcon = null;
  render();
  scheduleSaveToLocalStorage();
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
  if (typeof closeInlineAnnotationEdit === 'function') closeInlineAnnotationEdit();
  selectedNode = null;
  selectedArrow = null;
  selectedLabel = null;
  selectedIcon = null;
  state.nodes = [];
  state.arrows = [];
  state.labels = [];
  state.icons = [];
  state.canvasOrder = [];
  resetDiagramCounters();
  render();
  saveToLocalStorage();
  setStatusModeMessage('Canvas cleared', { fade: true, autoClearMs: 1800 });
}

function confirmClearCanvas() {
  if (!state.nodes.length && !state.arrows.length && !(state.labels || []).length && !(state.icons || []).length) return;
  openBasicModal({
    title: 'Clear canvas',
    body: '<div style="font-size:12px;color:var(--text2);line-height:1.6;">Remove all nodes, labels, icons, boundary boxes, and connections from the canvas? Your diagram title, subtitle, and theme will be kept. You can still undo this.</div>',
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      { label: 'Clear canvas', className: 'tb-btn danger', onClick: clearCanvas }
    ]
  });
}
