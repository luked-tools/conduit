// SHARED MOUSE INTERACTION COORDINATOR
function isNearNodeEdge(node, mx, my, actualH, margin = 20) {
  return (
    Math.abs(mx - node.x) <= margin ||
    Math.abs(mx - (node.x + node.w)) <= margin ||
    Math.abs(my - node.y) <= margin ||
    Math.abs(my - (node.y + actualH)) <= margin
  );
}

function getConnectedArrowIds(nodeId) {
  return state.arrows
    .filter(arrow => arrow.from === nodeId || arrow.to === nodeId)
    .map(arrow => arrow.id);
}

document.getElementById('canvas-wrap')?.addEventListener('mousedown', e => {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap) return;
  if (_nodeLayerTargetMode) return;
  if (_quickConnectMode) return;
  if (e.button === 1) {
    e.preventDefault();
    panDragging = true;
    panStart = { x: e.clientX - panX, y: e.clientY - panY };
    return;
  }
  if (wireActive) return;
  if (e.target === wrap || e.target.id === 'canvas' || e.target === arrowSVG) {
    deselect(e);
    panDragging = true;
    panStart = { x: e.clientX - panX, y: e.clientY - panY };
  }
});

document.getElementById('canvas-wrap')?.addEventListener('dblclick', e => {
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap) return;
  if (_nodeLayerTargetMode) return;
  if (_quickConnectMode) return;
  if (e.target !== wrap && e.target.id !== 'canvas' && e.target !== arrowSVG) return;
  if (wireActive) return;
  const rect = wrap.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left - panX) / scale;
  const canvasY = (e.clientY - rect.top - panY) / scale;
  addModeAt(lastNodeType, canvasX, canvasY);
});

window.addEventListener('mousemove', e => {
  if (panDragging) {
    panX = e.clientX - panStart.x;
    panY = e.clientY - panStart.y;
    applyTransform();
    if (typeof updateContextToolbar === 'function') updateContextToolbar();
    return;
  }
  if (draggingNode) {
    const n = state.nodes.find(x => x.id === draggingNode);
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    n.x = Math.round(((e.clientX - rect.left) / scale - panX / scale - dragOffset.x) / 10) * 10;
    n.y = Math.round(((e.clientY - rect.top) / scale - panY / scale - dragOffset.y) / 10) * 10;
    const el = document.getElementById(`node-${n.id}`);
    if (el) {
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
    }
    scheduleRenderArrows(getConnectedArrowIds(n.id));
    if (typeof updateContextToolbar === 'function') updateContextToolbar();
    return;
  }
  if (resizingNode) {
    const n = state.nodes.find(x => x.id === resizingNode);
    const dx = (e.clientX - resizeStart.mx) / scale;
    const dy = (e.clientY - resizeStart.my) / scale;
    const MIN_W = 100;
    const MIN_H = 60;
    const edge = resizeStart.edge || 'se';

    if (edge.includes('e')) {
      n.w = Math.max(MIN_W, resizeStart.w + dx);
    }
    if (edge.includes('s')) {
      n.h = Math.max(MIN_H, resizeStart.h + dy);
    }
    if (edge === 'w') {
      const nextW = Math.max(MIN_W, resizeStart.w - dx);
      n.x = resizeStart.x + (resizeStart.w - nextW);
      n.w = nextW;
    }
    if (edge === 'n') {
      const nextH = Math.max(MIN_H, resizeStart.h - dy);
      n.y = resizeStart.y + (resizeStart.h - nextH);
      n.h = nextH;
    }
    const el = document.getElementById(`node-${n.id}`);
    if (el) {
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.style.width = n.w + 'px';
      el.style.minHeight = n.h + 'px';
    }
    scheduleRenderArrows(getConnectedArrowIds(n.id));
    if (typeof updateContextToolbar === 'function') updateContextToolbar();
    return;
  }
  if (wireActive) {
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const mx = (e.clientX - rect.left - panX) / scale;
    const my = (e.clientY - rect.top - panY) / scale;

    const PORT_SNAP = 28;
    const NODE_MARGIN = 12;

    let snapNodeId = null;
    let snapPortPos = null;
    let snapOffset = null;
    let bestPortDist = Infinity;
    let bestEdgeCandidate = null;
    let bestEdgeDist = Infinity;

    function getActualPortXY(n, pos) {
      return getPortXYActual(n, pos);
    }

    state.nodes.forEach(n => {
      if (n.id === wireSrcId) return;
      if (n.type === 'boundary') return;
      ['n', 's', 'e', 'w'].forEach(pos => {
        const p = getActualPortXY(n, pos);
        const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
        if (d < PORT_SNAP && d < bestPortDist) {
          bestPortDist = d;
          snapNodeId = n.id;
          snapPortPos = pos;
          snapOffset = null;
        }
      });
    });

    let bestBoxDist = Infinity;
    state.nodes.forEach(n => {
      if (n.id === wireSrcId) return;
      const el = document.getElementById('node-' + n.id);
      const actualH = el ? el.offsetHeight : n.h;
      const inBox = mx >= n.x - NODE_MARGIN && mx <= n.x + n.w + NODE_MARGIN &&
                    my >= n.y - NODE_MARGIN && my <= n.y + actualH + NODE_MARGIN;
      if (!inBox) return;
      const nearEdge = isNearNodeEdge(n, mx, my, actualH);
      if (n.type === 'boundary' && !nearEdge) return;
      if (epDragActive || nearEdge) {
        const attachment = getNodeEdgeAttachment(n, mx, my, actualH);
        const p = getPortXY(n, attachment.pos, attachment.offset, actualH);
        const d = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
        if (d < bestEdgeDist) {
          bestEdgeDist = d;
          bestEdgeCandidate = {
            nodeId: n.id,
            pos: attachment.pos,
            offset: attachment.offset,
            isBoundary: n.type === 'boundary'
          };
        }
      } else if (!snapNodeId) {
        const cx = n.x + n.w / 2, cy = n.y + actualH / 2;
        const d = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
        if (d < bestBoxDist) {
          bestBoxDist = d;
          snapNodeId = n.id;
          snapPortPos = null;
          snapOffset = null;
        }
      }
    });

    if (bestEdgeCandidate && (bestPortDist === Infinity || bestEdgeCandidate.isBoundary || bestEdgeDist <= bestPortDist)) {
      snapNodeId = bestEdgeCandidate.nodeId;
      snapPortPos = bestEdgeCandidate.pos;
      snapOffset = bestEdgeCandidate.offset;
    }

    if (snapNodeId !== wireTargetId || snapPortPos !== wireTargetPos || snapOffset !== wireTargetOffset) {
      document.querySelectorAll('.node.connect-target').forEach(el => el.classList.remove('connect-target'));
      if (wireTargetId) {
        const oldEl = document.getElementById('node-' + wireTargetId);
        if (oldEl) oldEl.querySelectorAll('.conn-point').forEach(cp => cp.classList.remove('snap-target'));
      }
      wireTargetId = snapNodeId;
      wireTargetPos = snapPortPos;
      wireTargetOffset = snapOffset;
      if (wireTargetId) {
        const el = document.getElementById('node-' + wireTargetId);
        if (el) {
          el.classList.add('connect-target');
          if (wireTargetPos && wireTargetOffset === null) {
            el.querySelectorAll('.conn-point').forEach(cp => {
              cp.classList.toggle('snap-target', cp.dataset.pos === wireTargetPos);
            });
          }
        }
      }
    }

    if (wireTargetId) {
      const targetNode = state.nodes.find(n => n.id === wireTargetId);
      if (targetNode) showConnectTargetTooltip(e, targetNode);
      else hideConnectTargetTooltip();
    } else {
      hideConnectTargetTooltip();
    }

    updateWirePreview(mx, my);
  }
});

window.addEventListener('mouseup', e => {
  const wasPanning = panDragging;
  panDragging = false;
  const wasDragging = draggingNode;
  const wasResizing = resizingNode;
  draggingNode = null;
  resizingNode = null;

  if (epDragActive) {
    completeEndpointDrag();
  } else if (wireActive) {
    completeWire();
  } else if (wasPanning) {
    scheduleSaveToLocalStorage();
  } else if (wasDragging || wasResizing) {
    scheduleSaveToLocalStorage();
  }
  if (typeof flushDeferredChromeRefresh === 'function') flushDeferredChromeRefresh();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
});
