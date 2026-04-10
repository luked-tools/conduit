// DRAG / RESIZE START HELPERS
function getMovableCanvasSelectionEntries(sourceKind, sourceId) {
  const selectedEntries = getSelectedCanvasObjects();
  const includesSource = selectedEntries.some(entry => entry.kind === sourceKind && entry.id === sourceId);
  const base = includesSource ? selectedEntries : [makeCanvasSelectionEntry(sourceKind, sourceId)];
  return base.filter(entry => entry.kind === 'node' || entry.kind === 'label' || entry.kind === 'icon');
}

function startSelectionDragSession(e, sourceKind, sourceId) {
  e.preventDefault();
  const entries = getMovableCanvasSelectionEntries(sourceKind, sourceId);
  if (!entries.length) return;
  pushUndo();
  const rect = canvasWrap.getBoundingClientRect();
  const pointerX = (e.clientX - rect.left - panX) / scale;
  const pointerY = (e.clientY - rect.top - panY) / scale;
  draggingSelection = {
    sourceKind,
    sourceId,
    startPointerX: pointerX,
    startPointerY: pointerY,
    entries: entries.map(entry => {
      const object = getCanvasObjectByEntry(entry);
      return object ? {
        kind: entry.kind,
        id: entry.id,
        x: object.x,
        y: object.y
      } : null;
    }).filter(Boolean)
  };
}

function startDrag(e, id) {
  startSelectionDragSession(e, 'node', id);
}

function startResize(e, id, edge = 'se') {
  e.preventDefault();
  e.stopPropagation();
  pushUndo();
  const n = state.nodes.find(x => x.id === id);
  resizingNode = id;
  resizeStart = { mx: e.clientX, my: e.clientY, x: n.x, y: n.y, w: n.w, h: n.h, edge };
}
