function startConnect(nodeId, pos, e) {
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  e.preventDefault();
  e.stopPropagation();

  wireActive = true;
  wireSrcId = nodeId;
  wireSrcPos = pos;
  wireTargetId = null;
  wireTargetPos = null;
  wireTargetOffset = null;

  const srcEl = document.getElementById('node-' + nodeId);
  if (srcEl) {
    srcEl.querySelectorAll('.conn-point').forEach(cp => {
      if (cp.dataset.pos === pos) cp.classList.add('drag-active');
    });
  }

  wireTempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  wireTempPath.setAttribute('fill', 'none');
  wireTempPath.setAttribute('stroke', 'var(--accent3)');
  wireTempPath.setAttribute('stroke-width', '1.8');
  wireTempPath.setAttribute('stroke-dasharray', '6 3');
  wireTempPath.setAttribute('pointer-events', 'none');
  wireTempPath.setAttribute('opacity', '0.9');
  arrowSVG.appendChild(wireTempPath);

  let previewMarker = document.getElementById('wire-preview-marker');
  if (!previewMarker) {
    const defs = arrowSVG.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    previewMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    previewMarker.setAttribute('id', 'wire-preview-marker');
    previewMarker.setAttribute('markerWidth', '7');
    previewMarker.setAttribute('markerHeight', '5');
    previewMarker.setAttribute('refX', '6');
    previewMarker.setAttribute('refY', '2.5');
    previewMarker.setAttribute('orient', 'auto');
    const mPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mPath.setAttribute('d', 'M0,0 L0,5 L7,2.5 z');
    mPath.setAttribute('fill', 'var(--accent3)');
    previewMarker.appendChild(mPath);
    defs.appendChild(previewMarker);
    if (!arrowSVG.querySelector('defs')) arrowSVG.insertBefore(defs, arrowSVG.firstChild);
  }
  wireTempPath.setAttribute('marker-end', 'url(#wire-preview-marker)');

  document.body.classList.add('connecting');
  setStatusModeMessage('→ Drag to target node — release to connect');
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function updateWirePreview(mouseX, mouseY) {
  if (!wireActive || !wireTempPath) return;
  const srcNode = state.nodes.find(x => x.id === wireSrcId);
  if (!srcNode) return;
  let previewArrow = null;

  let p1 = getPortXY(srcNode, wireSrcPos);
  if (epDragActive && epDragArrowId) {
    previewArrow = state.arrows.find(x => x.id === epDragArrowId) || null;
    if (previewArrow) {
      const otherEnd = epDragEnd === 'from' ? 'to' : 'from';
      const otherNode = state.nodes.find(x => x.id === (otherEnd === 'from' ? previewArrow.from : previewArrow.to));
      const otherPos = otherEnd === 'from' ? (previewArrow.fromPos || 'e') : (previewArrow.toPos || 'w');
      const otherOffset = getArrowEndOffset(previewArrow, otherEnd);
      if (otherNode) p1 = getPortXY(otherNode, otherPos, otherOffset);
    }
  }

  let p2x = mouseX, p2y = mouseY;
  let snapPos = null;
  if (wireTargetId) {
    const tgt = state.nodes.find(x => x.id === wireTargetId);
    if (tgt) {
      if (wireTargetPos) {
        snapPos = wireTargetPos;
      } else {
        snapPos = getBestTargetPort(srcNode, wireSrcPos, tgt, mouseX, mouseY);
        wireTargetPos = snapPos;
      }
      const snapped = getPortXY(tgt, snapPos, wireTargetOffset);
      p2x = snapped.x;
      p2y = snapped.y;
    }
  }

  const previewLineStyle = previewArrow ? (previewArrow.lineStyle || 'curved') : (nextArrowLineStyle || 'curved');
  const previewBend = previewArrow ? (previewArrow.bend || 0) : 0;
  const previewOrthoY = previewArrow ? (previewArrow.orthoY || 0) : 0;
  const previewToPos = snapPos || (
    previewArrow
      ? (epDragEnd === 'from' ? (previewArrow.fromPos || 'e') : (previewArrow.toPos || 'w'))
      : 'w'
  );
  const previewPath = buildArrowPath(
    p1,
    { x: p2x, y: p2y },
    wireSrcPos,
    previewToPos,
    previewBend,
    previewLineStyle,
    0,
    0,
    previewOrthoY
  );
  wireTempPath.setAttribute('d', previewPath.d);
}

function cancelWire() {
  wireActive = false;
  wireSrcId = null;
  wireSrcPos = null;
  wireTargetId = null;
  wireTargetPos = null;
  wireTargetOffset = null;
  epDragActive = false;
  epDragArrowId = null;
  epDragEnd = null;

  if (wireTempPath) {
    wireTempPath.remove();
    wireTempPath = null;
  }
  document.body.classList.remove('connecting');
  document.querySelectorAll('.conn-point.drag-active').forEach(cp => cp.classList.remove('drag-active'));
  document.querySelectorAll('.conn-point.snap-target').forEach(cp => cp.classList.remove('snap-target'));
  document.querySelectorAll('.node.connect-target').forEach(n => n.classList.remove('connect-target'));
  hideConnectTargetTooltip();
  const sbMode = document.getElementById('sb-mode');
  if (sbMode) setStatusModeMessage('');
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function completeWire() {
  if (!wireActive || !wireSrcId || !wireTargetId || wireTargetId === wireSrcId) {
    cancelWire();
    return;
  }
  const toPos = wireTargetPos || getBestTargetPort(
    state.nodes.find(x => x.id === wireSrcId), wireSrcPos,
    state.nodes.find(x => x.id === wireTargetId), 0, 0
  );
  const id = nextArrowId();
  state.arrows.push({
    id,
    from: wireSrcId, to: wireTargetId,
    fromPos: wireSrcPos, toPos,
    toOffset: wireTargetOffset,
    direction: nextArrowType,
    lineStyle: nextArrowLineStyle,
    strokeStyle: 'solid',
    label: '', labelOffsetX: 0, labelOffsetY: 0,
    color: '', dash: false, bend: 0
  });
  normalizeArrowLayers();
  rebuildCanvasOrderFromLegacyLayers();
  cancelWire();
  render();
  selectArrow(id);
}

function startEndpointDrag(arrowId, nodeId, pos, e, forcedEnd) {
  if (typeof _contextToolbarMenuOpen !== 'undefined') _contextToolbarMenuOpen = false;
  e.preventDefault();
  e.stopPropagation();
  const arr = state.arrows.find(a => a.id === arrowId);
  if (!arr) return;

  let isFrom = forcedEnd === 'from';
  let isTo = forcedEnd === 'to';
  if (!forcedEnd) {
    isFrom = arr.from === nodeId && (arr.fromPos || 'e') === pos;
    isTo = arr.to === nodeId && (arr.toPos || 'w') === pos;
  }
  if (!isFrom && !isTo) return;

  pushUndo();

  epDragActive = true;
  epDragArrowId = arrowId;
  epDragEnd = isFrom ? 'from' : 'to';

  const otherNodeId = isFrom ? arr.to : arr.from;
  const otherNodePos = isFrom ? (arr.toPos || 'w') : (arr.fromPos || 'e');

  wireActive = true;
  wireSrcId = otherNodeId;
  wireSrcPos = otherNodePos;
  wireTargetId = null;
  wireTargetPos = null;
  wireTargetOffset = null;

  wireTempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  wireTempPath.setAttribute('fill', 'none');
  wireTempPath.setAttribute('stroke', 'var(--accent2)');
  wireTempPath.setAttribute('stroke-width', '2');
  wireTempPath.setAttribute('stroke-dasharray', '5 3');
  wireTempPath.setAttribute('pointer-events', 'none');
  wireTempPath.setAttribute('opacity', '0.9');
  arrowSVG.appendChild(wireTempPath);

  const srcEl = document.getElementById('node-' + nodeId);
  if (srcEl && getArrowEndOffset(arr, epDragEnd) === null) {
    const cp = srcEl.querySelector(`.conn-point[data-pos="${pos}"]`);
    if (cp) cp.classList.add('drag-active');
  }

  document.body.classList.add('connecting');
  setStatusModeMessage('↔ Drag to reposition arrow endpoint');
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function completeEndpointDrag() {
  if (!epDragActive) return;

  const arr = state.arrows.find(a => a.id === epDragArrowId);
  if (!arr) {
    cancelWire();
    return;
  }

  if (wireTargetId) {
    if (epDragEnd === 'from') {
      arr.from = wireTargetId;
      arr.fromPos = wireTargetPos || 'e';
      arr.fromOffset = wireTargetOffset;
    } else {
      arr.to = wireTargetId;
      arr.toPos = wireTargetPos || 'w';
      arr.toOffset = wireTargetOffset;
    }
    saveToLocalStorage();
  }

  epDragActive = false;
  epDragArrowId = null;
  epDragEnd = null;

  cancelWire();
  const arrowId = selectedArrow;
  render();
  if (arrowId) {
    selectedArrow = arrowId;
    selectArrow(arrowId);
  }
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function getNodeActualH(n) {
  const el = document.getElementById('node-' + n.id);
  return el ? el.offsetHeight : n.h;
}

function getPortXYActual(n, pos, offset) {
  return getPortXY(n, pos, offset, getNodeActualH(n));
}

function getBestTargetPort(srcNode, srcPos, tgtNode, mx, my) {
  const ports = ['n', 's', 'e', 'w'];
  const offsets = { n: { x: 0, y: -1 }, s: { x: 0, y: 1 }, e: { x: 1, y: 0 }, w: { x: -1, y: 0 } };
  const tgtH = getNodeActualH(tgtNode);
  const tgtCy = tgtNode.y + tgtH / 2;

  let best = 'w', bestScore = -Infinity;
  ports.forEach(pos => {
    const p = getPortXYActual(tgtNode, pos);
    const dist = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
    const po = offsets[pos];
    const sc = {
      x: srcNode.x + srcNode.w / 2 - (tgtNode.x + tgtNode.w / 2),
      y: srcNode.y + getNodeActualH(srcNode) / 2 - tgtCy
    };
    const len = Math.sqrt(sc.x * sc.x + sc.y * sc.y) || 1;
    const align = po.x * (sc.x / len) + po.y * (sc.y / len);
    const score = align * 100 - dist * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = pos;
    }
  });
  return best;
}

function getBestPos(fromId, toId) {
  const fn = state.nodes.find(x => x.id === fromId);
  const tn = state.nodes.find(x => x.id === toId);
  const fc = { x: fn.x + fn.w / 2, y: fn.y + fn.h / 2 };
  const tc = { x: tn.x + tn.w / 2, y: tn.y + tn.h / 2 };
  const dx = tc.x - fc.x, dy = tc.y - fc.y;
  let fromPos, toPos;
  if (Math.abs(dx) > Math.abs(dy)) {
    fromPos = dx > 0 ? 'e' : 'w';
    toPos = dx > 0 ? 'w' : 'e';
  } else {
    fromPos = dy > 0 ? 's' : 'n';
    toPos = dy > 0 ? 'n' : 's';
  }
  return { fromPos, toPos };
}

function toggleConnectMode() {}
function finishConnect(toNodeId, toPos) { completeWire(); }
