let nodeIdCounter = 1;
let arrowIdCounter = 1;

function nextNodeId() {
  return 'n' + (nodeIdCounter++);
}

function nextArrowId() {
  return 'a' + (arrowIdCounter++);
}

function setDiagramCounters(nodeCounter, arrowCounter) {
  nodeIdCounter = nodeCounter;
  arrowIdCounter = arrowCounter;
}

function resetDiagramCounters() {
  setDiagramCounters(1, 1);
}

function refreshCountersFromState() {
  nodeIdCounter = Math.max(...(state.nodes || []).map(n => parseInt((n.id || '').replace(/\D/g,'')) || 0), 0) + 1;
  arrowIdCounter = Math.max(...(state.arrows || []).map(a => parseInt((a.id || '').replace(/\D/g,'')) || 0), 0) + 1;
}

function nextNodeTag(type) {
  if (type === 'boundary') return '';
  const seq = state.nodes.filter(n => n.type !== 'boundary').length + 1;
  const num = String(seq).padStart(2, '0');
  return type === 'external' ? 'EXT-' + num : 'SYS-' + num;
}
