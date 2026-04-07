function renderArrows() {
  document.querySelectorAll('.arrow-object').forEach(el => el.remove());

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

  orderedArrows.forEach(entry => {
    const a = entry.object;
    const fromNode = state.nodes.find(n => n.id === a.from);
    const toNode = state.nodes.find(n => n.id === a.to);
    if (!fromNode || !toNode) return;

    const p1 = staggeredPortXY(fromNode, a.fromPos || 'e', a.id, 'from', getArrowEndOffset(a, 'from'));
    const p2 = staggeredPortXY(toNode, a.toPos || 'w', a.id, 'to', getArrowEndOffset(a, 'to'));

    const isSelected = selectedArrow === a.id;
    const accentStroke = getComputedStyle(document.documentElement).getPropertyValue('--accent3').trim() || '#e85e00';
    const stroke = a.color || (getComputedStyle(document.documentElement).getPropertyValue('--arrow-color').trim() || '#ff8c42');
    const uid = a.id;

    const arrowObject = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrowObject.setAttribute('class', 'arrow-object');
    arrowObject.setAttribute('data-arrow-id', a.id);
    arrowObject.setAttribute('width', '4000');
    arrowObject.setAttribute('height', '3000');
    arrowObject.setAttribute('viewBox', '0 0 4000 3000');
    arrowObject.style.left = '0';
    arrowObject.style.top = '0';
    arrowObject.style.zIndex = String(isSelected ? Number(getSelectedArrowLayerZ()) : getRenderedArrowLayerValue(a));
    arrowObject.style.pointerEvents = 'none';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    function makeArrowMarker(mid, forStart) {
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      m.setAttribute('id', mid);
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
      return mid;
    }
    const mFwd = makeArrowMarker('mf-' + uid, false);
    const mBwd = makeArrowMarker('mb-' + uid, true);
    arrowObject.appendChild(defs);

    const pathResult = buildArrowPath(p1, p2, a.fromPos || 'e', a.toPos || 'w', a.bend || 0, a.lineStyle || 'curved', 0, 0, a.orthoY || 0);
    const { d, lx: _lx, ly: _ly } = pathResult;

    const arrowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    arrowGroup.style.pointerEvents = 'none';

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('fill', 'none');
    hit.setAttribute('stroke', '#ffffff');
    hit.setAttribute('stroke-width', '14');
    hit.setAttribute('opacity', '0');
    hit.setAttribute('class', 'arrow-hit');
    hit.style.cursor = 'pointer';
    hit.style.pointerEvents = 'stroke';
    hit.addEventListener('click', e => { e.stopPropagation(); selectArrow(a.id); });
    hit.addEventListener('mouseenter', e => { showArrowTooltip(e, a); });
    hit.addEventListener('mousemove', e => { positionArrowTooltip(e); });
    hit.addEventListener('mouseleave', () => { hideArrowTooltip(); });
    arrowGroup.appendChild(hit);

    if (isSelected) {
      const selectionPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      selectionPath.setAttribute('d', d);
      selectionPath.setAttribute('fill', 'none');
      selectionPath.setAttribute('stroke', accentStroke);
      selectionPath.setAttribute('stroke-width', '5');
      selectionPath.setAttribute('opacity', '0.28');
      selectionPath.style.pointerEvents = 'none';
      const selectionDasharray = getArrowStrokeDasharray(a);
      if (selectionDasharray) selectionPath.setAttribute('stroke-dasharray', selectionDasharray);
      arrowGroup.appendChild(selectionPath);
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', isSelected ? '2' : '1.5');
    path.setAttribute('class', 'arrow-path');
    path.style.pointerEvents = 'none';
    const dasharray = getArrowStrokeDasharray(a);
    if (dasharray) path.setAttribute('stroke-dasharray', dasharray);
    if (a.direction === 'directed') {
      path.setAttribute('marker-end', `url(#${mFwd})`);
    } else if (a.direction === 'bidirectional') {
      path.setAttribute('marker-end', `url(#${mFwd})`);
      path.setAttribute('marker-start', `url(#${mBwd})`);
    }
    arrowGroup.appendChild(path);

    if (isSelected) {
      [
        { end: 'from', point: p1, nodeId: a.from, pos: a.fromPos || 'e' },
        { end: 'to', point: p2, nodeId: a.to, pos: a.toPos || 'w' }
      ].forEach(handle => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'arrow-endpoint-handle' + (epDragActive && epDragArrowId === a.id && epDragEnd === handle.end ? ' dragging' : ''));
        g.setAttribute('transform', `translate(${handle.point.x},${handle.point.y})`);
        const handleHit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handleHit.setAttribute('class', 'hit');
        handleHit.setAttribute('r', '16');
        g.appendChild(handleHit);
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('class', 'dot');
        c.setAttribute('r', '5.5');
        g.appendChild(c);
        g.addEventListener('mousedown', e => startEndpointDrag(a.id, handle.nodeId, handle.pos, e, handle.end));
        arrowGroup.appendChild(g);
      });
    }

    if (a.label) {
      const lx = _lx + (a.labelOffsetX || 0);
      const ly = _ly + (a.labelOffsetY || 0);
      const lines = a.label.split('\n');
      const lBold = !!a.labelBold;
      const lItalic = !!a.labelItalic;
      const lColor = a.labelColor || 'var(--text2)';
      const fontSize = 11;
      const lineH = fontSize + 4;
      const totalH = lines.length * lineH;
      const maxW = Math.max(...lines.map(l => l.length)) * (lBold ? 7 : 6.5);

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', lx - maxW / 2 - 5);
      bg.setAttribute('y', ly - totalH / 2 - 5);
      bg.setAttribute('width', maxW + 10);
      bg.setAttribute('height', totalH + 8);
      bg.setAttribute('rx', '4');
      bg.setAttribute('fill', 'var(--bg)');
      bg.setAttribute('stroke', isSelected ? 'var(--accent3)' : 'var(--border)');
      bg.setAttribute('stroke-width', isSelected ? '1.5' : '1');
      arrowGroup.appendChild(bg);

      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly - (lines.length - 1) * lineH / 2);
      txt.setAttribute('fill', lColor);
      txt.setAttribute('font-size', fontSize);
      txt.setAttribute('font-family', 'Inter, IBM Plex Sans, sans-serif');
      txt.setAttribute('font-weight', lBold ? '600' : '400');
      txt.setAttribute('font-style', lItalic ? 'italic' : 'normal');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'middle');
      lines.forEach((line, i) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ts.setAttribute('x', lx);
        ts.setAttribute('dy', i === 0 ? '0' : lineH);
        ts.textContent = line;
        txt.appendChild(ts);
      });
      arrowGroup.appendChild(txt);

      bg.style.cursor = txt.style.cursor = 'move';
      bg.style.pointerEvents = txt.style.pointerEvents = 'all';
      const onDown = e2 => {
        if (e2.detail === 2) return;
        startArrowLabelDrag(a.id, e2);
      };
      bg.addEventListener('mousedown', onDown);
      txt.addEventListener('mousedown', onDown);
      const onDbl = e2 => {
        e2.stopPropagation();
        selectArrow(a.id);
        startInlineLabelEdit(a, lx, ly);
      };
      bg.addEventListener('dblclick', onDbl);
      txt.addEventListener('dblclick', onDbl);
    }

    if (isSelected && (a.lineStyle || 'curved') === 'orthogonal' && pathResult.hX) {
      [
        { info: pathResult.hX, prop: 'bend', color: 'var(--accent3)' },
        { info: pathResult.hY, prop: 'orthoY', color: 'var(--accent2)' }
      ].forEach(({ info, prop, color }) => {
        const isVertSeg = info.seg === 'vertical';
        const isXDrag = info.axis === 'x';
        const hw = isVertSeg ? 14 : 28;
        const hh = isVertSeg ? 28 : 14;

        const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        pill.setAttribute('x', info.x - hw / 2);
        pill.setAttribute('y', info.y - hh / 2);
        pill.setAttribute('width', hw);
        pill.setAttribute('height', hh);
        pill.setAttribute('rx', '7');
        pill.setAttribute('fill', color);
        pill.setAttribute('opacity', '0.85');
        pill.style.cursor = isXDrag ? 'ew-resize' : 'ns-resize';
        pill.style.pointerEvents = 'all';

        const grip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        grip.style.pointerEvents = 'none';
        [-4, 0, 4].forEach(off => {
          const gl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
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

        arrowGroup.appendChild(pill);
        arrowGroup.appendChild(grip);
        pill.addEventListener('mousedown', e2 => {
          startOrthogonalHandleDrag(a.id, prop, info, isXDrag, e2);
        });
      });
    }

    arrowObject.appendChild(arrowGroup);
    canvas.appendChild(arrowObject);
  });
}

if (typeof render === 'function') render();
