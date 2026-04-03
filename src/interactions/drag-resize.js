// DRAG / RESIZE START HELPERS
function startDrag(e, id) {
  e.preventDefault();
  pushUndo();
  const n = state.nodes.find(x => x.id === id);
  draggingNode = id;
  const rect = canvasWrap.getBoundingClientRect();
  dragOffset.x = (e.clientX - rect.left) / scale - panX / scale - n.x;
  dragOffset.y = (e.clientY - rect.top) / scale - panY / scale - n.y;
}

function startResize(e, id, edge = 'se') {
  e.preventDefault();
  e.stopPropagation();
  pushUndo();
  const n = state.nodes.find(x => x.id === id);
  resizingNode = id;
  resizeStart = { mx: e.clientX, my: e.clientY, x: n.x, y: n.y, w: n.w, h: n.h, edge };
}
