// Node rendering helpers extracted from main.js

function renderNodes() {
  // Remove old node elements (keep svg)
  document.querySelectorAll('.node').forEach(e => e.remove());
  getSortedNodeLayerEntries().forEach(entry => {
    const n = entry.node;
    const el = createNodeEl(n);
    el.style.zIndex = String(getRenderedNodeLayerValue(n, entry.index));
    canvas.appendChild(el);
  });
}

function createNodeEl(n) {
  const div = document.createElement('div');
  div.className = `node ${n.type}`;
  div.id = `node-${n.id}`;
  div.style.left = n.x + 'px';
  div.style.top = n.y + 'px';
  div.style.width = n.w + 'px';
  div.style.minHeight = n.h + 'px';
  if (n.color) {
    const op = n.colorOpacity !== undefined ? n.colorOpacity : 51;
    const hex = op.toString(16).padStart(2,'0');
    div.style.setProperty('background', n.color + hex);
  }
  if (selectedNode === n.id) div.classList.add('selected');

  const inner = document.createElement('div');
  inner.className = 'node-inner';
  if (n.type !== 'boundary') {
    if (n.tag) {
      const tag = document.createElement('div');
      tag.className = 'node-tag';
      tag.textContent = n.tag;
      if (n.tagColor) tag.style.color = n.tagColor;
      inner.appendChild(tag);
    }
    const title = document.createElement('div');
    title.className = 'node-title';
    title.style.whiteSpace = 'pre-line';
    title.textContent = n.title;
    if (n.textColor) title.style.color = n.textColor; // textColor kept as title override for legacy
    inner.appendChild(title);
    if (n.subtitle) {
      const sub = document.createElement('div');
      sub.className = 'node-subtitle';
      sub.style.whiteSpace = 'pre-line';
      sub.textContent = n.subtitle;
      if (n.subtitleColor) sub.style.color = n.subtitleColor;
      else if (n.textColor) sub.style.color = n.textColor;
      inner.appendChild(sub);
    }
    // Functions list
    const visibleFns = (n.functions || []).filter(fn => { const name = typeof fn === 'string' ? fn : (fn.name || ''); return name.trim() && !fn.hidden; });
    if (visibleFns.length > 0) {
      const fnsWrap = document.createElement('div');
      fnsWrap.className = 'node-functions';
      const fnsLbl = document.createElement('div');
      fnsLbl.className = 'node-functions-label';
      fnsLbl.textContent = 'Functions';
      if (n.fnLabelColor) fnsLbl.style.color = n.fnLabelColor;
      else if (n.textColor) fnsLbl.style.color = n.textColor;
      fnsWrap.appendChild(fnsLbl);
      n.functions.forEach(fn => {
        const name = typeof fn === 'string' ? fn : (fn.name || '');
        if (!name.trim()) return;
        if (fn.hidden) return;
        const item = document.createElement('div');
        item.className = 'node-fn-item';
        item.textContent = name;
        if (n.fnTextColor) item.style.color = n.fnTextColor;
        else if (n.textColor) item.style.color = n.textColor;
        fnsWrap.appendChild(item);
        // Visible IO pills
        const hidIn  = fn.hiddenInputs  || [];
        const hidOut = fn.hiddenOutputs || [];
        const visIns  = (Array.isArray(fn.inputs)  ? fn.inputs  : (fn.inputs  ? [fn.inputs]  : [])).filter((_,i) => !hidIn.includes(i));
        const visOuts = (Array.isArray(fn.outputs) ? fn.outputs : (fn.outputs ? [fn.outputs] : [])).filter((_,i) => !hidOut.includes(i));
        if (visIns.length || visOuts.length) {
          const pillWrap = document.createElement('div');
          pillWrap.className = 'node-io-wrap';
          visIns.forEach(v => {
            const p = document.createElement('span');
            p.className = 'node-io-pill input';
            if (n.ioInputBg)     p.style.background = n.ioInputBg;
            if (n.ioInputBorder) p.style.borderColor = n.ioInputBorder;
            if (n.ioInputText)   p.style.color = n.ioInputText;
            setIOPillLabel(p, 'IN', v);
            pillWrap.appendChild(p);
          });
          visOuts.forEach(v => {
            const p = document.createElement('span');
            p.className = 'node-io-pill output';
            if (n.ioOutputBg)     p.style.background = n.ioOutputBg;
            if (n.ioOutputBorder) p.style.borderColor = n.ioOutputBorder;
            if (n.ioOutputText)   p.style.color = n.ioOutputText;
            setIOPillLabel(p, 'OUT', v);
            pillWrap.appendChild(p);
          });
          fnsWrap.appendChild(pillWrap);
        }
      });
      inner.appendChild(fnsWrap);
    }
  } else {
    // Boundary label — title as the main label, subtitle as smaller description
    if (n.title) {
      const title = document.createElement('div');
      title.className = 'node-title';
      title.textContent = n.title;
      if (n.textColor) title.style.color = n.textColor;
      inner.appendChild(title);
    }
    if (n.subtitle) {
      const sub = document.createElement('div');
      sub.className = 'node-boundary-sub';
      sub.textContent = n.subtitle;
      if (n.subtitleColor) sub.style.color = n.subtitleColor;
      else if (n.textColor) sub.style.color = n.textColor;
      inner.appendChild(sub);
    }
  }
  div.appendChild(inner);

  if (n.type !== 'boundary' && n.linkedDiagramId && typeof getDiagramById === 'function') {
    const linkedDiagram = getDiagramById(n.linkedDiagramId);
    if (linkedDiagram) {
      const linkBadge = document.createElement('div');
      linkBadge.className = 'node-diagram-link-badge';
      linkBadge.textContent = '↗';
      linkBadge.title = `Linked diagram: ${linkedDiagram.title || 'Untitled diagram'}`;
      div.appendChild(linkBadge);
    }
  }

  // Resize handles
  const rh = document.createElement('div');
  rh.className = 'node-resize';
  rh.addEventListener('mousedown', e => {
    if (_nodeLayerTargetMode) {
      e.stopPropagation();
      return;
    }
    startResize(e, n.id, 'se');
  });
  div.appendChild(rh);
  if (n.type === 'boundary') {
    ['n','e','s','w'].forEach(edge => {
      const eh = document.createElement('div');
      eh.className = 'node-boundary-edge ' + edge;
      eh.addEventListener('mousedown', e => {
        if (_nodeLayerTargetMode) {
          e.stopPropagation();
          return;
        }
        startResize(e, n.id, edge);
      });
      div.appendChild(eh);
    });
  }

  // Connection points — all node types including boundary
  {
    ['n','s','e','w'].forEach(pos => {
      const cp = document.createElement('div');
      cp.className = 'conn-point';
      cp.dataset.pos = pos;
      cp.addEventListener('mousedown', e => {
        e.stopPropagation();
        if (_nodeLayerTargetMode) {
          applyNodeLayerTarget(n.id);
          return;
        }
        if (_quickConnectMode) {
          applyQuickConnectTarget(n.id);
          return;
        }
        if (selectedArrow && cp.classList.contains('arrow-endpoint-port')) {
          startEndpointDrag(selectedArrow, n.id, pos, e);
        } else {
          startConnect(n.id, pos, e);
        }
      });
      div.appendChild(cp);
    });
  }

  // Unified top-right info hint
  if (n.type !== 'boundary') {
    const hasDetail = (n.notes && n.notes.trim()) ||
      (n.functions || []).some(f => f.description || (f.inputs && f.inputs.length) || (f.outputs && f.outputs.length));
    const hint = document.createElement('div');
    if (hasDetail) {
      hint.className = 'node-info-hint has-detail';
      hint.textContent = 'i';
      hint.title = 'Contains documentation — double-click to view';
      div.addEventListener('mouseenter', () => { hint.textContent = '⊞ double-click'; });
      div.addEventListener('mouseleave', () => { hint.textContent = 'i'; });
    } else {
      hint.className = 'node-info-hint';
      hint.textContent = '⊞ double-click';
    }
    div.appendChild(hint);
  }

  div.addEventListener('dblclick', e => {
    if (n.type === 'boundary') return;
    e.stopPropagation();
    openNodeModal(n.id);
  });

  div.addEventListener('mousedown', e => {
    if (e.target && e.target.classList && (e.target.classList.contains('conn-point') || e.target.classList.contains('node-resize'))) return;
    if (wireActive) return;
    if (_brushActive) {
      e.stopPropagation();
      applyStyleBrush(n.id);
      return; // don't select, don't drag
    }
    if (_nodeLayerTargetMode) {
      e.stopPropagation();
      if (n.id !== _nodeLayerTargetMode.sourceId) applyNodeLayerTarget(n.id);
      return;
    }
    if (_quickConnectMode) {
      e.stopPropagation();
      if (n.id !== _quickConnectMode.sourceId) applyQuickConnectTarget(n.id);
      return;
    }
    selectNode(n.id);
    startDrag(e, n.id);
  });

  return div;
}
