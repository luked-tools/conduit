// Render and properties panel helpers extracted from main.js

function render() {
  renderNodes();
  renderArrows();
  renderSidebar();
  if (typeof renderLayersPanel === 'function') renderLayersPanel();
  updateStatusBar();
  updateEmptyState();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function updateEmptyState() {
  const el = document.getElementById('canvas-empty');
  if (!el) return;
  const hasNodes = state.nodes.length > 0;
  el.classList.toggle('visible', !hasNodes);
}

function createPropSectionHeader(labelText, badgeText, sectionKey, bodyEl) {
  const header = document.createElement('div');
  header.className = 'prop-section-head' + (_propSectionState[sectionKey] !== false ? ' open' : '');

  const label = document.createElement('div');
  label.className = 'prop-label';
  label.style.marginBottom = '0';
  label.textContent = labelText;
  header.appendChild(label);

  const meta = document.createElement('div');
  meta.className = 'prop-section-meta';

  const badge = document.createElement('span');
  badge.style.cssText = 'font-family:"IBM Plex Mono",monospace;font-size:9px;background:var(--surface3);color:var(--text3);padding:1px 6px;border-radius:3px;';
  badge.textContent = badgeText;
  meta.appendChild(badge);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'prop-section-chevron');
  chevron.setAttribute('viewBox', '0 0 10 10');
  chevron.setAttribute('fill', 'none');
  chevron.innerHTML = '<path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>';
  meta.appendChild(chevron);

  header.appendChild(meta);
  if (_propSectionState[sectionKey] === false) bodyEl.classList.add('hidden');

  header.addEventListener('click', () => {
    const isOpen = _propSectionState[sectionKey] !== false;
    _propSectionState[sectionKey] = !isOpen;
    header.classList.toggle('open', !isOpen);
    bodyEl.classList.toggle('hidden', isOpen);
  });

  return header;
}

function renderSidebar() {
  document.getElementById('node-count').textContent = state.nodes.filter(n=>n.type!=='boundary').length;
  const list = document.getElementById('node-list');
  list.innerHTML = '';
  state.nodes.filter(n=>n.type!=='boundary').forEach(n => {
    const item = document.createElement('div');
    item.className = 'node-list-item' + (selectedNode===n.id ? ' selected':'');
    const dot = document.createElement('div');
    dot.className = 'node-list-dot';
    dot.style.background = n.type==='internal' ? 'var(--accent)' : 'var(--accent2)';
    item.appendChild(dot);
    const label = document.createElement('span');
    label.textContent = (n.tag ? n.tag + ' · ':'') + n.title.replace(/\n/g,' ');
    item.appendChild(label);
    item.addEventListener('click', () => selectNode(n.id));
    list.appendChild(item);
  });
  renderPropsPanel();
}

function renderPropsPanel() {
  const section = document.getElementById('props-section');
  const body = document.getElementById('props-body');
  if (!selectedNode && !selectedArrow) {
    body.innerHTML = '<div style="font-size:11px;color:var(--text3);font-style:italic;padding:4px 0 2px;text-align:center;line-height:1.6;">Select a node or arrow<br>to view properties</div>';
    return;
  }
  body.innerHTML = '';

  if (selectedNode) {
    const n = state.nodes.find(x => x.id===selectedNode);
    if (!n) return;

    const isBoundary = n.type === 'boundary';
    const fields = [
      {label:'Tag / ID', key:'tag', type:'text', placeholder:'e.g. ERP-01'},
      {label: isBoundary ? 'Label' : 'Title', key:'title', type:'textarea', placeholder: isBoundary ? 'Boundary label' : 'System name'},
      {label: isBoundary ? 'Description' : 'Subtitle / Description', key:'subtitle', type:'textarea', placeholder:'Short description'},
    ];
    fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'prop-row';
      const lbl = document.createElement('div');
      lbl.className = 'prop-label';
      lbl.textContent = f.label;
      row.appendChild(lbl);
      let inp;
      if (f.type === 'textarea') {
        inp = document.createElement('textarea');
        inp.rows = 2;
      } else {
        inp = document.createElement('input');
        inp.type = f.type;
      }
      inp.className = 'prop-input';
      inp.value = n[f.key] || '';
      inp.placeholder = f.placeholder || '';
      inp.addEventListener('input', () => { n[f.key] = inp.value; renderNodes(); renderArrows(); });
      row.appendChild(inp);
      body.appendChild(row);
    });

    // Text colour controls for boundary nodes (no Content Style panel for them)
    if (n.type === 'boundary') {
      function makeBoundaryColorRow(labelText, field, defaultVar) {
        const row = document.createElement('div'); row.className = 'prop-row';
        const lbl = document.createElement('div'); lbl.className='prop-label'; lbl.textContent=labelText;
        row.appendChild(lbl);
        const inline = document.createElement('div'); inline.className='prop-row-inline';
        const inp = document.createElement('input'); inp.type='color'; inp.className='prop-input';
        inp.style.cssText = 'flex:1;min-width:0;height:32px;padding:2px 4px;cursor:pointer;';
        const dflt = getComputedStyle(document.documentElement).getPropertyValue(defaultVar).trim() || '#999999';
        inp.value = n[field] || dflt;
        inp.addEventListener('input', () => { pushUndoDebounced(); n[field] = inp.value; renderNodes(); saveToLocalStorage(); });
        const rst = document.createElement('button'); rst.className='prop-btn'; rst.title='Reset colour'; rst.textContent='↺';
        rst.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;margin-bottom:0;font-size:13px;display:flex;align-items:center;justify-content:center;';
        rst.addEventListener('click', () => {
          pushUndo(); n[field] = '';
          inp.value = getComputedStyle(document.documentElement).getPropertyValue(defaultVar).trim() || '#999999';
          renderNodes(); saveToLocalStorage();
        });
        inline.appendChild(inp); inline.appendChild(rst);
        row.appendChild(inline);
        body.appendChild(row);
      }
      makeBoundaryColorRow('Label colour',       'textColor',     '--text3');
      makeBoundaryColorRow('Description colour', 'subtitleColor', '--text3');
    }

    // Type
    addPropRow(body, 'Node type', () => {
      const sel = document.createElement('select');
      sel.className = 'prop-select';
      ['internal','external','boundary'].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t.charAt(0).toUpperCase()+t.slice(1);
        if (n.type===t) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => { pushUndo(); n.type = sel.value; renderNodes(); });
      return sel;
    });

    const typeDivider = document.createElement('div');
    typeDivider.className = 'prop-divider';
    body.appendChild(typeDivider);

    // Color
    const colorRow = document.createElement('div');
    colorRow.className = 'prop-row';
    const colorLbl = document.createElement('div'); colorLbl.className='prop-label'; colorLbl.textContent='Background colour';
    colorRow.appendChild(colorLbl);
    const colorInline = document.createElement('div'); colorInline.className='prop-row-inline';
    const colorInp = document.createElement('input'); colorInp.type='color'; colorInp.className='prop-input';
    colorInp.style.cssText = 'flex:1;min-width:0;height:32px;padding:2px 4px;cursor:pointer;';
    const _defaultNodeColor = getComputedStyle(document.documentElement).getPropertyValue(
      n.type === 'external' ? '--node-external' : '--node-internal'
    ).trim().replace(/^#([0-9a-f]{6})[0-9a-f]{0,2}$/i,'#$1') || '#ffffff';
    colorInp.value = n.color || _defaultNodeColor;
    colorInp.addEventListener('input', () => { pushUndoDebounced(); n.color = colorInp.value; updateNodeBg(); });
    const colorReset = document.createElement('button'); colorReset.className='prop-btn'; colorReset.title='Reset colour'; colorReset.textContent='↺';
    colorReset.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;margin-bottom:0;font-size:13px;display:flex;align-items:center;justify-content:center;';
    colorReset.addEventListener('click', () => {
      pushUndo(); n.color=''; n.colorOpacity=undefined;
      colorInp.value = getComputedStyle(document.documentElement).getPropertyValue(
        n.type === 'external' ? '--node-external' : '--node-internal'
      ).trim().replace(/^#([0-9a-f]{6})[0-9a-f]{0,2}$/i,'#$1') || '#ffffff';
      opacitySlider.value=255; updateSliderPct(opacitySlider); renderNodes();
    });
    colorInline.appendChild(colorInp); colorInline.appendChild(colorReset);
    colorRow.appendChild(colorInline);
    body.appendChild(colorRow);
    // Opacity slider
    const opRow = document.createElement('div'); opRow.className='prop-row';
    const opLbl = document.createElement('div'); opLbl.className='prop-label';
    const currentOp = n.colorOpacity !== undefined ? n.colorOpacity : 255;
    opLbl.textContent = 'Fill opacity — ' + Math.round(currentOp/255*100) + '%';
    opRow.appendChild(opLbl);
    const opSlider = document.createElement('input'); opSlider.type='range'; opSlider.className='prop-input';
    opSlider.min=0; opSlider.max=255; opSlider.value=currentOp;
    const opacitySlider = opSlider;
    updateSliderPct(opSlider);
    function updateNodeBg() {
      pushUndoDebounced();
      n.color = colorInp.value;
      n.colorOpacity = parseInt(opSlider.value);
      opLbl.textContent = 'Fill opacity — ' + Math.round(n.colorOpacity/255*100) + '%';
      renderNodes();
    }
    opSlider.addEventListener('input', () => { updateSliderPct(opSlider); updateNodeBg(); });
    opRow.appendChild(opSlider);
    body.appendChild(opRow);



    // Appearance slide-out button — not shown for boundary nodes
    if (n.type !== 'boundary') {
      const apBtn = document.createElement('button');
      apBtn.className = 'prop-btn accent ap-open-btn';
      apBtn.dataset.node = n.id;
      apBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.5v1M6 7.5v1M3.5 6h1M7.5 6h1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Content Style…';
      if (_apNodeId === n.id) apBtn.classList.add('active');
      apBtn.addEventListener('click', () => {
        if (_apNodeId === n.id) { closeAppearancePanel(); }
        else { openAppearancePanel(n.id); }
      });
      body.appendChild(apBtn);
    }

    // Style brush button
    const brushBtn = document.createElement('button');
    brushBtn.className = 'prop-btn accent brush-btn';
    brushBtn.dataset.node = n.id;
    if (_brushActive) brushBtn.classList.add('active');
    brushBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 12l3-3 5.5-5.5a1.5 1.5 0 0 0-2.1-2.1L3 7 2 12z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 3.5l1 1" stroke="currentColor" stroke-width="1.3"/><circle cx="2.5" cy="11.5" r="1" fill="currentColor" opacity="0.7"/></svg> Style Brush`;
    brushBtn.addEventListener('click', () => {
      if (_brushActive) { cancelStyleBrush(); }
      else { startStyleBrush(n.id); }
    });
    body.appendChild(brushBtn);

    const functionsDivider = document.createElement('div');
    functionsDivider.className = 'prop-divider';
    body.appendChild(functionsDivider);

    // Functions — compact summary + open modal button
    if (n.type !== 'boundary') {
      if (!n.functions) n.functions = [];
      n.functions = n.functions.map(f => typeof f === 'string' ? { name: f, inputs: '', outputs: '', description: '' } : f);

      const fnSection = document.createElement('div');
      fnSection.className = 'prop-row';

      const visibleFnCount = n.functions.filter(f => (f.name||'').trim() && !f.hidden).length;
      const hiddenFnCount = n.functions.filter(f => f.hidden).length;
      const fnBody = document.createElement('div');
      fnBody.className = 'prop-section-body';
      const fnHeader = createPropSectionHeader('Internal Functions', visibleFnCount + ' visible' + (hiddenFnCount ? ', ' + hiddenFnCount + ' hidden' : ''), 'functions', fnBody);
      fnSection.appendChild(fnHeader);

      // Per-function rows with visibility toggle + click-to-edit
      const fnList = document.createElement('div');
      fnList.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-bottom:8px;';
      const namedFns = n.functions.filter(f => (f.name||'').trim());
      if (namedFns.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:11px;color:var(--text3);font-style:italic;padding:2px 0;';
        empty.textContent = 'No functions defined yet';
        fnList.appendChild(empty);
      } else {
        namedFns.forEach((f, idx) => {
          // Find real index in n.functions (namedFns may skip empty entries)
          const realIdx = n.functions.indexOf(f);
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:5px;padding:3px 6px;border-radius:4px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:border-color 0.12s;' + (f.hidden ? 'opacity:0.45;' : '');
          row.title = 'Click to edit in function editor';
          // Eye toggle
          const eyeBtn = document.createElement('button');
          eyeBtn.style.cssText = 'flex-shrink:0;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;padding:0;color:var(--text3);opacity:' + (f.hidden ? '0.4' : '0.75') + ';transition:opacity 0.12s;';
          eyeBtn.title = f.hidden ? 'Show on canvas' : 'Hide from canvas';
          eyeBtn.innerHTML = f.hidden ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>';
          eyeBtn.addEventListener('click', e2 => {
            e2.stopPropagation();
            pushUndo();
            f.hidden = !f.hidden;
            renderNodes();
            requestAnimationFrame(() => renderArrows());
            renderSidebar();
            updateStatusBar();
            saveToLocalStorage();
          });
          // Name
          const nameSpan = document.createElement('span');
          nameSpan.style.cssText = 'flex:1;font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          nameSpan.textContent = (f.name||'').slice(0, 32);
          // Edit arrow
          const editArrow = document.createElement('span');
          editArrow.style.cssText = 'flex-shrink:0;font-size:10px;color:var(--text3);opacity:0.5;';
          editArrow.textContent = '›';
          row.appendChild(eyeBtn);
          row.appendChild(nameSpan);
          row.appendChild(editArrow);
          row.addEventListener('mouseenter', () => { row.style.borderColor = 'var(--border2)'; editArrow.style.opacity = '1'; });
          row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--border)'; editArrow.style.opacity = '0.5'; });
          row.addEventListener('click', () => {
            openFnModal(n.id);
            // Select the specific function after modal opens
            setTimeout(() => selectFn(realIdx), 60);
          });
          fnList.appendChild(row);
        });
      }
      fnBody.appendChild(fnList);

      // Edit button
      const editFnBtn = document.createElement('button');
      editFnBtn.className = 'prop-btn accent';
      editFnBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;';
      editFnBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg> Edit functions…';
      editFnBtn.addEventListener('click', () => openFnModal(n.id));
      fnBody.appendChild(editFnBtn);

      fnSection.appendChild(fnBody);
      body.appendChild(fnSection);
    }

    // Connections — compact summary above the action button
    if (n.type !== 'boundary') {
      const connSection = document.createElement('div');
      connSection.className = 'prop-row';

      const relatedConnections = state.arrows.filter(a => a.from === n.id || a.to === n.id);
      const connBody = document.createElement('div');
      connBody.className = 'prop-section-body';
      const connHeader = createPropSectionHeader('Connections', relatedConnections.length + ' total', 'connections', connBody);
      connSection.appendChild(connHeader);

      const connList = document.createElement('div');
      connList.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-bottom:8px;';
      if (relatedConnections.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:11px;color:var(--text3);font-style:italic;padding:2px 0;';
        empty.textContent = 'No connections yet';
        connList.appendChild(empty);
      } else {
        relatedConnections.forEach(a => {
          const otherId = a.from === n.id ? a.to : a.from;
          const other = state.nodes.find(x => x.id === otherId);
          const isOutgoing = a.from === n.id;
          const isBidir = a.direction === 'bidirectional';

          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:border-color 0.12s;';
          row.title = 'Click to select this connection';

          const dir = document.createElement('span');
          dir.style.cssText = 'flex-shrink:0;font-size:11px;color:var(--accent3);font-family:"IBM Plex Mono",monospace;';
          dir.textContent = isBidir ? '↔' : (isOutgoing ? '→' : '←');
          row.appendChild(dir);

          const info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';

          const name = document.createElement('div');
          name.style.cssText = 'font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          name.textContent = other
            ? ((other.tag ? other.tag + ' · ' : '') + (other.title || '').replace(/\n/g, ' '))
            : 'Unknown node';
          info.appendChild(name);

          const meta = document.createElement('div');
          meta.style.cssText = 'font-size:9px;color:var(--text3);font-family:"IBM Plex Mono",monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;';
          meta.textContent = a.label
            ? ((isBidir ? 'bidirectional' : (isOutgoing ? 'outgoing' : 'incoming')) + ' · ' + a.label)
            : (isBidir ? 'bidirectional' : (isOutgoing ? 'outgoing' : 'incoming'));
          info.appendChild(meta);

          row.appendChild(info);
          const editArrow = document.createElement('span');
          editArrow.style.cssText = 'flex-shrink:0;font-size:10px;color:var(--text3);opacity:0.5;';
          editArrow.textContent = '\u203A';
          row.appendChild(editArrow);
          row.addEventListener('mouseenter', () => { row.style.borderColor = 'var(--border2)'; editArrow.style.opacity = '1'; });
          row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--border)'; editArrow.style.opacity = '0.5'; });
          row.addEventListener('click', () => selectArrow(a.id));
          connList.appendChild(row);
        });
      }
      connBody.appendChild(connList);
      const connBtn = document.createElement('button');
      connBtn.className = 'prop-btn accent';
      connBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;';
      connBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="2.5" cy="6" r="1.5" fill="currentColor"/><circle cx="9.5" cy="6" r="1.5" fill="currentColor"/><line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.2"/></svg> New connection…';
      connBtn.addEventListener('click', () => openConnectModal(n.id));
      connBody.appendChild(connBtn);
      connSection.appendChild(connBody);
      body.appendChild(connSection);
    }

    const actionDivider = document.createElement('div');
    actionDivider.className = 'prop-divider';
    body.appendChild(actionDivider);

    const layerRow = document.createElement('div');
    layerRow.className = 'prop-row';
    const layerBody = document.createElement('div');
    layerBody.className = 'prop-section-body';
    const layerHeader = createPropSectionHeader('Layer order', 'Arrange', 'layering', layerBody);
    layerRow.appendChild(layerHeader);
    const layerGrid = document.createElement('div');
    layerGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;';
    const layerActions = [
      { mode: 'front', label: 'To front', icon: '↑↑', title: 'Bring node to front' },
      { mode: 'forward', label: 'Forward', icon: '↑', title: 'Move node forward' },
      { mode: 'backward', label: 'Backward', icon: '↓', title: 'Move node backward' },
      { mode: 'back', label: 'To back', icon: '↓↓', title: 'Send node to back' }
    ];
    layerActions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'prop-btn';
      btn.type = 'button';
      btn.title = action.title;
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-bottom:0;';
      btn.innerHTML = `<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;line-height:1;">${action.icon}</span><span>${action.label}</span>`;
      const enabled = canMoveNodeLayer(n.id, action.mode);
      btn.disabled = !enabled;
      if (!enabled) btn.style.opacity = '0.45';
      btn.addEventListener('click', () => {
        if (!canMoveNodeLayer(n.id, action.mode)) return;
        moveNodeLayer(n.id, action.mode);
      });
      layerGrid.appendChild(btn);
    });
    [
      { mode: 'front-of', label: 'In front of...', title: 'Pick another node to place this node in front of it' },
      { mode: 'behind', label: 'Behind...', title: 'Pick another node to place this node behind it' }
    ].forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'prop-btn accent layer-target-btn';
      btn.type = 'button';
      btn.title = action.title;
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-bottom:0;';
      btn.textContent = action.label;
      if (state.nodes.length < 2) {
        btn.disabled = true;
        btn.style.opacity = '0.45';
      }
      if (isNodeLayerTargetMode(n.id, action.mode)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        if (state.nodes.length < 2) return;
        startNodeLayerTargetMode(n.id, action.mode);
      });
      layerGrid.appendChild(btn);
    });
    layerBody.appendChild(layerGrid);
    layerRow.appendChild(layerBody);
    body.appendChild(layerRow);

    // Duplicate
    const dupBtn = document.createElement('button');
    dupBtn.className = 'prop-btn accent';
    dupBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;';
    dupBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 8V2a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Duplicate node';
    dupBtn.title = 'Duplicate this node (Ctrl+C then Ctrl+V)';
    dupBtn.addEventListener('click', () => {
      copySelectedNode();
      pasteNode();
    });
    body.appendChild(dupBtn);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.className = 'prop-btn danger'; delBtn.textContent = '✕ Delete node';
    delBtn.addEventListener('click', () => deleteSelected());
    body.appendChild(delBtn);

  } else if (selectedArrow) {
    const a = state.arrows.find(x => x.id===selectedArrow);
    if (!a) return;

    addPropRow(body, 'Label', () => {
      const ta = document.createElement('textarea');
      ta.className = 'prop-input';
      ta.rows = 2;
      ta.style.cssText = 'resize:vertical;min-height:42px;line-height:1.4;font-family:inherit;font-size:11.5px;';
      ta.placeholder = 'Connection label… (Shift+Enter for new line)';
      ta.value = a.label || '';
      ta.addEventListener('input', () => {
        pushUndoDebounced();
        a.label = ta.value;
        renderArrows(); saveToLocalStorage();
      });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
      });
      return ta;
    });

    // Line style
    addPropRow(body, 'Line style', () => {
      const row = document.createElement('div');
      row.className = 'line-style-row';
      const styles = [{v:'curved',l:'∿'},{v:'straight',l:'╱'},{v:'orthogonal',l:'⌐'}];
      styles.forEach(s => {
        const b = document.createElement('button');
        b.className = 'line-style-btn' + ((a.lineStyle||'curved')===s.v?' active':'');
        b.textContent = s.l; b.title = s.v.charAt(0).toUpperCase()+s.v.slice(1);
        b.addEventListener('click', () => {
          pushUndo(); a.lineStyle = s.v;
          // Reset offsets when switching styles
          a.bend = 0; a.orthoY = 0;
          renderArrows(); saveToLocalStorage();
          renderPropsPanel(); // rebuild so correct sliders render
        });
        row.appendChild(b);
      });
      return row;
    });

    addPropRow(body, 'Direction', () => {
      const row = document.createElement('div');
      row.className = 'dir-toggle-row';
      const opts = [{v:'directed',l:'→'},{v:'bidirectional',l:'↔'},{v:'undirected',l:'──'}];
      opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'dir-btn' + (a.direction===o.v?' active':'');
        b.textContent = o.l; b.title = o.v;
        b.addEventListener('click', () => {
          pushUndo();
          a.direction = o.v;
          row.querySelectorAll('.dir-btn').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          renderArrows();
        });
        row.appendChild(b);
      });
      return row;
    });

    // From/To port
    addPropRow(body, 'From port (source)', () => makePortSelect(a, 'fromPos', () => { renderArrows(); renderSidebar(); }));
    addPropRow(body, 'To port (target)', () => makePortSelect(a, 'toPos', () => { renderArrows(); renderSidebar(); }));

    // Bend
    const _isOrth = a.lineStyle === 'orthogonal';
    const _isStraight = a.lineStyle === 'straight';

    // For curved: bend slider. For orthogonal: two offset sliders. For straight: nothing.
    if (!_isStraight && !_isOrth) {
      const bendRow = document.createElement('div');
      bendRow.className = 'prop-row bend-row';
      const bendLbl = document.createElement('div'); bendLbl.className='prop-label'; bendLbl.textContent='Curve / bend';
      bendRow.appendChild(bendLbl);
      const bendInp = document.createElement('input'); bendInp.type='range'; bendInp.className='prop-input';
      bendInp.min=-120; bendInp.max=120; bendInp.value=a.bend||0;
      updateSliderPct(bendInp);
      bendInp.addEventListener('input', () => { updateSliderPct(bendInp); pushUndoDebounced(); a.bend = parseInt(bendInp.value); renderArrows(); });
      bendRow.appendChild(bendInp);
      body.appendChild(bendRow);
    }
    const hasManualEndpointOffsets = getArrowEndOffset(a, 'from') !== null || getArrowEndOffset(a, 'to') !== null;
    const resetControlsRow = document.createElement('div');
    resetControlsRow.style.cssText = 'display:flex;justify-content:flex-end;gap:6px;margin-bottom:6px;';
    function setMiniResetDisabled(btn, disabled) {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.45' : '1';
      btn.style.cursor = disabled ? 'default' : 'pointer';
    }
    if (_isOrth) {
      const hasManualRouting = () => Math.round(a.bend || 0) !== 0 || Math.round(a.orthoY || 0) !== 0;
      const resetRouteBtn = document.createElement('button');
      resetRouteBtn.textContent = '\u21ba Reset routing';
      resetRouteBtn.title = 'Reset connection path to default';
      resetRouteBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-size:10px;';
      setMiniResetDisabled(resetRouteBtn, !hasManualRouting());
      resetRouteBtn.addEventListener('click', () => {
        if (!hasManualRouting()) return;
        pushUndo(); a.bend = 0; a.orthoY = 0;
        const slA = document.getElementById('ortho-slider-bend');
        const slB = document.getElementById('ortho-slider-orthoY');
        if (slA) { slA.value = 0; updateSliderPct(slA); }
        if (slB) { slB.value = 0; updateSliderPct(slB); }
        setMiniResetDisabled(resetRouteBtn, true);
        renderArrows(); saveToLocalStorage(); renderSidebar();
      });
      resetControlsRow.appendChild(resetRouteBtn);
    }
    const resetEndpointsBtn = document.createElement('button');
    resetEndpointsBtn.textContent = '\u21ba Reset end-points';
    resetEndpointsBtn.title = 'Reset manual endpoint positions to the default side midpoint';
    resetEndpointsBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-size:10px;';
    if (!hasManualEndpointOffsets) {
      resetEndpointsBtn.disabled = true;
      resetEndpointsBtn.style.opacity = '0.45';
      resetEndpointsBtn.style.cursor = 'default';
    }
    resetEndpointsBtn.addEventListener('click', () => {
      if (!hasManualEndpointOffsets) return;
      pushUndo();
      a.fromOffset = null;
      a.toOffset = null;
      saveToLocalStorage();
      selectArrow(a.id);
    });
    resetControlsRow.appendChild(resetEndpointsBtn);
    body.appendChild(resetControlsRow);

    if (_isOrth) {
      // Two sliders ? one per axis. Labels depend on from-port direction.
      const fromP = a.fromPos || 'e';
      const isHorizExit = (fromP === 'e' || fromP === 'w');
      const labelA = isHorizExit ? 'Column X position' : 'Crossbar Y position';
      const labelB = isHorizExit ? 'Crossbar Y position' : 'Column X position';

      [[labelA, 'bend', 'ortho-slider-bend'], [labelB, 'orthoY', 'ortho-slider-orthoY']].forEach(([lbl, prop, sid]) => {
        const row = document.createElement('div');
        row.className = 'prop-row';
        const rl = document.createElement('div'); rl.className = 'prop-label'; rl.textContent = lbl;
        row.appendChild(rl);
        const sl = document.createElement('input'); sl.type = 'range'; sl.className = 'prop-input';
        sl.id = sid; sl.min = -300; sl.max = 300; sl.value = Math.round(a[prop] || 0);
        updateSliderPct(sl);
        sl.addEventListener('input', () => {
          updateSliderPct(sl);
          pushUndoDebounced();
          a[prop] = parseInt(sl.value);
          const routeResetBtn = resetControlsRow.querySelector('button');
          if (routeResetBtn && routeResetBtn.textContent.includes('Reset routing')) {
            setMiniResetDisabled(routeResetBtn, Math.round(a.bend || 0) === 0 && Math.round(a.orthoY || 0) === 0);
          }
          renderArrows();
          saveToLocalStorage();
        });
        row.appendChild(sl);
        body.appendChild(row);
      });
    }

    addPropRow(body, 'Stroke pattern', () => {
      const row = document.createElement('div');
      row.className = 'stroke-style-row';
      row.dataset.control = 'stroke-style';
      const options = [
        { v: 'solid', l: 'Solid', dash: '' },
        { v: 'dashed', l: 'Dash', dash: '6 3' },
        { v: 'dotted', l: 'Dot', dash: '1.5 4' },
        { v: 'dashdot', l: 'Dash-dot', dash: '8 3 1.5 3' }
      ];
      const activeStyle = getArrowStrokeStyle(a);
      options.forEach(opt => {
        const b = document.createElement('button');
        b.className = 'stroke-style-btn' + (activeStyle === opt.v ? ' active' : '');
        b.title = opt.l;
        b.innerHTML =
          '<svg viewBox="0 0 22 8" aria-hidden="true">' +
            '<line x1="1" y1="4" x2="21" y2="4"' + (opt.dash ? ' stroke-dasharray="' + opt.dash + '"' : '') + ' />' +
          '</svg>' +
          '<span class="stroke-style-btn-label">' + opt.l + '</span>';
        b.addEventListener('click', () => {
          pushUndo();
          a.strokeStyle = opt.v;
          a.dash = opt.v === 'dashed';
          renderArrows();
          saveToLocalStorage();
          row.querySelectorAll('.stroke-style-btn').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
        });
        row.appendChild(b);
      });
      return row;
    });

    const arrowLayerRow = document.createElement('div');
    arrowLayerRow.className = 'prop-row';
    const arrowLayerLbl = document.createElement('div');
    arrowLayerLbl.className = 'prop-label';
    arrowLayerLbl.textContent = 'Connection order';
    arrowLayerRow.appendChild(arrowLayerLbl);
    const arrowLayerGrid = document.createElement('div');
    arrowLayerGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;';
    const arrowLayerActions = [
      { mode: 'front', label: 'To front', icon: '↑↑', title: 'Bring connection to front' },
      { mode: 'forward', label: 'Forward', icon: '↑', title: 'Move connection forward' },
      { mode: 'backward', label: 'Backward', icon: '↓', title: 'Move connection backward' },
      { mode: 'back', label: 'To back', icon: '↓↓', title: 'Send connection to back' }
    ];
    arrowLayerActions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'prop-btn';
      btn.type = 'button';
      btn.title = action.title;
      btn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-bottom:0;';
      btn.innerHTML = `<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;line-height:1;">${action.icon}</span><span>${action.label}</span>`;
      const enabled = canMoveArrowLayer(a.id, action.mode);
      btn.disabled = !enabled;
      if (!enabled) btn.style.opacity = '0.45';
      btn.addEventListener('click', () => {
        if (!canMoveArrowLayer(a.id, action.mode)) return;
        moveArrowLayer(a.id, action.mode);
      });
      arrowLayerGrid.appendChild(btn);
    });
    arrowLayerRow.appendChild(arrowLayerGrid);
    body.appendChild(arrowLayerRow);

    // Color
    const colorRow2 = document.createElement('div');
    colorRow2.className = 'prop-row';
    const cl2 = document.createElement('div'); cl2.className='prop-label'; cl2.textContent='Connector colour';
    colorRow2.appendChild(cl2);
    const ci2Inline = document.createElement('div'); ci2Inline.className='prop-row-inline';
    const ci2 = document.createElement('input'); ci2.type='color'; ci2.className='prop-input';
    ci2.style.cssText = 'flex:1;min-width:0;height:32px;padding:2px 4px;cursor:pointer;';
    ci2.value = a.color || getComputedStyle(document.documentElement).getPropertyValue('--arrow-color').trim() || '#ff8c42';
    ci2.addEventListener('input', () => { pushUndoDebounced(); a.color=ci2.value; renderArrows(); });
    const ci2Reset = document.createElement('button'); ci2Reset.className='prop-btn'; ci2Reset.title='Reset colour'; ci2Reset.textContent='↺';
    ci2Reset.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;margin-bottom:0;font-size:13px;display:flex;align-items:center;justify-content:center;';
    ci2Reset.addEventListener('click', () => {
      pushUndo(); a.color='';
      ci2.value = getComputedStyle(document.documentElement).getPropertyValue('--arrow-color').trim() || '#ff8c42';
      renderArrows(); saveToLocalStorage();
    });
    ci2Inline.appendChild(ci2); ci2Inline.appendChild(ci2Reset);
    colorRow2.appendChild(ci2Inline);
    body.appendChild(colorRow2);

    // ── Label section ──
    const lblSec = document.createElement('div');
    lblSec.className = 'prop-row';
    const lblSecHead = document.createElement('div');
    lblSecHead.className = 'prop-label'; lblSecHead.textContent = 'Label style';
    lblSec.appendChild(lblSecHead);

    // Bold / Italic toggles + colour + reset position
    const lblStyleRow = document.createElement('div');
    lblStyleRow.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap;';

    const boldBtn = document.createElement('button');
    boldBtn.textContent = 'B'; boldBtn.title = 'Bold';
    boldBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:'+(a.labelBold?'var(--surface3)':'transparent')+';color:'+(a.labelBold?'var(--text)':'var(--text2)')+';font-weight:700;cursor:pointer;font-size:11px;';
    boldBtn.addEventListener('click', () => {
      pushUndo(); a.labelBold = !a.labelBold;
      boldBtn.style.background = a.labelBold ? 'var(--surface3)' : 'transparent';
      boldBtn.style.color = a.labelBold ? 'var(--text)' : 'var(--text2)';
      renderArrows(); saveToLocalStorage();
    });

    const italicBtn = document.createElement('button');
    italicBtn.textContent = 'I'; italicBtn.title = 'Italic';
    italicBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:'+(a.labelItalic?'var(--surface3)':'transparent')+';color:'+(a.labelItalic?'var(--text)':'var(--text2)')+';font-style:italic;cursor:pointer;font-size:11px;';
    italicBtn.addEventListener('click', () => {
      pushUndo(); a.labelItalic = !a.labelItalic;
      italicBtn.style.background = a.labelItalic ? 'var(--surface3)' : 'transparent';
      italicBtn.style.color = a.labelItalic ? 'var(--text)' : 'var(--text2)';
      renderArrows(); saveToLocalStorage();
    });

    const lblColorInp = document.createElement('input');
    lblColorInp.type = 'color'; lblColorInp.title = 'Label colour';
    lblColorInp.value = a.labelColor || '#9aa0b8';
    lblColorInp.style.cssText = 'width:28px;height:22px;padding:1px 3px;border:1px solid var(--border);border-radius:4px;background:var(--surface2);cursor:pointer;';
    lblColorInp.addEventListener('input', () => {
      pushUndoDebounced(); a.labelColor = lblColorInp.value;
      renderArrows(); saveToLocalStorage();
    });

    const resetPosBtn = document.createElement('button');
    resetPosBtn.textContent = '↺ Reset position'; resetPosBtn.title = 'Reset label to midpoint';
    resetPosBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-size:10px;margin-left:auto;';
    resetPosBtn.addEventListener('click', () => {
      pushUndo();
      a.labelOffsetX = 0; a.labelOffsetY = 0;
      renderArrows(); saveToLocalStorage();
    });

    lblStyleRow.appendChild(boldBtn);
    lblStyleRow.appendChild(italicBtn);
    lblStyleRow.appendChild(lblColorInp);
    lblStyleRow.appendChild(resetPosBtn);
    lblSec.appendChild(lblStyleRow);

    const lblHint = document.createElement('div');
    lblHint.style.cssText = 'font-size:9.5px;color:var(--text3);margin-top:5px;font-family:"IBM Plex Mono",monospace;';
    lblHint.textContent = '↖ Drag to reposition · Double-click to edit inline';
    lblSec.appendChild(lblHint);
    body.appendChild(lblSec);

    const delBtn = document.createElement('button');
    delBtn.className = 'prop-btn danger'; delBtn.textContent = '✕ Delete arrow';
    delBtn.addEventListener('click', () => deleteSelected());
    body.appendChild(delBtn);
  }
}

function addPropRow(parent, label, makeEl) {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('div'); lbl.className='prop-label'; lbl.textContent=label;
  row.appendChild(lbl);
  const el = makeEl();
  row.appendChild(el);
  parent.appendChild(row);
}

function addPropTextInput(parent, label, obj, key, onChange) {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('div'); lbl.className='prop-label'; lbl.textContent=label;
  row.appendChild(lbl);
  const inp = document.createElement('input'); inp.type='text'; inp.className='prop-input';
  inp.value = obj[key]||'';
  inp.addEventListener('input', () => { obj[key]=inp.value; onChange(); saveToLocalStorage(); });
  row.appendChild(inp);
  parent.appendChild(row);
}

function makePortSelect(obj, key, onChange) {
  const sel = document.createElement('select');
  sel.className = 'prop-select';
  const opts = [{v:'n',l:'Top (N)'},{v:'s',l:'Bottom (S)'},{v:'e',l:'Right (E)'},{v:'w',l:'Left (W)'}];
  opts.forEach(o => {
    const opt = document.createElement('option'); opt.value=o.v; opt.textContent=o.l;
    if (obj[key]===o.v) opt.selected=true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    pushUndo();
    obj[key]=sel.value;
    if (key === 'fromPos') obj.fromOffset = null;
    if (key === 'toPos') obj.toOffset = null;
    onChange();
    saveToLocalStorage();
  });
  return sel;
}

function updateStatusBar() {
  const nonBoundary = state.nodes.filter(n => n.type !== 'boundary');
  document.getElementById('sb-nodes').textContent = `⬡ ${nonBoundary.length} nodes`;
  document.getElementById('sb-arrows').textContent = `→ ${state.arrows.length} connections`;
  const allFns = nonBoundary.flatMap(n => (n.functions||[]).filter(f => (f.name||'').trim() && !f.hidden));
  document.getElementById('sb-functions').textContent = `⚙ ${allFns.length} functions`;
  const totalIO = allFns.reduce((sum, f) => {
    const ins  = Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : []);
    const outs = Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : []);
    return sum + ins.filter((_,i) => !(f.hiddenInputs||[]).includes(i)).length
               + outs.filter((_,i) => !(f.hiddenOutputs||[]).includes(i)).length;
  }, 0);
  document.getElementById('sb-io').textContent = `⇅ ${totalIO} I/O`;
}
