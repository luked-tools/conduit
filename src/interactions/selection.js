function makeCanvasSelectionEntry(kind, id) {
  return { kind, id };
}

function getCanvasSelectionKey(kind, id) {
  return `${kind}:${id}`;
}

function normalizeSelectedCanvasObjects() {
  const seen = new Set();
  const next = [];
  (selectedCanvasObjects || []).forEach(entry => {
    if (!entry?.kind || !entry?.id) return;
    if (!getCanvasObjectByEntry(entry)) return;
    const key = getCanvasSelectionKey(entry.kind, entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    next.push(makeCanvasSelectionEntry(entry.kind, entry.id));
  });
  selectedCanvasObjects = next;
  if (
    !primarySelectedCanvasObject ||
    !selectedCanvasObjects.some(entry => entry.kind === primarySelectedCanvasObject.kind && entry.id === primarySelectedCanvasObject.id)
  ) {
    primarySelectedCanvasObject = selectedCanvasObjects[selectedCanvasObjects.length - 1] || null;
  }
  return selectedCanvasObjects;
}

function getSelectedCanvasObjects() {
  return normalizeSelectedCanvasObjects().slice();
}

function getCanvasSelectionCount() {
  return normalizeSelectedCanvasObjects().length;
}

function hasMultiCanvasSelection() {
  return getCanvasSelectionCount() > 1;
}

function getPrimarySelectedCanvasObject() {
  normalizeSelectedCanvasObjects();
  return primarySelectedCanvasObject;
}

function isCanvasObjectSelected(kind, id) {
  return normalizeSelectedCanvasObjects().some(entry => entry.kind === kind && entry.id === id);
}

function getSelectedCanvasObjectsByKind(kind) {
  return normalizeSelectedCanvasObjects().filter(entry => entry.kind === kind);
}

function syncLegacySelectionFromPrimary() {
  const primary = getPrimarySelectedCanvasObject();
  selectedNode = primary?.kind === 'node' ? primary.id : null;
  selectedArrow = primary?.kind === 'arrow' ? primary.id : null;
  selectedLabel = primary?.kind === 'label' ? primary.id : null;
  selectedIcon = primary?.kind === 'icon' ? primary.id : null;
}

function getSelectionAnchorRect() {
  const entries = getSelectedCanvasObjects();
  if (!entries.length) return null;
  const rects = entries.map(entry => {
    if (entry.kind === 'node') return document.getElementById(`node-${entry.id}`)?.getBoundingClientRect() || null;
    if (entry.kind === 'label') return document.getElementById(`label-${entry.id}`)?.getBoundingClientRect() || null;
    if (entry.kind === 'icon') return document.getElementById(`icon-${entry.id}`)?.getBoundingClientRect() || null;
    if (entry.kind === 'arrow') return document.querySelector(`.arrow-object[data-arrow-id="${entry.id}"]`)?.getBoundingClientRect() || null;
    return null;
  }).filter(Boolean);
  if (!rects.length) return null;
  const bounds = rects.reduce((acc, rect) => ({
    left: Math.min(acc.left, rect.left),
    top: Math.min(acc.top, rect.top),
    right: Math.max(acc.right, rect.right),
    bottom: Math.max(acc.bottom, rect.bottom)
  }), {
    left: rects[0].left,
    top: rects[0].top,
    right: rects[0].right,
    bottom: rects[0].bottom
  });
  return {
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top
  };
}

function getSelectedArrowLayerZ() {
  const topCanvasLayer = getCanvasLayerEntries().reduce((max, entry) => {
    return Math.max(max, entry.index + 1);
  }, 1);
  return String(topCanvasLayer + 10);
}

function refreshCanvasSelectionVisuals(previousArrowId = null) {
  syncLegacySelectionFromPrimary();
  const activeArrowId = getCanvasSelectionCount() === 1 && selectedArrow ? selectedArrow : null;
  arrowSVG.style.zIndex = activeArrowId ? getSelectedArrowLayerZ() : String(getArrowRenderBaseZ());
  if (previousArrowId !== activeArrowId) {
    renderNodes();
  } else {
    document.querySelectorAll('.node').forEach(nodeEl => {
      const nodeId = nodeEl.id.replace(/^node-/, '');
      nodeEl.classList.toggle('selected', isCanvasObjectSelected('node', nodeId));
    });
  }
  document.querySelectorAll('.canvas-annotation.annotation-label').forEach(el => {
    const labelId = el.id.replace(/^label-/, '');
    el.classList.toggle('selected', isCanvasObjectSelected('label', labelId));
  });
  document.querySelectorAll('.canvas-annotation.annotation-icon').forEach(el => {
    const iconId = el.id.replace(/^icon-/, '');
    el.classList.toggle('selected', isCanvasObjectSelected('icon', iconId));
  });
  renderArrows();
  renderSidebar();
  if (typeof renderContextToolbar === 'function') renderContextToolbar();
  if (typeof renderLayersPanel === 'function' && typeof _layersPanelOpen !== 'undefined' && _layersPanelOpen) renderLayersPanel();
}

function applyCanvasSelection(entries, primaryEntry = null) {
  const previousArrowId = selectedArrow;
  selectedCanvasObjects = (entries || []).map(entry => makeCanvasSelectionEntry(entry.kind, entry.id));
  primarySelectedCanvasObject = primaryEntry ? makeCanvasSelectionEntry(primaryEntry.kind, primaryEntry.id) : (selectedCanvasObjects[selectedCanvasObjects.length - 1] || null);
  normalizeSelectedCanvasObjects();
  if (_apNodeId) {
    const primary = getPrimarySelectedCanvasObject();
    if (!primary || primary.kind !== 'node' || hasMultiCanvasSelection()) closeAppearancePanel();
    else {
      const node = state.nodes.find(item => item.id === primary.id);
      if (node?.type === 'boundary') closeAppearancePanel();
      else if (_apNodeId !== primary.id) openAppearancePanel(primary.id);
    }
  }
  refreshCanvasSelectionVisuals(previousArrowId);
}

function replaceCanvasSelection(entries, primaryEntry = null) {
  if (_quickConnectMode) {
    const primary = primaryEntry || entries?.[entries.length - 1];
    if (!primary || primary.kind !== 'node' || _quickConnectMode.sourceId !== primary.id) cancelQuickConnectMode();
  }
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  applyCanvasSelection(entries, primaryEntry);
}

function toggleCanvasSelection(kind, id) {
  const key = getCanvasSelectionKey(kind, id);
  const existing = getSelectedCanvasObjects();
  const next = existing.filter(entry => getCanvasSelectionKey(entry.kind, entry.id) !== key);
  const removed = next.length !== existing.length;
  if (!removed) next.push(makeCanvasSelectionEntry(kind, id));
  replaceCanvasSelection(next, removed ? (next[next.length - 1] || null) : { kind, id });
}

function selectCanvasObject(kind, id, { additive = false, preserveExisting = false } = {}) {
  if (additive) {
    toggleCanvasSelection(kind, id);
    return;
  }
  if (preserveExisting && isCanvasObjectSelected(kind, id)) {
    replaceCanvasSelection(getSelectedCanvasObjects(), { kind, id });
    return;
  }
  replaceCanvasSelection([makeCanvasSelectionEntry(kind, id)], { kind, id });
}

function isSingleSelectedCanvasObject(kind, id) {
  return getCanvasSelectionCount() === 1 && isCanvasObjectSelected(kind, id);
}

function mergeCanvasSelection(entries, { toggle = false } = {}) {
  const current = getSelectedCanvasObjects();
  if (!toggle) {
    replaceCanvasSelection(entries, entries[entries.length - 1] || null);
    return;
  }
  const map = new Map(current.map(entry => [getCanvasSelectionKey(entry.kind, entry.id), entry]));
  entries.forEach(entry => {
    const key = getCanvasSelectionKey(entry.kind, entry.id);
    if (map.has(key)) map.delete(key);
    else map.set(key, makeCanvasSelectionEntry(entry.kind, entry.id));
  });
  const next = [...map.values()];
  replaceCanvasSelection(next, next[next.length - 1] || null);
}

function selectNode(id, options = {}) {
  if (_nodeLayerTargetMode) {
    if (_nodeLayerTargetMode.sourceKind === 'node' && _nodeLayerTargetMode.sourceId === id) return;
    if (applyCanvasLayerTarget('node', id)) return;
    cancelNodeLayerTargetMode();
  }
  selectCanvasObject('node', id, options);
}

function selectArrow(id, options = {}) {
  if (_nodeLayerTargetMode) {
    if (_nodeLayerTargetMode.sourceKind === 'arrow' && _nodeLayerTargetMode.sourceId === id) return;
    if (applyCanvasLayerTarget('arrow', id)) return;
    cancelNodeLayerTargetMode();
  }
  if (_quickConnectMode) cancelQuickConnectMode();
  selectCanvasObject('arrow', id, options);
}

function selectLabel(id, options = {}) {
  if (_nodeLayerTargetMode) {
    if (_nodeLayerTargetMode.sourceKind === 'label' && _nodeLayerTargetMode.sourceId === id) return;
    if (applyCanvasLayerTarget('label', id)) return;
    cancelNodeLayerTargetMode();
  }
  if (_quickConnectMode) cancelQuickConnectMode();
  selectCanvasObject('label', id, options);
}

function selectIcon(id, options = {}) {
  if (_nodeLayerTargetMode) {
    if (_nodeLayerTargetMode.sourceKind === 'icon' && _nodeLayerTargetMode.sourceId === id) return;
    if (applyCanvasLayerTarget('icon', id)) return;
    cancelNodeLayerTargetMode();
  }
  if (_quickConnectMode) cancelQuickConnectMode();
  selectCanvasObject('icon', id, options);
}

function deselect(e) {
  if (e && (e.target !== canvas && !e.target.closest('#canvas-wrap') || e.target.closest('.node') || e.target.closest('.arrow-path'))) return;
  if (_nodeLayerTargetMode) cancelNodeLayerTargetMode();
  if (_quickConnectMode) cancelQuickConnectMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  closeAppearancePanel();
  applyCanvasSelection([], null);
}
