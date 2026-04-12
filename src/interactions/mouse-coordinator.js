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

function getMarqueeOverlay() {
  let overlay = document.getElementById('marquee-selection');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'marquee-selection';
    overlay.className = 'marquee-selection';
    canvasWrap.appendChild(overlay);
  }
  return overlay;
}

function updateMarqueeOverlay(rect) {
  const overlay = getMarqueeOverlay();
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.classList.add('active');
}

function hideMarqueeOverlay() {
  const overlay = document.getElementById('marquee-selection');
  if (!overlay) return;
  overlay.classList.remove('active');
}

function getMarqueeRectFromEvent(event) {
  const wrapRect = canvasWrap.getBoundingClientRect();
  const startX = marqueeSelection.startClientX - wrapRect.left;
  const startY = marqueeSelection.startClientY - wrapRect.top;
  const currentX = event.clientX - wrapRect.left;
  const currentY = event.clientY - wrapRect.top;
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function rectsIntersect(a, b) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

function isPointInsideRect(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function getMarqueeElementForEntry(entry) {
  if (entry.kind === 'node') return document.getElementById(`node-${entry.id}`);
  if (entry.kind === 'label') return document.getElementById(`label-${entry.id}`);
  if (entry.kind === 'icon') return document.getElementById(`icon-${entry.id}`);
  if (entry.kind === 'arrow') {
    const arrowObject = typeof _arrowObjectRegistry !== 'undefined' ? _arrowObjectRegistry.get(entry.id) : null;
    return arrowObject?._refs?.path || document.querySelector(`.arrow-object[data-arrow-id="${entry.id}"] .arrow-path`);
  }
  return null;
}

function getLocalRectForElement(element) {
  if (!element || !canvasWrap) return null;
  const wrapRect = canvasWrap.getBoundingClientRect();

  if (typeof SVGGraphicsElement !== 'undefined' && element instanceof SVGGraphicsElement && typeof element.getBBox === 'function') {
    try {
      const bbox = element.getBBox();
      const matrix = typeof element.getScreenCTM === 'function' ? element.getScreenCTM() : null;
      if (matrix && Number.isFinite(bbox.x) && Number.isFinite(bbox.y) && Number.isFinite(bbox.width) && Number.isFinite(bbox.height)) {
        const points = [
          new DOMPoint(bbox.x, bbox.y),
          new DOMPoint(bbox.x + bbox.width, bbox.y),
          new DOMPoint(bbox.x, bbox.y + bbox.height),
          new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height)
        ].map(point => point.matrixTransform(matrix));
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        return {
          left: Math.min(...xs) - wrapRect.left,
          top: Math.min(...ys) - wrapRect.top,
          right: Math.max(...xs) - wrapRect.left,
          bottom: Math.max(...ys) - wrapRect.top
        };
      }
    } catch (e) {
      // Fall back to DOM bounds if the SVG geometry box is unavailable.
    }
  }

  const elRect = element.getBoundingClientRect();
  return {
    left: elRect.left - wrapRect.left,
    top: elRect.top - wrapRect.top,
    right: elRect.right - wrapRect.left,
    bottom: elRect.bottom - wrapRect.top
  };
}

function doesArrowPathMeaningfullyIntersectRect(path, rect) {
  if (!path || !canvasWrap || typeof path.getTotalLength !== 'function') return false;
  const wrapRect = canvasWrap.getBoundingClientRect();
  const matrix = typeof path.getScreenCTM === 'function' ? path.getScreenCTM() : null;
  if (!matrix) return false;

  let totalLength = 0;
  try {
    totalLength = path.getTotalLength();
  } catch (e) {
    return false;
  }
  if (!Number.isFinite(totalLength) || totalLength <= 0) return false;

  const sampleStep = 4;
  const samples = Math.max(2, Math.ceil(totalLength / sampleStep));
  let previousLocalPoint = null;
  let previousInside = false;
  let currentInsideRun = 0;
  let longestInsideRun = 0;
  let totalInsideLength = 0;

  for (let index = 0; index <= samples; index += 1) {
    const length = totalLength * (index / samples);
    const point = path.getPointAtLength(length);
    const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(matrix);
    const localPoint = {
      x: screenPoint.x - wrapRect.left,
      y: screenPoint.y - wrapRect.top
    };
    const inside = isPointInsideRect(rect, localPoint.x, localPoint.y);

    if (previousLocalPoint) {
      const segmentLength = Math.hypot(localPoint.x - previousLocalPoint.x, localPoint.y - previousLocalPoint.y);
      if (inside && previousInside) {
        currentInsideRun += segmentLength;
        totalInsideLength += segmentLength;
      } else if (inside) {
        currentInsideRun = segmentLength;
        totalInsideLength += segmentLength;
      } else {
        currentInsideRun = 0;
      }
      if (currentInsideRun > longestInsideRun) longestInsideRun = currentInsideRun;
    }

    previousLocalPoint = localPoint;
    previousInside = inside;
  }

  return longestInsideRun >= 10 || totalInsideLength >= 14;
}

function collectMarqueeSelectionEntries(rect) {
  return getCanvasLayerEntries().filter(entry => {
    const element = getMarqueeElementForEntry(entry);
    if (!element) return false;
    const localRect = getLocalRectForElement(element);
    if (!localRect || !rectsIntersect(rect, localRect)) return false;
    if (entry.kind === 'arrow') {
      return doesArrowPathMeaningfullyIntersectRect(element, rect);
    }
    return true;
  }).map(entry => makeCanvasSelectionEntry(entry.kind, entry.id));
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
    if (e.button !== 0) return;
    marqueeSelection = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      additive: !!e.shiftKey,
      active: false
    };
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
  if (marqueeSelection) {
    const rect = getMarqueeRectFromEvent(e);
    if (!marqueeSelection.active && (rect.width > 4 || rect.height > 4)) marqueeSelection.active = true;
    if (marqueeSelection.active) updateMarqueeOverlay(rect);
    return;
  }
  if (draggingSelection) {
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left - panX) / scale;
    const pointerY = (e.clientY - rect.top - panY) / scale;
    const dx = Math.round((pointerX - draggingSelection.startPointerX) / 10) * 10;
    const dy = Math.round((pointerY - draggingSelection.startPointerY) / 10) * 10;
    const connectedArrowIds = new Set();
    draggingSelection.entries.forEach(entry => {
      const object = getCanvasObjectByEntry(entry);
      if (!object) return;
      object.x = entry.x + dx;
      object.y = entry.y + dy;
      const el = document.getElementById(`${entry.kind}-${entry.id}`);
      if (el) {
        el.style.left = `${object.x}px`;
        el.style.top = `${object.y}px`;
      }
      if (entry.kind === 'node') {
        getConnectedArrowIds(entry.id).forEach(id => connectedArrowIds.add(id));
      } else if (entry.kind === 'icon' && typeof syncSelectedIconInspector === 'function' && selectedIcon === entry.id) {
        syncSelectedIconInspector(object);
      }
    });
    if (connectedArrowIds.size) scheduleRenderArrows([...connectedArrowIds]);
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
  if (draggingAnnotation) {
    const wrap = document.getElementById('canvas-wrap');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const collection = draggingAnnotation.kind === 'label' ? state.labels : state.icons;
    const item = collection.find(entry => entry.id === draggingAnnotation.id);
    if (!item) return;
    item.x = Math.round((((e.clientX - rect.left) / scale - panX / scale) - draggingAnnotation.offsetX) / 10) * 10;
    item.y = Math.round((((e.clientY - rect.top) / scale - panY / scale) - draggingAnnotation.offsetY) / 10) * 10;
    const el = document.getElementById(`${draggingAnnotation.kind}-${item.id}`);
    if (el) {
      el.style.left = item.x + 'px';
      el.style.top = item.y + 'px';
    }
    if (typeof updateContextToolbar === 'function') updateContextToolbar();
    return;
  }
  if (resizingAnnotation) {
    const item = state.icons.find(entry => entry.id === resizingAnnotation);
    if (!item) return;
    const dx = (e.clientX - resizeAnnotationStart.mx) / scale;
    const dy = (e.clientY - resizeAnnotationStart.my) / scale;
    const nextSize = Math.max(20, Math.min(160, Math.round(Math.max(
      resizeAnnotationStart.size + dx,
      resizeAnnotationStart.size + dy
    ))));
    item.size = nextSize;
    const el = document.getElementById(`icon-${item.id}`);
    if (el) {
      el.style.width = `${nextSize}px`;
      el.style.height = `${nextSize}px`;
    }
    if (typeof syncSelectedIconInspector === 'function') syncSelectedIconInspector(item);
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
  const hadMarqueeSelection = marqueeSelection;
  const wasDragging = draggingNode;
  const wasDraggingAnnotation = draggingAnnotation;
  const wasDraggingSelection = draggingSelection;
  const wasResizingAnnotation = resizingAnnotation;
  const wasResizing = resizingNode;
  draggingNode = null;
  draggingAnnotation = null;
  draggingSelection = null;
  resizingAnnotation = null;
  resizingNode = null;

  if (epDragActive) {
    completeEndpointDrag();
  } else if (wireActive) {
    completeWire();
  } else if (hadMarqueeSelection) {
    if (hadMarqueeSelection.active) {
      mergeCanvasSelection(collectMarqueeSelectionEntries(getMarqueeRectFromEvent(e)), { toggle: hadMarqueeSelection.additive, deferChrome: true });
    } else if (!hadMarqueeSelection.additive) {
      deselect();
    }
    marqueeSelection = null;
    hideMarqueeOverlay();
  } else if (wasPanning) {
    scheduleSaveToLocalStorage();
  } else if (wasDragging || wasDraggingAnnotation || wasDraggingSelection || wasResizingAnnotation || wasResizing) {
    scheduleSaveToLocalStorage();
  }
  if (typeof flushDeferredChromeRefresh === 'function') flushDeferredChromeRefresh();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
});
