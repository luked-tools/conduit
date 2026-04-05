function selectNode(id) {
  if (_nodeLayerTargetMode && _nodeLayerTargetMode.sourceId !== id) cancelNodeLayerTargetMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  selectedNode = id;
  selectedArrow = null;
  arrowSVG.style.zIndex = '2';
  document.querySelectorAll('.node').forEach(e => {
    e.classList.remove('selected');
    e.classList.remove('arrow-endpoint');
    e.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
  const el = document.getElementById(`node-${id}`);
  if (el) el.classList.add('selected');
  if (_apNodeId) {
    const selN = state.nodes.find(x => x.id === id);
    if (selN && selN.type === 'boundary') closeAppearancePanel();
    else if (_apNodeId !== id) openAppearancePanel(id);
  }
  renderArrows();
  renderSidebar();
  if (typeof renderLayersPanel === 'function') renderLayersPanel();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function selectArrow(id) {
  if (_nodeLayerTargetMode) cancelNodeLayerTargetMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  selectedArrow = id;
  selectedNode = null;
  closeAppearancePanel();
  document.querySelectorAll('.node').forEach(e => {
    e.classList.remove('selected');
    e.classList.remove('arrow-endpoint');
    e.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
  const arr = state.arrows.find(a => a.id === id);
  if (arr) {
    const fromEl = document.getElementById('node-' + arr.from);
    const toEl   = document.getElementById('node-' + arr.to);
    if (fromEl) {
      fromEl.classList.add('arrow-endpoint');
      const ports = new Set((fromEl.dataset.hidePorts || '').split(' ').filter(Boolean));
      ports.add(arr.fromPos || 'e');
      fromEl.dataset.hidePorts = [...ports].join(' ');
    }
    if (toEl) {
      toEl.classList.add('arrow-endpoint');
      const ports = new Set((toEl.dataset.hidePorts || '').split(' ').filter(Boolean));
      ports.add(arr.toPos || 'w');
      toEl.dataset.hidePorts = [...ports].join(' ');
    }
  }
  arrowSVG.style.zIndex = '4';
  renderArrows();
  renderSidebar();
  if (typeof renderLayersPanel === 'function') renderLayersPanel();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function deselect(e) {
  if (e && (e.target !== canvas && !e.target.closest('#canvas-wrap') || e.target.closest('.node') || e.target.closest('.arrow-path'))) return;
  if (_nodeLayerTargetMode) cancelNodeLayerTargetMode();
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  selectedNode = null;
  selectedArrow = null;
  closeAppearancePanel();
  document.querySelectorAll('.node').forEach(e => {
    e.classList.remove('selected');
    e.classList.remove('arrow-endpoint');
    e.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
  arrowSVG.style.zIndex = '2';
  renderArrows();
  renderSidebar();
  if (typeof renderLayersPanel === 'function') renderLayersPanel();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}
