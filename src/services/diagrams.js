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
  return { nodes: [], arrows: [], labels: [], icons: [], canvasOrder: [] };
}

function createDefaultDiagramViewport() {
  return { scale: 1, panX: 60, panY: 40 };
}

function normalizeDiagramState(diagramState) {
  const nextState = cloneDiagramData(diagramState || createBlankDiagramState());
  if (!Array.isArray(nextState.nodes)) nextState.nodes = [];
  if (!Array.isArray(nextState.arrows)) nextState.arrows = [];
  if (!Array.isArray(nextState.labels)) nextState.labels = [];
  if (!Array.isArray(nextState.icons)) nextState.icons = [];
  if (!Array.isArray(nextState.canvasOrder)) nextState.canvasOrder = [];
  nextState.labels = nextState.labels.map(label => ({
    ...label,
    backgroundStyle: label?.backgroundStyle === 'soft' ? 'fill' : (label?.backgroundStyle || 'none'),
    fillColor: typeof label?.fillColor === 'string' ? label.fillColor : ''
  }));
  nextState.icons = nextState.icons.map(icon => ({
    ...icon,
    backgroundStyle: icon?.backgroundStyle === 'soft' ? 'fill' : (icon?.backgroundStyle || 'none'),
    fillColor: typeof icon?.fillColor === 'string' ? icon.fillColor : ''
  }));
  return nextState;
}

function normalizeDiagramViewport(viewport) {
  const base = createDefaultDiagramViewport();
  if (!viewport || typeof viewport !== 'object') return base;
  const nextScale = Number.isFinite(viewport.scale) ? viewport.scale : base.scale;
  const nextPanX = Number.isFinite(viewport.panX) ? viewport.panX : base.panX;
  const nextPanY = Number.isFinite(viewport.panY) ? viewport.panY : base.panY;
  return { scale: nextScale, panX: nextPanX, panY: nextPanY };
}

function makeDiagramRecord({ id = makeDiagramId(), title = 'Untitled diagram', subtitle = '', state: diagramState = null, viewport = null } = {}) {
  return {
    id,
    title: title || 'Untitled diagram',
    subtitle: subtitle || '',
    state: normalizeDiagramState(diagramState),
    viewport: normalizeDiagramViewport(viewport)
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
      state: diagram.state,
      viewport: diagram.viewport
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
    state: data.state,
    viewport: data.viewport
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
  active.viewport = normalizeDiagramViewport({ scale, panX, panY });
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
  selectedLabel = null;
  selectedIcon = null;
  const viewport = normalizeDiagramViewport(diagram?.viewport);
  scale = viewport.scale;
  panX = viewport.panX;
  panY = viewport.panY;
  if (typeof applyTransform === 'function') applyTransform();
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

function getDiagramInboundLinkCount(diagramId) {
  const doc = ensureDiagramDocument();
  return doc.diagrams.reduce((sum, diagram) => {
    return sum + (diagram.state?.nodes || []).filter(node => node.linkedDiagramId === diagramId).length;
  }, 0);
}

function formatDiagramRelationshipMeta(diagramId) {
  const inboundCount = getDiagramInboundLinkCount(diagramId);
  return `Linked from ${inboundCount} node${inboundCount === 1 ? '' : 's'}`;
}

function getDiagramDisplayTitle(diagram) {
  return diagram?.title || 'Untitled diagram';
}

function getDiagramCanvasStats(diagram) {
  return {
    nodeCount: Array.isArray(diagram?.state?.nodes) ? diagram.state.nodes.length + (Array.isArray(diagram?.state?.labels) ? diagram.state.labels.length : 0) + (Array.isArray(diagram?.state?.icons) ? diagram.state.icons.length : 0) : 0,
    arrowCount: Array.isArray(diagram?.state?.arrows) ? diagram.state.arrows.length : 0
  };
}

function getDiagramSummaryMeta(diagram) {
  const { nodeCount, arrowCount } = getDiagramCanvasStats(diagram);
  return `${nodeCount} items &middot; ${arrowCount} connections &middot; ${formatDiagramRelationshipMeta(diagram.id)}`;
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
  setStatusModeMessage(`Opened diagram "${target.title || 'Untitled diagram'}"`, { fade: true, autoClearMs: 1400 });
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

function unlinkDiagramFromNode(nodeId) {
  const node = state.nodes.find(item => item.id === nodeId);
  if (!node?.linkedDiagramId) return false;
  const linkedDiagram = getDiagramById(node.linkedDiagramId);
  openBasicModal({
    title: 'Unlink diagram',
    body: `<div class="draft-modal-note">Remove the link from <b>${escapeHtml(node.title || node.tag || 'this node')}</b> to <b>${escapeHtml(linkedDiagram?.title || 'Untitled diagram')}</b>? The linked diagram will be kept.</div>`,
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      {
        label: 'Unlink diagram',
        className: 'tb-btn danger',
        onClick: () => {
          delete node.linkedDiagramId;
          syncActiveDiagramFromCurrentState();
          renderSidebar();
          renderNodes();
          if (typeof renderLayersPanel === 'function') renderLayersPanel();
          saveToLocalStorage();
          setStatusModeMessage('Diagram link removed', { fade: true, autoClearMs: 1500 });
        }
      }
    ]
  });
  return true;
}

function linkNodeToDiagram(nodeId, diagramId) {
  const node = state.nodes.find(item => item.id === nodeId);
  const diagram = getDiagramById(diagramId);
  if (!node || !diagram || diagram.id === activeDiagramId) return false;
  node.linkedDiagramId = diagram.id;
  syncActiveDiagramFromCurrentState();
  renderSidebar();
  renderNodes();
  saveToLocalStorage();
  setStatusModeMessage(`Linked diagram "${diagram.title || 'Untitled diagram'}"`, { fade: true, autoClearMs: 1800 });
  return true;
}

function removeLinksToDiagram(diagramId) {
  const doc = ensureDiagramDocument();
  doc.diagrams.forEach(diagram => {
    (diagram.state?.nodes || []).forEach(node => {
      if (node.linkedDiagramId === diagramId) delete node.linkedDiagramId;
    });
  });
}

function deleteDiagramRecordById(diagramId, { fallbackId = '' } = {}) {
  const doc = ensureDiagramDocument();
  const diagram = getDiagramById(diagramId);
  if (!diagram || doc.diagrams.length <= 1) return false;

  removeLinksToDiagram(diagramId);
  doc.diagrams = doc.diagrams.filter(item => item.id !== diagramId);
  if (doc.rootDiagramId === diagramId) doc.rootDiagramId = doc.diagrams[0]?.id || '';
  diagramNavBackStack = diagramNavBackStack.filter(id => id !== diagramId);
  diagramNavForwardStack = diagramNavForwardStack.filter(id => id !== diagramId);

  if (activeDiagramId === diagramId) {
    const nextId = (fallbackId && getDiagramById(fallbackId) && fallbackId)
      || diagramNavBackStack.pop()
      || doc.rootDiagramId
      || doc.diagrams[0]?.id
      || '';
    activeDiagramId = nextId;
    doc.activeDiagramId = nextId;
    applyDiagramRecordToCanvas(getActiveDiagramRecord());
    clearHistoryStacks();
  } else {
    doc.activeDiagramId = activeDiagramId;
    applyDiagramRecordToCanvas(getActiveDiagramRecord());
  }
  return true;
}

function setRootDiagram(diagramId) {
  const doc = ensureDiagramDocument();
  const diagram = getDiagramById(diagramId);
  if (!diagram || diagram.id === doc.rootDiagramId) return false;
  syncActiveDiagramFromCurrentState();
  doc.rootDiagramId = diagram.id;
  saveToLocalStorage();
  renderDiagramNavigation();
  renderDiagramManagerBody();
  setStatusModeMessage(`Root diagram set to "${diagram.title || 'Untitled diagram'}"`, { fade: true, autoClearMs: 1800 });
  return true;
}

function openDiagramNameModal({ title, initialValue, confirmLabel, onConfirm }) {
  openBasicModal({
    title,
    body: `<div class="draft-modal-note">Choose a diagram title.</div><input id="diagram-name-input" class="draft-name-input" type="text" value="${escapeHtml(initialValue || '')}" placeholder="Diagram title">`,
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      {
        label: confirmLabel,
        className: 'tb-btn primary',
        onClick: () => {
          const input = document.getElementById('diagram-name-input');
          onConfirm((input?.value || initialValue || 'Untitled diagram').trim() || 'Untitled diagram');
        }
      }
    ]
  });
  requestAnimationFrame(() => {
    const input = document.getElementById('diagram-name-input');
    if (!input) return;
    input.focus();
    input.select();
    input.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('#modal-btns .tb-btn.primary')?.click();
      }
    };
  });
}

function renderDiagramManagerBody() {
  const host = document.getElementById('diagram-manager-body');
  if (!host) return;
  const doc = ensureDiagramDocument();
  const introNote = doc.diagrams.length <= 1
    ? `<div class="draft-warning-note">This draft currently has one diagram. Select a node or boundary and create or link a deeper diagram when you need another level.</div>`
    : `<div class="draft-modal-note">Each diagram belongs to this draft. Linked diagrams can be reused from multiple nodes, and diagram actions save immediately outside canvas undo.</div>`;
  host.innerHTML = `${introNote}<div class="draft-list">${
    doc.diagrams.map(diagram => {
      const isActive = diagram.id === activeDiagramId;
      const isRoot = diagram.id === doc.rootDiagramId;
      return `<div class="draft-row${isActive ? ' active' : ''}" data-diagram-id="${escapeHtml(diagram.id)}">
        <div class="draft-row-main">
          <div class="draft-row-title">
            <span class="draft-row-title-text">${escapeHtml(getDiagramDisplayTitle(diagram))}</span>
            ${isRoot ? '<span class="draft-active-badge">Root</span>' : ''}
            ${isActive ? '<span class="draft-active-badge">Active</span>' : ''}
          </div>
          <div class="draft-row-meta">${getDiagramSummaryMeta(diagram)}</div>
        </div>
        <div class="draft-row-actions">
          ${isActive ? '' : `<button class="tb-btn" data-action="open" data-diagram-id="${escapeHtml(diagram.id)}">Open</button>`}
          ${isRoot ? '' : `<button class="tb-btn" data-action="set-root" data-diagram-id="${escapeHtml(diagram.id)}">Set as root</button>`}
          <button class="tb-btn" data-action="rename" data-diagram-id="${escapeHtml(diagram.id)}">Rename</button>
          ${doc.diagrams.length <= 1 ? '' : `<button class="tb-btn danger" data-action="delete" data-diagram-id="${escapeHtml(diagram.id)}">Delete</button>`}
        </div>
      </div>`;
    }).join('')
  }</div>`;

  host.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.diagramId;
      const action = btn.dataset.action;
      if (action === 'open') {
        closeBasicModal();
        navigateToDiagram(id);
      } else if (action === 'set-root') {
        setRootDiagram(id);
      } else if (action === 'rename') {
        renameDiagramById(id);
      } else if (action === 'delete') {
        deleteDiagramById(id);
      }
    });
  });
}

function openDiagramManager() {
  syncActiveDiagramFromCurrentState();
  openBasicModal({
    title: 'Diagrams',
    body: '<div class="draft-modal-note">Manage the diagrams inside this draft. Diagram actions save immediately and stay separate from canvas undo.</div><div id="diagram-manager-body"></div>',
    buttons: [
      { label: 'Close', className: 'tb-btn' }
    ]
  });
  renderDiagramManagerBody();
}

function renameDiagramById(diagramId) {
  const diagram = getDiagramById(diagramId);
  if (!diagram) return;
  openDiagramNameModal({
    title: 'Rename diagram',
    initialValue: getDiagramDisplayTitle(diagram),
    confirmLabel: 'Save title',
    onConfirm: value => {
      diagram.title = value;
      if (diagram.id === activeDiagramId) {
        const titleInput = document.getElementById('diagram-title-input');
        if (titleInput) titleInput.value = value;
        updateDocumentPanelFromInputs();
      }
      saveToLocalStorage();
      openDiagramManager();
      renderDiagramNavigation();
      setStatusModeMessage(`Renamed diagram to "${value}"`, { fade: true, autoClearMs: 1800 });
    }
  });
}

function deleteDiagramById(diagramId) {
  const doc = ensureDiagramDocument();
  const diagram = getDiagramById(diagramId);
  if (!diagram || doc.diagrams.length <= 1) return;
  syncActiveDiagramFromCurrentState();
  openBasicModal({
    title: 'Delete diagram',
    body: `<div class="draft-modal-note">Delete <b>${escapeHtml(getDiagramDisplayTitle(diagram))}</b>? Links to this diagram will be removed from any nodes that reference it.</div>`,
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      {
        label: 'Delete diagram',
        className: 'tb-btn danger',
        onClick: () => {
          deleteDiagramRecordById(diagramId);
          render();
          saveToLocalStorage();
          setStatusModeMessage('Diagram deleted', { fade: true, autoClearMs: 1600 });
        }
      }
    ]
  });
}

function openDiagramLinkPickerForNode(nodeId) {
  const node = state.nodes.find(item => item.id === nodeId);
  if (!node) return;
  syncActiveDiagramFromCurrentState();
  const candidates = ensureDiagramDocument().diagrams.filter(diagram => diagram.id !== activeDiagramId);
  if (!candidates.length) {
    setStatusModeMessage('No other diagrams in this draft yet', { fade: true, autoClearMs: 1800 });
    return;
  }
  openBasicModal({
    title: 'Link diagram',
    body: `<div class="draft-modal-note">Choose a linked diagram for <b>${escapeHtml(node.title || node.tag || 'this node')}</b> inside this draft.</div><div id="diagram-link-picker" class="draft-list">${
      candidates.map(diagram => {
        const isLinked = node.linkedDiagramId === diagram.id;
        const isRoot = diagram.id === ensureDiagramDocument().rootDiagramId;
        const isActive = diagram.id === activeDiagramId;
        return `<button class="diagram-link-option${isLinked ? ' active' : ''}" data-diagram-id="${escapeHtml(diagram.id)}">
          <div class="diagram-link-option-main">
            <div class="diagram-link-option-title">
              <span class="diagram-link-option-title-text">${escapeHtml(getDiagramDisplayTitle(diagram))}</span>
              ${isLinked ? '<span class="draft-active-badge">Linked</span>' : ''}
              ${isRoot ? '<span class="draft-active-badge">Root</span>' : ''}
              ${isActive ? '<span class="draft-active-badge">Current</span>' : ''}
            </div>
            <div class="diagram-link-option-meta">${getDiagramSummaryMeta(diagram)}</div>
          </div>
          <span class="diagram-link-option-action">${isLinked ? 'Linked' : 'Link'}</span>
        </button>`;
      }).join('')
    }</div>`,
    buttons: [
      { label: 'Cancel', className: 'tb-btn' }
    ]
  });
  document.querySelectorAll('#diagram-link-picker .diagram-link-option').forEach(btn => {
    btn.addEventListener('click', () => {
      closeBasicModal();
      linkNodeToDiagram(nodeId, btn.dataset.diagramId);
    });
  });
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
