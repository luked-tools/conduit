function getCurrentDiagramPayload() {
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
    title: 'SYSTEM INTERFACE MAP',
    subtitle: 'Manufacturing Execution · L3 / L4',
    state: { nodes: [], arrows: [] }
  };
}

function applyDiagramPayload(data) {
  state = data?.state ? JSON.parse(JSON.stringify(data.state)) : { nodes: [], arrows: [] };
  if (!Array.isArray(state.nodes)) state.nodes = [];
  if (!Array.isArray(state.arrows)) state.arrows = [];
  const ti = document.getElementById('diagram-title-input');
  const si = document.getElementById('diagram-subtitle-input');
  if (ti) ti.value = data?.title || '';
  if (si) si.value = data?.subtitle || '';
  selectedNode = null;
  selectedArrow = null;
  refreshCountersFromState();
  updateDocumentPanelFromInputs();
}
