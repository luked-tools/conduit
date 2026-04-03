// NODE DETAIL MODAL
let activeNodeModalId = null;
let nmSaveTimer = null;

function openNodeModal(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  activeNodeModalId = nodeId;
  if (!n.functions) n.functions = [];
  if (!n.notes) n.notes = '';
  // Ensure each function has io metadata
  n.functions = n.functions.map(f => {
    if (typeof f === 'string') f = { name: f, inputs: [], outputs: [], description: '' };
    if (!Array.isArray(f.inputs))  f.inputs  = f.inputs  ? [f.inputs]  : [];
    if (!Array.isArray(f.outputs)) f.outputs = f.outputs ? [f.outputs] : [];
    if (f.hidden === undefined) f.hidden = false;
    return f;
  });

  // Header
  const badge = document.getElementById('nm-type-badge');
  badge.className = 'nm-type-badge ' + n.type;
  badge.textContent = n.type === 'external' ? 'EXT' : 'INT';
  badge.style.cssText = n.type === 'internal'
    ? 'background:var(--node-internal);border-left:3px solid var(--node-internal-border);border:1px solid var(--border);color:var(--accent3);'
    : 'background:var(--node-external);border-left:3px dashed var(--node-external-border);border:1px solid var(--border);color:var(--accent2);';
  // Populate editable header inputs
  const nmTagInput      = document.getElementById('nm-tag-input');
  const nmTitleInput    = document.getElementById('nm-title-input');
  const nmSubtitleInput = document.getElementById('nm-subtitle-input');

  nmTagInput.value      = n.tag      || '';
  nmTitleInput.value    = n.title    || '';
  nmSubtitleInput.value = n.subtitle || '';

  function autosizeNMHeaderField(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    const styles = getComputedStyle(el);
    const maxH = parseFloat(styles.maxHeight) || Infinity;
    el.style.height = '0px';
    const nextH = Math.min(el.scrollHeight, maxH);
    el.style.height = nextH + 'px';
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }
  autosizeNMHeaderField(nmTitleInput);
  autosizeNMHeaderField(nmSubtitleInput);
  requestAnimationFrame(() => {
    autosizeNMHeaderField(nmTitleInput);
    autosizeNMHeaderField(nmSubtitleInput);
  });

  // Wire inputs directly - read from the live DOM elements that the user types into
  function nmFieldSave() {
    const tagEl   = document.getElementById('nm-tag-input');
    const titleEl = document.getElementById('nm-title-input');
    const subEl   = document.getElementById('nm-subtitle-input');
    pushUndoDebounced();
    n.tag      = (tagEl   ? tagEl.value.trim().toUpperCase()   : n.tag);
    n.title    = (titleEl ? titleEl.value                       : n.title);
    n.subtitle = (subEl   ? subEl.value                         : n.subtitle);
    if (tagEl) tagEl.value = n.tag;
    autosizeNMHeaderField(titleEl);
    autosizeNMHeaderField(subEl);
    renderNodes();
    renderArrows();
    renderSidebar();
    triggerNMSaved();
    saveToLocalStorage();
  }
  nmTagInput.oninput = nmFieldSave;
  nmTitleInput.oninput = () => {
    nmFieldSave();
    requestAnimationFrame(() => autosizeNMHeaderField(nmTitleInput));
  };
  nmSubtitleInput.oninput = () => {
    nmFieldSave();
    requestAnimationFrame(() => autosizeNMHeaderField(nmSubtitleInput));
  };
  nmTitleInput.onfocus = () => requestAnimationFrame(() => autosizeNMHeaderField(nmTitleInput));
  nmSubtitleInput.onfocus = () => requestAnimationFrame(() => autosizeNMHeaderField(nmSubtitleInput));
  nmTagInput.onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); };

  const notesArea = document.getElementById('nm-notes-area');
  notesArea.value = n.notes || '';
  notesArea.oninput = () => {
    pushUndoDebounced();
    n.notes = notesArea.value;
    triggerNMSaved();
    saveToLocalStorage();
  };

  switchNMTab('overview');

  const overlay = document.getElementById('node-modal-overlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNodeModal() {
  const overlay = document.getElementById('node-modal-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  activeNodeModalId = null;
  renderNodes();
  renderArrows();
}

function switchNMTab(tab) {
  document.querySelectorAll('.nm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.nm-tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('nm-panel-' + tab);
  if (panel) {
    panel.classList.add('active');
    buildNMPanel(tab, panel);
  }
}

function buildNMPanel(tab, panel) {
  const n = state.nodes.find(x => x.id === activeNodeModalId);
  if (!n) return;

  if (tab === 'overview') {
    buildNMOverview(n, panel);
  } else if (tab === 'connections') {
    buildNMConnections(n, panel);
  } else if (tab === 'functions') {
    buildNMFunctions(n, panel);
  }
}

function buildNMOverview(n, panel) {
  const arrows = state.arrows;
  const outgoing = arrows.filter(a => a.from === n.id);
  const incoming = arrows.filter(a => a.to === n.id);
  const fnCount = (n.functions || []).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim()).length;

  panel.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'nm-overview-grid';
  grid.innerHTML = `
    <div class="nm-stat-card">
      <div class="nm-stat-label">CONNECTIONS</div>
      <div class="nm-stat-value">${outgoing.length + incoming.length}</div>
      <div class="nm-stat-sub">${outgoing.length} out · ${incoming.length} in</div>
    </div>
    <div class="nm-stat-card">
      <div class="nm-stat-label">FUNCTIONS</div>
      <div class="nm-stat-value">${fnCount}</div>
      <div class="nm-stat-sub">${fnCount ? 'defined' : 'none yet'}</div>
    </div>
    <div class="nm-stat-card">
      <div class="nm-stat-label">NODE TYPE</div>
      <div class="nm-stat-value" style="font-size:14px;margin-top:4px;">
        <span class="nm-badge ${n.type}">${n.type.charAt(0).toUpperCase()+n.type.slice(1)}</span>
      </div>
      <div class="nm-stat-sub">${n.tag || 'no tag'}</div>
    </div>
    <div class="nm-stat-card">
      <div class="nm-stat-label">NOTES</div>
      <div class="nm-stat-value" style="font-size:13px;font-weight:400;color:var(--text2);margin-top:4px;">${(n.notes||'').length ? (n.notes||'').slice(0,60)+'…' : '—'}</div>
    </div>
  `;
  panel.appendChild(grid);

  if (outgoing.length + incoming.length > 0) {
    const connHead = document.createElement('div');
    connHead.className = 'nm-fn-field-label';
    connHead.style.marginBottom = '8px';
    connHead.textContent = 'Quick connection map';
    panel.appendChild(connHead);

    const allConn = [
      ...outgoing.map(a => ({ arrow: a, dir: 'out', otherId: a.to })),
      ...incoming
        .filter(a => a.direction !== 'bidirectional' || !outgoing.find(o => o.id === a.id))
        .map(a => ({ arrow: a, dir: a.direction === 'bidirectional' ? 'both' : 'in', otherId: a.from }))
    ];
    const seen = new Set();
    const deduped = [];
    allConn.forEach(c => {
      const key = c.arrow.id;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(c);
      }
    });

    deduped.forEach(({ arrow, dir, otherId }) => {
      const other = state.nodes.find(x => x.id === otherId);
      if (!other) return;
      const item = document.createElement('div');
      item.className = 'nm-quick-conn-item';
      const dirEmoji = dir === 'out' ? '→' : dir === 'in' ? '←' : '↔';
      item.innerHTML = `<span style="color:var(--text3);font-family:'IBM Plex Mono',monospace;">${dirEmoji}</span>
        <span class="nm-badge ${other.type}">${other.tag || other.type.toUpperCase()}</span>
        <span>${other.title.replace(/\n/g,' ')}</span>
        ${arrow.label ? `<span style="color:var(--text3);font-size:10px;font-family:'IBM Plex Mono',monospace;">· ${arrow.label}</span>` : ''}`;
      panel.appendChild(item);
    });
  }
}

function buildNMConnections(n, panel) {
  panel.innerHTML = '';
  const arrows = state.arrows;
  const outgoing = arrows.filter(a => a.from === n.id && a.direction === 'directed');
  const incoming = arrows.filter(a => a.to === n.id && a.direction === 'directed');
  const bidir = arrows.filter(a => a.direction === 'bidirectional' && (a.from === n.id || a.to === n.id));

  function connGroup(label, list, dirClass, dirText, getOtherId) {
    if (!list.length) return;
    const g = document.createElement('div');
    g.className = 'nm-conn-group';
    const gl = document.createElement('div');
    gl.className = 'nm-conn-group-label';
    gl.textContent = label;
    g.appendChild(gl);
    list.forEach(a => {
      const otherId = getOtherId(a);
      const other = state.nodes.find(x => x.id === otherId);
      if (!other) return;
      const item = document.createElement('div');
      item.className = 'nm-conn-item';
      const arrow = document.createElement('span');
      arrow.className = 'nm-conn-arrow';
      arrow.textContent = dirClass === 'both' ? '↔' : dirClass === 'out' ? '→' : '←';
      arrow.style.color = dirClass === 'out' ? 'var(--accent)' : dirClass === 'in' ? 'var(--accent2)' : 'var(--accent3)';
      const info = document.createElement('div');
      info.className = 'nm-conn-info';
      info.innerHTML = `<div class="nm-conn-node">${other.title.replace(/\n/g,' ')} ${other.tag ? '<span style="color:var(--text3);font-size:10px;">(' + other.tag + ')</span>' : ''}</div>
        ${a.label ? '<div class="nm-conn-label">' + a.label + '</div>' : ''}`;
      const badge = document.createElement('span');
      badge.className = 'nm-conn-dir-badge ' + dirClass;
      badge.textContent = dirText;
      item.appendChild(arrow);
      item.appendChild(info);
      item.appendChild(badge);
      item.addEventListener('click', () => {
        closeNodeModal();
        selectNode(other.id);
      });
      item.style.cursor = 'pointer';
      item.title = 'Click to select ' + other.title.replace(/\n/g,' ');
      g.appendChild(item);
    });
    panel.appendChild(g);
  }

  connGroup('Outgoing (this → other)', outgoing, 'out', 'OUTPUT', a => a.to);
  connGroup('Incoming (other → this)', incoming, 'in', 'INPUT', a => a.from);
  connGroup('Bidirectional', bidir, 'both', 'BOTH', a => a.from === n.id ? a.to : a.from);

  if (outgoing.length + incoming.length + bidir.length > 0) {
    const addConnBtn2 = document.createElement('button');
    addConnBtn2.className = 'nm-fn-add-btn';
    addConnBtn2.style.marginTop = '8px';
    addConnBtn2.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Add connection from this node';
    addConnBtn2.addEventListener('click', () => openConnectFromNode(n.id));
    panel.appendChild(addConnBtn2);
  }

  if (!outgoing.length && !incoming.length && !bidir.length) {
    const noConnWrap = document.createElement('div');
    noConnWrap.innerHTML = '<div class="nm-empty" style="margin-bottom:12px;">No connections yet.</div>';
    panel.appendChild(noConnWrap);
    const addConnBtn = document.createElement('button');
    addConnBtn.className = 'nm-fn-add-btn';
    addConnBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Add connection from this node';
    addConnBtn.addEventListener('click', () => openConnectFromNode(n.id));
    panel.appendChild(addConnBtn);
  }
}

function buildNMFunctions(n, panel) {
  panel.innerHTML = '';
  if (!n.functions) n.functions = [];

  n.functions = n.functions.map(f => {
    if (typeof f === 'string') f = { name: f, inputs: [], outputs: [], description: '' };
    if (!Array.isArray(f.inputs))  f.inputs  = f.inputs  ? [f.inputs]  : [];
    if (!Array.isArray(f.outputs)) f.outputs = f.outputs ? [f.outputs] : [];
    if (f.hidden === undefined) f.hidden = false;
    return f;
  });

  function renderCards() {
    panel.innerHTML = '';

    if (n.functions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'nm-fn-none';
      empty.textContent = 'No functions defined yet.';
      panel.appendChild(empty);
    }

    n.functions.forEach((fn, i) => {
      const card = document.createElement('div');
      card.className = 'nm-fn-card';

      const header = document.createElement('div');
      header.className = 'nm-fn-card-header';

      const dot = document.createElement('div');
      dot.className = 'nm-fn-card-dot' + (fn.hidden ? ' hidden-dot' : '');
      if (!fn.hidden && n.type === 'external') dot.style.background = 'var(--accent2)';

      const nameEl = document.createElement('div');
      nameEl.className = 'nm-fn-card-name' + (fn.hidden ? ' hidden-name' : '');
      nameEl.textContent = (fn.name || '').trim() || 'Untitled function';

      header.appendChild(dot);
      header.appendChild(nameEl);

      if (fn.hidden) {
        const hpill = document.createElement('span');
        hpill.className = 'nm-fn-hidden-pill';
        hpill.textContent = 'hidden';
        header.appendChild(hpill);
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'nm-fn-edit-btn';
      editBtn.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10" fill="none">' +
        '<path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
        '</svg> Edit';
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeNodeModal();
        openFnModal(n.id);
        setTimeout(() => selectFn(i), 30);
      });
      header.appendChild(editBtn);
      card.appendChild(header);

      const hasInputs  = fn.inputs.length > 0;
      const hasOutputs = fn.outputs.length > 0;
      const hasDesc    = (fn.description || '').trim();
      const hasMeta    = (fn.owner || fn.trigger || fn.system);

      if (hasInputs || hasOutputs || hasDesc || hasMeta) {
        const body = document.createElement('div');
        body.className = 'nm-fn-card-body';

        if (hasInputs || hasOutputs) {
          const ioRow = document.createElement('div');
          ioRow.className = 'nm-fn-io-row';

          ['inputs', 'outputs'].forEach(key => {
            const col = document.createElement('div');
            col.className = 'nm-fn-io-col';
            const lbl = document.createElement('div');
            lbl.className = 'nm-fn-io-label ' + (key === 'inputs' ? 'in' : 'out');
            lbl.innerHTML = (key === 'inputs'
              ? '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4h6M4.5 1.5L7 4l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Inputs'
              : '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M7 4H1M3.5 1.5L1 4l2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Outputs');
            col.appendChild(lbl);
            const arr = fn[key];
            if (arr.length === 0) {
              const none = document.createElement('div');
              none.className = 'nm-fn-io-none';
              none.textContent = '—';
              col.appendChild(none);
            } else {
              const pillWrap = document.createElement('div');
              pillWrap.className = 'nm-fn-pills';
              arr.forEach(v => {
                const p = document.createElement('span');
                p.className = 'nm-fn-pill ' + (key === 'inputs' ? 'in' : 'out');
                setIOPillLabel(p, key === 'inputs' ? 'IN' : 'OUT', v);
                pillWrap.appendChild(p);
              });
              col.appendChild(pillWrap);
            }
            ioRow.appendChild(col);
          });

          body.appendChild(ioRow);
        }

        if (hasDesc) {
          const desc = document.createElement('div');
          desc.className = 'nm-fn-desc';
          desc.textContent = fn.description;
          body.appendChild(desc);
        }

        if (hasMeta) {
          const metaRow = document.createElement('div');
          metaRow.className = 'nm-fn-meta-row';
          const metaItems = [
            { label: 'Owner', val: fn.owner },
            { label: 'Trigger', val: fn.trigger },
            { label: 'System', val: fn.system },
          ];
          metaItems.forEach(({ label, val }) => {
            if (!val) return;
            const chip = document.createElement('div');
            chip.className = 'nm-fn-meta-chip';
            chip.innerHTML = label + ': <b>' + val + '</b>';
            metaRow.appendChild(chip);
          });
          if (metaRow.childNodes.length) body.appendChild(metaRow);
        }

        card.appendChild(body);
      }

      panel.appendChild(card);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'nm-fn-add-btn';
    addBtn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
      '<line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg> Add function';
    addBtn.addEventListener('click', () => {
      closeNodeModal();
      openFnModal(n.id);
      setTimeout(() => addFnAndSelect(), 30);
    });
    panel.appendChild(addBtn);
  }

  renderCards();
}

function triggerNMSaved() {
  const badge = document.getElementById('nm-saved-badge');
  badge.style.opacity = '1';
  clearTimeout(nmSaveTimer);
  nmSaveTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1800);
  renderSidebar();
}

document.getElementById('node-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('node-modal-overlay')) closeNodeModal();
});

document.addEventListener('keydown', e => {
  const overlay = document.getElementById('node-modal-overlay');
  if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
    closeNodeModal();
  }
});
