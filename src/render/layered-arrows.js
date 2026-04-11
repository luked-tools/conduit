let _sharedArrowMarkers = {};
let _arrowObjectRegistry = new Map();

function createArrowSvgEl(tagName) {
  return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}

function getArrowById(arrowId) {
  return state.arrows.find(item => item.id === arrowId) || null;
}

function ensureArrowObject(arrowId) {
  let arrowObject = _arrowObjectRegistry.get(arrowId);
  if (arrowObject && arrowObject.isConnected) return arrowObject;

  arrowObject = createArrowSvgEl('svg');
  arrowObject.setAttribute('class', 'arrow-object');
  arrowObject.setAttribute('data-arrow-id', arrowId);
  arrowObject.setAttribute('width', '4000');
  arrowObject.setAttribute('height', '3000');
  arrowObject.setAttribute('viewBox', '0 0 4000 3000');
  arrowObject.style.left = '0';
  arrowObject.style.top = '0';
  arrowObject.style.pointerEvents = 'none';

  const arrowGroup = createArrowSvgEl('g');
  arrowGroup.style.pointerEvents = 'none';

  const hit = createArrowSvgEl('path');
  hit.setAttribute('fill', 'none');
  hit.setAttribute('stroke', '#ffffff');
  hit.setAttribute('stroke-width', '14');
  hit.setAttribute('opacity', '0');
  hit.setAttribute('class', 'arrow-hit');
  hit.style.cursor = 'pointer';
  hit.style.pointerEvents = 'stroke';
  hit.addEventListener('click', e => {
    e.stopPropagation();
    selectArrow(arrowId, { additive: e.shiftKey });
  });
  hit.addEventListener('mouseenter', e => {
    const arrow = getArrowById(arrowId);
    if (arrow) showArrowTooltip(e, arrow);
  });
  hit.addEventListener('mousemove', e => { positionArrowTooltip(e); });
  hit.addEventListener('mouseleave', () => { hideArrowTooltip(); });
  arrowGroup.appendChild(hit);

  const path = createArrowSvgEl('path');
  path.setAttribute('fill', 'none');
  path.setAttribute('class', 'arrow-path');
  path.style.pointerEvents = 'none';
  arrowGroup.appendChild(path);

  const adornments = createArrowSvgEl('g');
  adornments.setAttribute('class', 'arrow-adornments');
  adornments.style.pointerEvents = 'none';
  arrowGroup.appendChild(adornments);

  arrowObject.appendChild(arrowGroup);
  arrowObject._refs = { arrowGroup, hit, path, adornments };
  _arrowObjectRegistry.set(arrowId, arrowObject);
  return arrowObject;
}

function removeArrowObject(arrowId) {
  const arrowObject = _arrowObjectRegistry.get(arrowId);
  if (!arrowObject) return;
  if (arrowObject.parentNode) arrowObject.parentNode.removeChild(arrowObject);
  _arrowObjectRegistry.delete(arrowId);
}

function renderArrowLabel(adornments, arrowObject, arrow, isSelected, labelX, labelY) {
  const lines = arrow.label.split('\n');
  const lBold = !!arrow.labelBold;
  const lItalic = !!arrow.labelItalic;
  const lColor = arrow.labelColor || 'var(--text2)';
  const fontSize = 11;
  const lineH = fontSize + 4;
  const totalH = lines.length * lineH;
  const maxW = Math.max(...lines.map(l => l.length)) * (lBold ? 7 : 6.5);

  const bg = createArrowSvgEl('rect');
  bg.setAttribute('x', labelX - maxW / 2 - 5);
  bg.setAttribute('y', labelY - totalH / 2 - 5);
  bg.setAttribute('width', maxW + 10);
  bg.setAttribute('height', totalH + 8);
  bg.setAttribute('rx', '4');
  bg.setAttribute('fill', 'var(--bg)');
  bg.setAttribute('stroke', isSelected ? 'var(--accent3)' : 'var(--border)');
  bg.setAttribute('stroke-width', isSelected ? '1.5' : '1');
  adornments.appendChild(bg);

  const txt = createArrowSvgEl('text');
  txt.setAttribute('x', labelX);
  txt.setAttribute('y', labelY - (lines.length - 1) * lineH / 2);
  txt.setAttribute('fill', lColor);
  txt.setAttribute('font-size', fontSize);
  txt.setAttribute('font-family', 'Inter, IBM Plex Sans, sans-serif');
  txt.setAttribute('font-weight', lBold ? '600' : '400');
  txt.setAttribute('font-style', lItalic ? 'italic' : 'normal');
  txt.setAttribute('text-anchor', 'middle');
  txt.setAttribute('dominant-baseline', 'middle');
  lines.forEach((line, i) => {
    const ts = createArrowSvgEl('tspan');
    ts.setAttribute('x', labelX);
    ts.setAttribute('dy', i === 0 ? '0' : lineH);
    ts.textContent = line;
    txt.appendChild(ts);
  });
  adornments.appendChild(txt);

  bg.style.cursor = txt.style.cursor = 'move';
  bg.style.pointerEvents = txt.style.pointerEvents = 'all';
  bg.addEventListener('mousedown', e => {
    if (e.detail === 2) return;
    startArrowLabelDrag(arrow.id, e);
  });
  txt.addEventListener('mousedown', e => {
    if (e.detail === 2) return;
    startArrowLabelDrag(arrow.id, e);
  });
  const onDbl = e => {
    e.stopPropagation();
    selectArrow(arrow.id);
    startInlineLabelEdit(arrow, labelX, labelY);
  };
  bg.addEventListener('dblclick', onDbl);
  txt.addEventListener('dblclick', onDbl);
}

function renderArrowSelectionHandles(adornments, arrow, p1, p2) {
  [
    { end: 'from', point: p1, nodeId: arrow.from, pos: arrow.fromPos || 'e' },
    { end: 'to', point: p2, nodeId: arrow.to, pos: arrow.toPos || 'w' }
  ].forEach(handle => {
    const g = createArrowSvgEl('g');
    g.setAttribute('class', 'arrow-endpoint-handle' + (epDragActive && epDragArrowId === arrow.id && epDragEnd === handle.end ? ' dragging' : ''));
    g.setAttribute('transform', `translate(${handle.point.x},${handle.point.y})`);
    const handleHit = createArrowSvgEl('circle');
    handleHit.setAttribute('class', 'hit');
    handleHit.setAttribute('r', '16');
    g.appendChild(handleHit);
    const c = createArrowSvgEl('circle');
    c.setAttribute('class', 'dot');
    c.setAttribute('r', '5.5');
    g.appendChild(c);
    g.addEventListener('mousedown', e => startEndpointDrag(arrow.id, handle.nodeId, handle.pos, e, handle.end));
    adornments.appendChild(g);
  });
}

function renderOrthogonalHandles(adornments, arrow, pathResult) {
  [
    { info: pathResult.hX, prop: 'bend', color: 'var(--accent3)' },
    { info: pathResult.hY, prop: 'orthoY', color: 'var(--accent2)' }
  ].forEach(({ info, prop, color }) => {
    const isVertSeg = info.seg === 'vertical';
    const isXDrag = info.axis === 'x';
    const hw = isVertSeg ? 14 : 28;
    const hh = isVertSeg ? 28 : 14;

    const pill = createArrowSvgEl('rect');
    pill.setAttribute('x', info.x - hw / 2);
    pill.setAttribute('y', info.y - hh / 2);
    pill.setAttribute('width', hw);
    pill.setAttribute('height', hh);
    pill.setAttribute('rx', '7');
    pill.setAttribute('fill', color);
    pill.setAttribute('opacity', '0.85');
    pill.style.cursor = isXDrag ? 'ew-resize' : 'ns-resize';
    pill.style.pointerEvents = 'all';

    const grip = createArrowSvgEl('g');
    grip.style.pointerEvents = 'none';
    [-4, 0, 4].forEach(off => {
      const gl = createArrowSvgEl('line');
      if (isVertSeg) {
        gl.setAttribute('x1', info.x - 4); gl.setAttribute('y1', info.y + off);
        gl.setAttribute('x2', info.x + 4); gl.setAttribute('y2', info.y + off);
      } else {
        gl.setAttribute('x1', info.x + off); gl.setAttribute('y1', info.y - 4);
        gl.setAttribute('x2', info.x + off); gl.setAttribute('y2', info.y + 4);
      }
      gl.setAttribute('stroke', 'var(--bg)');
      gl.setAttribute('stroke-width', '1.5');
      gl.setAttribute('stroke-linecap', 'round');
      grip.appendChild(gl);
    });

    adornments.appendChild(pill);
    adornments.appendChild(grip);
    pill.addEventListener('mousedown', e => {
      startOrthogonalHandleDrag(arrow.id, prop, info, isXDrag, e);
    });
  });
}

function updateArrowObject(arrowObject, arrow, { d, p1, p2, pathResult, stroke, accentStroke, isSelected, isEditingSelected, zIndex, labelX, labelY }) {
  const { hit, path, adornments } = arrowObject._refs;
  arrowObject.style.zIndex = String(zIndex);

  hit.setAttribute('d', d);

  path.setAttribute('d', d);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', isSelected ? '2' : '1.5');
  path.removeAttribute('marker-start');
  path.removeAttribute('marker-end');
  path.removeAttribute('stroke-dasharray');

  const dasharray = getArrowStrokeDasharray(arrow);
  if (dasharray) path.setAttribute('stroke-dasharray', dasharray);

  const markerIds = getSharedArrowMarkerIds(stroke);
  if (arrow.direction === 'directed') {
    path.setAttribute('marker-end', `url(#${markerIds.fwd})`);
  } else if (arrow.direction === 'bidirectional') {
    path.setAttribute('marker-end', `url(#${markerIds.fwd})`);
    path.setAttribute('marker-start', `url(#${markerIds.bwd})`);
  }

  adornments.replaceChildren();

  if (isSelected) {
    const selectionPath = createArrowSvgEl('path');
    selectionPath.setAttribute('d', d);
    selectionPath.setAttribute('fill', 'none');
    selectionPath.setAttribute('stroke', accentStroke);
    selectionPath.setAttribute('stroke-width', '5');
    selectionPath.setAttribute('opacity', '0.28');
    selectionPath.style.pointerEvents = 'none';
    const selectionDasharray = getArrowStrokeDasharray(arrow);
    if (selectionDasharray) selectionPath.setAttribute('stroke-dasharray', selectionDasharray);
    adornments.appendChild(selectionPath);
  }

  if (arrow.label) renderArrowLabel(adornments, arrowObject, arrow, isSelected, labelX, labelY);
  if (isEditingSelected) renderArrowSelectionHandles(adornments, arrow, p1, p2);
  if (isEditingSelected && (arrow.lineStyle || 'curved') === 'orthogonal' && pathResult.hX) {
    renderOrthogonalHandles(adornments, arrow, pathResult);
  }
}

function getSharedArrowMarkerIds(stroke) {
  const key = String(stroke || '').toLowerCase();
  if (_sharedArrowMarkers[key]) return _sharedArrowMarkers[key];
  const safeKey = key.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'default';
  const idFwd = `arrow-marker-fwd-${safeKey}`;
  const idBwd = `arrow-marker-bwd-${safeKey}`;
  const defsHost = arrowSVG;
  if (!defsHost) return { fwd: idFwd, bwd: idBwd };

  let defs = defsHost.querySelector('defs[data-shared-arrow-markers="1"]');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.setAttribute('data-shared-arrow-markers', '1');
    defsHost.insertBefore(defs, defsHost.firstChild);
  }

  function ensureMarker(id, forStart) {
    if (document.getElementById(id)) return;
    const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    m.setAttribute('id', id);
    m.setAttribute('markerWidth', '8');
    m.setAttribute('markerHeight', '6');
    m.setAttribute('refX', '8');
    m.setAttribute('refY', '3');
    m.setAttribute('orient', forStart ? 'auto-start-reverse' : 'auto');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M0,0 L0,6 L8,3 z');
    p.setAttribute('fill', stroke);
    m.appendChild(p);
    defs.appendChild(m);
  }

  ensureMarker(idFwd, false);
  ensureMarker(idBwd, true);
  _sharedArrowMarkers[key] = { fwd: idFwd, bwd: idBwd };
  return _sharedArrowMarkers[key];
}

function renderArrows(targetArrowIds = null) {
  const nodeById = new Map(state.nodes.map(n => [n.id, n]));
  const rootStyles = getComputedStyle(document.documentElement);
  const accentStrokeFallback = rootStyles.getPropertyValue('--accent3').trim() || '#e85e00';
  const defaultArrowStroke = rootStyles.getPropertyValue('--arrow-color').trim() || '#ff8c42';
  const targetArrowIdSet = Array.isArray(targetArrowIds) && targetArrowIds.length
    ? new Set(targetArrowIds)
    : null;

  const portGroups = {};
  state.arrows.forEach(a => {
    const fk = a.from + ':' + (a.fromPos || 'e');
    const tk = a.to + ':' + (a.toPos || 'w');
    if (!portGroups[fk]) portGroups[fk] = [];
    if (!portGroups[tk]) portGroups[tk] = [];
    if (getArrowEndOffset(a, 'from') === null) portGroups[fk].push(a.id + ':from');
    if (getArrowEndOffset(a, 'to') === null) portGroups[tk].push(a.id + ':to');
  });

  const portPerp = { n: { x: 1, y: 0 }, s: { x: 1, y: 0 }, e: { x: 0, y: 1 }, w: { x: 0, y: 1 } };
  const STAGGER = 8;

  function staggeredPortXY(node, pos, arrowId, end, manualOffset) {
    if (manualOffset !== null) return getPortXY(node, pos, manualOffset);
    const base = getPortXY(node, pos);
    const key = node.id + ':' + pos;
    const token = arrowId + ':' + end;
    const group = portGroups[key] || [];
    if (group.length <= 1) return base;
    const idx = group.indexOf(token);
    if (idx === -1) return base;
    const offset = (idx - (group.length - 1) / 2) * STAGGER;
    const perp = portPerp[pos] || { x: 1, y: 0 };
    return { x: base.x + perp.x * offset, y: base.y + perp.y * offset };
  }

  const orderedArrows = getCanvasLayerEntries()
    .filter(entry => entry.kind === 'arrow')
    .sort((a, b) => {
      const aBoost = a.id === selectedArrow ? 1 : 0;
      const bBoost = b.id === selectedArrow ? 1 : 0;
      return (aBoost - bBoost) || (a.index - b.index);
    });

  const seenArrowIds = targetArrowIdSet ? null : new Set();

  orderedArrows.forEach(entry => {
    const a = entry.object;
    if (targetArrowIdSet && !targetArrowIdSet.has(a.id)) return;
    const fromNode = nodeById.get(a.from);
    const toNode = nodeById.get(a.to);
    if (!fromNode || !toNode) {
      removeArrowObject(a.id);
      return;
    }
    if (seenArrowIds) seenArrowIds.add(a.id);

    const p1 = staggeredPortXY(fromNode, a.fromPos || 'e', a.id, 'from', getArrowEndOffset(a, 'from'));
    const p2 = staggeredPortXY(toNode, a.toPos || 'w', a.id, 'to', getArrowEndOffset(a, 'to'));

    const isSelected = isCanvasObjectSelected('arrow', a.id);
    const isEditingSelected = getCanvasSelectionCount() === 1 && selectedArrow === a.id;
    const accentStroke = accentStrokeFallback;
    const stroke = a.color || defaultArrowStroke;

    const pathResult = buildArrowPath(p1, p2, a.fromPos || 'e', a.toPos || 'w', a.bend || 0, a.lineStyle || 'curved', 0, 0, a.orthoY || 0);
    const { d, lx: _lx, ly: _ly } = pathResult;
    const arrowObject = ensureArrowObject(a.id);
    updateArrowObject(arrowObject, a, {
      d,
      p1,
      p2,
      pathResult,
      stroke,
      accentStroke,
      isSelected,
      isEditingSelected,
      zIndex: isEditingSelected ? Number(getSelectedArrowLayerZ()) : getRenderedArrowLayerValue(a),
      labelX: _lx + (a.labelOffsetX || 0),
      labelY: _ly + (a.labelOffsetY || 0)
    });
    canvas.appendChild(arrowObject);
  });

  if (targetArrowIdSet) {
    targetArrowIdSet.forEach(arrowId => {
      if (!state.arrows.some(arrow => arrow.id === arrowId)) removeArrowObject(arrowId);
    });
    return;
  }

  Array.from(_arrowObjectRegistry.keys()).forEach(arrowId => {
    if (!seenArrowIds.has(arrowId)) removeArrowObject(arrowId);
  });
}

function refreshRenderedArrowLayers() {
  state.arrows.forEach(arrow => {
    const arrowObject = _arrowObjectRegistry.get(arrow.id);
    if (!arrowObject || !arrowObject.isConnected) return;
    const isSelected = getCanvasSelectionCount() === 1 && selectedArrow === arrow.id;
    arrowObject.style.zIndex = String(isSelected ? Number(getSelectedArrowLayerZ()) : getRenderedArrowLayerValue(arrow));
  });
}

