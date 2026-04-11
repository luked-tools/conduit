// KEYBOARD COORDINATOR
document.addEventListener('keydown', e => {
  const inTextField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
    || e.target.isContentEditable;

  if (!inTextField && (e.key === 'Delete' || e.key === 'Backspace') && getCanvasSelectionCount()) {
    deleteSelected();
  }

  if (!inTextField && e.key === 'Escape') {
    if (wireActive) cancelWire();
    if (_brushActive) { cancelStyleBrush(); return; }
    if (_nodeLayerTargetMode) { cancelNodeLayerTargetMode(); return; }
    if (_quickConnectMode) { cancelQuickConnectMode(); return; }
    closeAppearancePanel();
    deselect();
  }

  if (!inTextField && (e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
  if (!inTextField && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'y') {
    e.preventDefault();
    redo();
  }

  if (!inTextField && (e.ctrlKey || e.metaKey) && e.key === 'c' && getCanvasSelectionCount()) {
    copySelectedNode();
  }

  if (!inTextField && (e.ctrlKey || e.metaKey) && e.key === 'v' && _clipboardNode) {
    e.preventDefault();
    pasteNode();
  }
});

function deleteSelected({ deleteLinkedDiagram = false, skipLinkedPrompt = false } = {}) {
  const selection = getSelectedCanvasObjects();
  if (!selection.length) return;
  const selectedNodes = selection
    .filter(entry => entry.kind === 'node')
    .map(entry => state.nodes.find(n => n.id === entry.id))
    .filter(Boolean);
  const linkedDiagrams = [...new Map(selectedNodes
    .map(node => [node.linkedDiagramId, node.linkedDiagramId && typeof getDiagramById === 'function' ? getDiagramById(node.linkedDiagramId) : null])
    .filter(([, diagram]) => !!diagram)).values()];
  if (!skipLinkedPrompt && linkedDiagrams.length) {
    if (selection.length === 1 && selectedNodes.length === 1) {
      const node = selectedNodes[0];
      const linkedDiagram = linkedDiagrams[0];
      openBasicModal({
        title: 'Delete linked node',
        body: `<div class="draft-modal-note"><b>${escapeHtml(node.title || node.tag || 'This node')}</b> links to <b>${escapeHtml(linkedDiagram.title || 'Untitled diagram')}</b>. Delete just the node, or delete the linked diagram too?</div>`,
        buttons: [
          { label: 'Cancel', className: 'tb-btn' },
          { label: 'Delete node only', className: 'tb-btn', onClick: () => deleteSelected({ skipLinkedPrompt: true }) },
          { label: 'Delete node and diagram', className: 'tb-btn danger', onClick: () => deleteSelected({ deleteLinkedDiagram: true, skipLinkedPrompt: true }) }
        ]
      });
      return;
    }
    openBasicModal({
      title: 'Delete selected items',
      body: `<div class="draft-modal-note">${selectedNodes.length} selected node(s) link to ${linkedDiagrams.length} diagram(s). Delete the selected items only, or delete those linked diagrams too?</div>`,
      buttons: [
        { label: 'Cancel', className: 'tb-btn' },
        { label: 'Delete selected items only', className: 'tb-btn', onClick: () => deleteSelected({ skipLinkedPrompt: true }) },
        { label: 'Delete items and diagrams', className: 'tb-btn danger', onClick: () => deleteSelected({ deleteLinkedDiagram: true, skipLinkedPrompt: true }) }
      ]
    });
    return;
  }
  pushUndo();
  const nodeIds = new Set(selection.filter(entry => entry.kind === 'node').map(entry => entry.id));
  const arrowIds = new Set(selection.filter(entry => entry.kind === 'arrow').map(entry => entry.id));
  const labelIds = new Set(selection.filter(entry => entry.kind === 'label').map(entry => entry.id));
  const iconIds = new Set(selection.filter(entry => entry.kind === 'icon').map(entry => entry.id));
  if (nodeIds.size) {
    state.arrows = state.arrows.filter(a => !nodeIds.has(a.from) && !nodeIds.has(a.to));
  }
  state.arrows = state.arrows.filter(a => !arrowIds.has(a.id));
  state.nodes = state.nodes.filter(n => !nodeIds.has(n.id));
  state.labels = state.labels.filter(label => !labelIds.has(label.id));
  state.icons = state.icons.filter(icon => !iconIds.has(icon.id));
  replaceCanvasSelection([], null);
  normalizeCanvasOrder();
  if (deleteLinkedDiagram && linkedDiagrams.length) {
    syncActiveDiagramFromCurrentState();
    linkedDiagrams.forEach(diagram => deleteDiagramRecordById(diagram.id, { fallbackId: activeDiagramId }));
  }
  render();
  saveToLocalStorage();
}

function copySelectedNode() {
  const selection = getSelectedCanvasObjects();
  if (!selection.length) return;
  _clipboardNode = {
    kind: selection.length === 1 ? selection[0].kind : 'multi',
    items: selection.map(entry => ({
      kind: entry.kind,
      data: JSON.parse(JSON.stringify(getCanvasObjectByEntry(entry)))
    })).filter(entry => !!entry.data)
  };
  setStatusModeMessage('\u2398 Copied \u2014 Ctrl+V to paste', { fade: true, autoClearMs: 1800 });
}

function pasteNode() {
  if (!_clipboardNode?.items?.length) return;
  pushUndo();
  const OFFSET = 30;
  const idMap = new Map();
  const newSelection = [];
  _clipboardNode.items.filter(item => item.kind === 'node').forEach(item => {
    const src = item.data;
    const id = nextNodeId();
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id,
      x: src.x + OFFSET,
      y: src.y + OFFSET,
      z: Number.MAX_SAFE_INTEGER,
    };
    if (copy.tag && copy.type !== 'boundary') copy.tag = nextNodeTag(copy.type);
    state.nodes.push(copy);
    appendCanvasOrderEntry('node', id);
    idMap.set(src.id, id);
    newSelection.push(makeCanvasSelectionEntry('node', id));
  });
  _clipboardNode.items.filter(item => item.kind === 'label').forEach(item => {
    const src = item.data;
    const id = nextLabelId();
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id,
      x: src.x + OFFSET,
      y: src.y + OFFSET,
      z: Number.MAX_SAFE_INTEGER,
    };
    state.labels.push(copy);
    appendCanvasOrderEntry('label', id);
    newSelection.push(makeCanvasSelectionEntry('label', id));
  });
  _clipboardNode.items.filter(item => item.kind === 'icon').forEach(item => {
    const src = item.data;
    const id = nextIconId();
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id,
      x: src.x + OFFSET,
      y: src.y + OFFSET,
      z: Number.MAX_SAFE_INTEGER,
    };
    state.icons.push(copy);
    appendCanvasOrderEntry('icon', id);
    newSelection.push(makeCanvasSelectionEntry('icon', id));
  });
  _clipboardNode.items.filter(item => item.kind === 'arrow').forEach(item => {
    const src = item.data;
    const id = nextArrowId();
    const copy = {
      ...JSON.parse(JSON.stringify(src)),
      id,
      from: idMap.get(src.from) || src.from,
      to: idMap.get(src.to) || src.to,
      z: Number.MAX_SAFE_INTEGER,
      labelOffsetX: (src.labelOffsetX || 0) + OFFSET,
      labelOffsetY: (src.labelOffsetY || 0) + OFFSET
    };
    state.arrows.push(copy);
    appendCanvasOrderEntry('arrow', id);
    newSelection.push(makeCanvasSelectionEntry('arrow', id));
  });
  normalizeCanvasOrder();
  render();
  replaceCanvasSelection(newSelection, newSelection[newSelection.length - 1] || null);
  _clipboardNode = {
    kind: newSelection.length === 1 ? newSelection[0].kind : 'multi',
    items: newSelection.map(entry => ({
      kind: entry.kind,
      data: JSON.parse(JSON.stringify(getCanvasObjectByEntry(entry)))
    }))
  };
  saveToLocalStorage();
}
