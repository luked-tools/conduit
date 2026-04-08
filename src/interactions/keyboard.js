// KEYBOARD COORDINATOR
document.addEventListener('keydown', e => {
  const inTextField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
    || e.target.isContentEditable;

  if (!inTextField && (e.key === 'Delete' || e.key === 'Backspace') && (selectedNode || selectedArrow)) {
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

  if (!inTextField && (e.ctrlKey || e.metaKey) && e.key === 'c' && selectedNode) {
    copySelectedNode();
  }

  if (!inTextField && (e.ctrlKey || e.metaKey) && e.key === 'v' && _clipboardNode) {
    e.preventDefault();
    pasteNode();
  }
});

function deleteSelected({ deleteLinkedDiagram = false, skipLinkedPrompt = false } = {}) {
  if (selectedNode) {
    const nodeId = selectedNode;
    const node = state.nodes.find(n => n.id === nodeId);
    const linkedDiagramId = node?.linkedDiagramId;
    const linkedDiagram = linkedDiagramId && typeof getDiagramById === 'function'
      ? getDiagramById(linkedDiagramId)
      : null;
    if (!skipLinkedPrompt && linkedDiagram) {
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
    pushUndo();
    state.arrows = state.arrows.filter(a => a.from !== nodeId && a.to !== nodeId);
    state.nodes = state.nodes.filter(n => n.id !== nodeId);
    selectedNode = null;
    normalizeCanvasOrder();
    if (deleteLinkedDiagram && linkedDiagram) {
      syncActiveDiagramFromCurrentState();
      deleteDiagramRecordById(linkedDiagram.id, { fallbackId: activeDiagramId });
    }
  } else if (selectedArrow) {
    pushUndo();
    state.arrows = state.arrows.filter(a => a.id !== selectedArrow);
    selectedArrow = null;
    normalizeCanvasOrder();
  }
  render();
  saveToLocalStorage();
}

function copySelectedNode() {
  if (!selectedNode) return;
  const n = state.nodes.find(x => x.id === selectedNode);
  if (!n) return;
  _clipboardNode = JSON.parse(JSON.stringify(n));
  setStatusModeMessage('\u2398 Copied \u2014 Ctrl+V to paste', { fade: true, autoClearMs: 1800 });
}

function pasteNode() {
  if (!_clipboardNode) return;
  pushUndo();
  const src = _clipboardNode;
  const id = nextNodeId();
  const OFFSET = 30;
  const copy = {
    ...JSON.parse(JSON.stringify(src)),
    id,
    x: src.x + OFFSET,
    y: src.y + OFFSET,
    z: Number.MAX_SAFE_INTEGER,
  };
  if (copy.tag && copy.type !== 'boundary') {
    copy.tag = nextNodeTag(copy.type);
  }
  state.nodes.push(copy);
  normalizeNodeLayers();
  appendCanvasOrderEntry('node', id);
  render();
  selectNode(id);
  _clipboardNode = JSON.parse(JSON.stringify(copy));
  saveToLocalStorage();
}
