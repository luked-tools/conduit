const DIAGRAM_DOCUMENT_VERSION = 2;

let diagramDocument = null;
let activeDiagramId = 'diagram-main';
let diagramNavBackStack = [];
let diagramNavForwardStack = [];

function cloneDiagramData(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeDiagramId() {
  return 'diagram_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function getDiagramTitleInputValue() {
  return document.getElementById('diagram-title-input')?.value || '';
}

function getDiagramSubtitleInputValue() {
  return document.getElementById('diagram-subtitle-input')?.value || '';
}

function createBlankDiagramState() {
  return { nodes: [], arrows: [], canvasOrder: [] };
}

function normalizeDiagramState(diagramState) {
  const nextState = cloneDiagramData(diagramState || createBlankDiagramState());
  if (!Array.isArray(nextState.nodes)) nextState.nodes = [];
  if (!Array.isArray(nextState.arrows)) nextState.arrows = [];
  if (!Array.isArray(nextState.canvasOrder)) nextState.canvasOrder = [];
  return nextState;
}

function makeDiagramRecord({ id = makeDiagramId(), title = 'Untitled diagram', subtitle = '', state: diagramState = null } = {}) {
  return {
    id,
    title: title || 'Untitled diagram',
    subtitle: subtitle || '',
    state: normalizeDiagramState(diagramState)
  };
}

function getDiagramById(id) {
  return (diagramDocument?.diagrams || []).find(diagram => diagram.id === id) || null;
}

function getActiveDiagramRecord() {
  return getDiagramById(activeDiagramId) || (diagramDocument?.diagrams || [])[0] || null;
}

function createDiagramDocumentFromPayload(data = {}) {
  if (Array.isArray(data.diagrams) && data.diagrams.length) {
    const diagrams = data.diagrams.map(diagram => makeDiagramRecord({
      id: diagram.id,
      title: diagram.title,
      subtitle: diagram.subtitle,
      state: diagram.state
    }));
    const ids = new Set(diagrams.map(diagram => diagram.id));
    const rootDiagramId = ids.has(data.rootDiagramId) ? data.rootDiagramId : diagrams[0].id;
    const nextActiveDiagramId = ids.has(data.activeDiagramId) ? data.activeDiagramId : rootDiagramId;
    return {
      version: DIAGRAM_DOCUMENT_VERSION,
      title: data.title || diagrams[0].title || 'System Map',
      subtitle: data.subtitle || diagrams[0].subtitle || '',
      rootDiagramId,
      activeDiagramId: nextActiveDiagramId,
      diagrams
    };
  }

  const legacyDiagram = makeDiagramRecord({
    id: data.activeDiagramId || data.rootDiagramId || 'diagram-main',
    title: data.title || 'System Map',
    subtitle: data.subtitle || 'Processes, platforms, and data flows',
    state: data.state
  });
  return {
    version: DIAGRAM_DOCUMENT_VERSION,
    title: legacyDiagram.title,
    subtitle: legacyDiagram.subtitle,
    rootDiagramId: legacyDiagram.id,
    activeDiagramId: legacyDiagram.id,
    diagrams: [legacyDiagram]
  };
}

function ensureDiagramDocument() {
  if (!diagramDocument) {
    diagramDocument = createDiagramDocumentFromPayload({
      title: getDiagramTitleInputValue(),
      subtitle: getDiagramSubtitleInputValue(),
      state
    });
    activeDiagramId = diagramDocument.activeDiagramId;
  }
  return diagramDocument;
}

function syncActiveDiagramFromCurrentState() {
  const doc = ensureDiagramDocument();
  const active = getActiveDiagramRecord();
  if (!active) return doc;
  if (typeof normalizeCanvasOrder === 'function') normalizeCanvasOrder();
  active.title = getDiagramTitleInputValue();
  active.subtitle = getDiagramSubtitleInputValue();
  active.state = cloneDiagramData(state);
  doc.activeDiagramId = active.id;
  activeDiagramId = active.id;
  return doc;
}

function applyDiagramRecordToCanvas(diagram) {
  state = normalizeDiagramState(diagram?.state);
  if (state.nodes.some(node => typeof node?.z !== 'number' || !Number.isFinite(node.z))) {
    normalizeNodeLayers(getSortedNodeLayerEntries());
  }
  if (state.arrows.some(arrow => typeof arrow?.z !== 'number' || !Number.isFinite(arrow.z))) {
    normalizeArrowLayers(getSortedArrowLayerEntries());
  }
  normalizeCanvasOrder();

  const titleInput = document.getElementById('diagram-title-input');
  const subtitleInput = document.getElementById('diagram-subtitle-input');
  if (titleInput) titleInput.value = diagram?.title || '';
  if (subtitleInput) subtitleInput.value = diagram?.subtitle || '';

  selectedNode = null;
  selectedArrow = null;
  refreshCountersFromState();
  updateDocumentPanelFromInputs();
}

function setDiagramDocumentFromPayload(data) {
  diagramDocument = createDiagramDocumentFromPayload(data);
  activeDiagramId = diagramDocument.activeDiagramId;
  diagramNavBackStack = [];
  diagramNavForwardStack = [];
  applyDiagramRecordToCanvas(getActiveDiagramRecord());
  return diagramDocument;
}

function getDiagramAncestors(diagramId = activeDiagramId) {
  const doc = ensureDiagramDocument();
  const path = [];
  const seen = new Set();
  let currentId = diagramId;
  while (currentId && !seen.has(currentId)) {
    const diagram = getDiagramById(currentId);
    if (!diagram) break;
    path.unshift(diagram);
    seen.add(currentId);
    const parent = doc.diagrams.find(candidate =>
      Array.isArray(candidate.state?.nodes)
      && candidate.state.nodes.some(node => node.linkedDiagramId === currentId)
    );
    currentId = parent?.id || '';
  }
  return path.length ? path : (getActiveDiagramRecord() ? [getActiveDiagramRecord()] : []);
}

function renderDiagramNavigation() {
  const bar = document.getElementById('diagram-nav');
  const crumbs = document.getElementById('diagram-breadcrumbs');
  const backBtn = document.getElementById('diagram-nav-back');
  const forwardBtn = document.getElementById('diagram-nav-forward');
  if (!bar || !crumbs || !backBtn || !forwardBtn) return;

  const doc = ensureDiagramDocument();
  bar.hidden = doc.diagrams.length <= 1 && activeDiagramId === doc.rootDiagramId;
  backBtn.disabled = diagramNavBackStack.length === 0;
  forwardBtn.disabled = diagramNavForwardStack.length === 0;
  crumbs.innerHTML = getDiagramAncestors().map((diagram, index, items) => {
    const isActive = diagram.id === activeDiagramId || index === items.length - 1;
    return `<button class="diagram-crumb${isActive ? ' active' : ''}" ${isActive ? 'disabled' : ''} onclick="navigateToDiagram('${diagram.id.replace(/'/g, "\\'")}')">${escapeHtml(diagram.title || 'Untitled diagram')}</button>`;
  }).join('<span class="diagram-crumb-sep">/</span>');
}

function navigateToDiagram(diagramId, { pushHistory = true } = {}) {
  const target = getDiagramById(diagramId);
  if (!target || target.id === activeDiagramId) {
    renderDiagramNavigation();
    return false;
  }
  syncActiveDiagramFromCurrentState();
  if (pushHistory && activeDiagramId) {
    diagramNavBackStack.push(activeDiagramId);
    diagramNavForwardStack = [];
  }
  activeDiagramId = target.id;
  diagramDocument.activeDiagramId = target.id;
  applyDiagramRecordToCanvas(target);
  clearHistoryStacks();
  render();
  saveToLocalStorage();
  return true;
}

function navigateDiagramBack() {
  const previousId = diagramNavBackStack.pop();
  if (!previousId) return false;
  if (activeDiagramId) diagramNavForwardStack.push(activeDiagramId);
  return navigateToDiagram(previousId, { pushHistory: false });
}

function navigateDiagramForward() {
  const nextId = diagramNavForwardStack.pop();
  if (!nextId) return false;
  if (activeDiagramId) diagramNavBackStack.push(activeDiagramId);
  return navigateToDiagram(nextId, { pushHistory: false });
}

function createLinkedDiagramForNode(nodeId) {
  const node = state.nodes.find(item => item.id === nodeId);
  if (!node) return false;
  ensureDiagramDocument();
  if (node.linkedDiagramId && getDiagramById(node.linkedDiagramId)) {
    return navigateToDiagram(node.linkedDiagramId);
  }

  const title = (node.title || node.tag || 'Linked diagram').replace(/\n/g, ' ').trim() || 'Linked diagram';
  const diagram = makeDiagramRecord({
    title,
    subtitle: '',
    state: createBlankDiagramState()
  });
  node.linkedDiagramId = diagram.id;
  syncActiveDiagramFromCurrentState();
  diagramDocument.diagrams.push(diagram);
  navigateToDiagram(diagram.id);
  setStatusModeMessage(`Created diagram "${title}"`, { fade: true, autoClearMs: 1800 });
  return true;
}

function openLinkedDiagramForNode(nodeId) {
  const node = state.nodes.find(item => item.id === nodeId);
  if (!node?.linkedDiagramId || !getDiagramById(node.linkedDiagramId)) return false;
  return navigateToDiagram(node.linkedDiagramId);
}

function getDiagramDocumentPayload({ currentOnly = false } = {}) {
  const doc = syncActiveDiagramFromCurrentState();
  const payload = cloneDiagramData(doc);
  payload.version = DIAGRAM_DOCUMENT_VERSION;
  payload.activeDiagramId = activeDiagramId;

  if (currentOnly) {
    const active = payload.diagrams.find(diagram => diagram.id === activeDiagramId) || payload.diagrams[0];
    const allowedIds = new Set(active ? [active.id] : []);
    if (active) {
      active.state.nodes = (active.state.nodes || []).map(node => {
        if (!node.linkedDiagramId || allowedIds.has(node.linkedDiagramId)) return node;
        const nextNode = { ...node };
        delete nextNode.linkedDiagramId;
        return nextNode;
      });
    }
    payload.diagrams = active ? [active] : [];
    payload.rootDiagramId = active?.id || '';
    payload.activeDiagramId = active?.id || '';
  }

  const activeDiagram = payload.diagrams.find(diagram => diagram.id === payload.activeDiagramId) || payload.diagrams[0];
  payload.title = activeDiagram?.title || payload.title || '';
  payload.subtitle = activeDiagram?.subtitle || payload.subtitle || '';
  payload.state = activeDiagram?.state || createBlankDiagramState();
  return payload;
}
