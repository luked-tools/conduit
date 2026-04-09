function clearSelectedNodeVisual(nodeId) {
  if (!nodeId) return;
  const el = document.getElementById(`node-${nodeId}`);
  if (el) el.classList.remove('selected');
}

function clearArrowEndpointVisuals(arrow) {
  if (!arrow) return;
  [arrow.from, arrow.to].forEach(nodeId => {
    const el = document.getElementById('node-' + nodeId);
    if (!el) return;
    el.classList.remove('arrow-endpoint');
    el.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
}

function applyArrowEndpointVisuals(arrow) {
  if (!arrow) return;
  const fromEl = document.getElementById('node-' + arrow.from);
  const toEl = document.getElementById('node-' + arrow.to);
  if (fromEl) {
    fromEl.classList.add('arrow-endpoint');
    const ports = new Set((fromEl.dataset.hidePorts || '').split(' ').filter(Boolean));
    ports.add(arrow.fromPos || 'e');
    fromEl.dataset.hidePorts = [...ports].join(' ');
  }
  if (toEl) {
    toEl.classList.add('arrow-endpoint');
    const ports = new Set((toEl.dataset.hidePorts || '').split(' ').filter(Boolean));
    ports.add(arrow.toPos || 'w');
    toEl.dataset.hidePorts = [...ports].join(' ');
  }
}

function selectNode(id) {
  if (_nodeLayerTargetMode && _nodeLayerTargetMode.sourceId !== id) cancelNodeLayerTargetMode();
  if (_quickConnectMode && _quickConnectMode.sourceId !== id) cancelQuickConnectMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  const previousNodeId = selectedNode;
  const previousArrow = selectedArrow ? state.arrows.find(a => a.id === selectedArrow) : null;
  selectedNode = id;
  selectedArrow = null;
  arrowSVG.style.zIndex = String(getArrowRenderBaseZ());
  clearSelectedNodeVisual(previousNodeId);
  clearArrowEndpointVisuals(previousArrow);
  const el = document.getElementById(`node-${id}`);
  if (el) el.classList.add('selected');
  if (_apNodeId) {
    const selN = state.nodes.find(x => x.id === id);
    if (selN && selN.type === 'boundary') closeAppearancePanel();
    else if (_apNodeId !== id) openAppearancePanel(id);
  }
  if (previousArrow) {
    renderArrows([previousArrow.id]);
  }
  scheduleSelectionChromeRefresh();
}

function getSelectedArrowLayerZ() {
  const topCanvasLayer = getCanvasLayerEntries().reduce((max, entry) => {
    return Math.max(max, entry.index + 1);
  }, 1);
  return String(topCanvasLayer + 10);
}

function selectArrow(id) {
  if (_nodeLayerTargetMode) cancelNodeLayerTargetMode();
  if (_quickConnectMode) cancelQuickConnectMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  const previousNodeId = selectedNode;
  const previousArrow = selectedArrow ? state.arrows.find(a => a.id === selectedArrow) : null;
  selectedArrow = id;
  selectedNode = null;
  closeAppearancePanel();
  clearSelectedNodeVisual(previousNodeId);
  clearArrowEndpointVisuals(previousArrow);
  const arr = state.arrows.find(a => a.id === id);
  applyArrowEndpointVisuals(arr);
  arrowSVG.style.zIndex = getSelectedArrowLayerZ();
  renderArrows([previousArrow?.id, id].filter(Boolean));
  scheduleSelectionChromeRefresh();
}

function deselect(e) {
  if (e && (e.target !== canvas && !e.target.closest('#canvas-wrap') || e.target.closest('.node') || e.target.closest('.arrow-path'))) return;
  if (_nodeLayerTargetMode) cancelNodeLayerTargetMode();
  if (_quickConnectMode) cancelQuickConnectMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  const previousNodeId = selectedNode;
  const previousArrow = selectedArrow ? state.arrows.find(a => a.id === selectedArrow) : null;
  selectedNode = null;
  selectedArrow = null;
  closeAppearancePanel();
  clearSelectedNodeVisual(previousNodeId);
  clearArrowEndpointVisuals(previousArrow);
  arrowSVG.style.zIndex = String(getArrowRenderBaseZ());
  if (previousArrow) {
    renderArrows([previousArrow.id]);
  }
  scheduleSelectionChromeRefresh();
}
