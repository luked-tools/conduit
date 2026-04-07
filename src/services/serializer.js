function getCurrentDiagramPayload() {
  if (typeof normalizeCanvasOrder === 'function') normalizeCanvasOrder();
  return {
    version: 1,
    title: document.getElementById('diagram-title-input')?.value || '',
    subtitle: document.getElementById('diagram-subtitle-input')?.value || '',
    state: JSON.parse(JSON.stringify(state))
  };
}

function createBlankDiagramPayload() {
  return {
    version: 1,
    title: 'System Map',
    subtitle: 'Processes, platforms, and data flows',
    state: { nodes: [], arrows: [], canvasOrder: [] }
  };
}

function applyDiagramPayload(data) {
  state = data?.state ? JSON.parse(JSON.stringify(data.state)) : { nodes: [], arrows: [], canvasOrder: [] };
  if (!Array.isArray(state.nodes)) state.nodes = [];
  if (!Array.isArray(state.arrows)) state.arrows = [];
  if (!Array.isArray(state.canvasOrder)) state.canvasOrder = [];
  if (state.nodes.some(node => typeof node?.z !== 'number' || !Number.isFinite(node.z))) {
    normalizeNodeLayers(getSortedNodeLayerEntries());
  }
  if (state.arrows.some(arrow => typeof arrow?.z !== 'number' || !Number.isFinite(arrow.z))) {
    normalizeArrowLayers(getSortedArrowLayerEntries());
  }
  normalizeCanvasOrder();
  const ti = document.getElementById('diagram-title-input');
  const si = document.getElementById('diagram-subtitle-input');
  if (ti) ti.value = data?.title || '';
  if (si) si.value = data?.subtitle || '';
  selectedNode = null;
  selectedArrow = null;
  refreshCountersFromState();
  updateDocumentPanelFromInputs();
}
