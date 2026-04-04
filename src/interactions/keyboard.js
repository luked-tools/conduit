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

function deleteSelected() {
  if (selectedNode) {
    pushUndo();
    state.arrows = state.arrows.filter(a => a.from !== selectedNode && a.to !== selectedNode);
    state.nodes = state.nodes.filter(n => n.id !== selectedNode);
    selectedNode = null;
  } else if (selectedArrow) {
    pushUndo();
    state.arrows = state.arrows.filter(a => a.id !== selectedArrow);
    selectedArrow = null;
  }
  render();
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
  render();
  selectNode(id);
  _clipboardNode = JSON.parse(JSON.stringify(copy));
}
