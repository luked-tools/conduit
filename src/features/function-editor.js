// Function editor modal extracted from main.js

// ══════════════════════════════════════════════
// FUNCTION EDITOR MODAL
// ══════════════════════════════════════════════
let fnModalNodeId = null;
let activeFnIdx = null;
let fnAutoSaveTimer = null;

function openFnModal(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  fnModalNodeId = nodeId;
  activeFnIdx = null;

  // Normalise functions to objects
  n.functions = (n.functions || []).map(f =>
    typeof f === 'string' ? { name: f, inputs: '', outputs: '', description: '' } : f
  );

  // Header
  document.getElementById('fn-modal-title').textContent = (n.title || '').replace(/\n/g, ' ');
  document.getElementById('fn-modal-sub').textContent = n.tag ? n.tag + ' · ' + (n.type || '') : n.type || '';

  renderFnList();
  showFnDetail(null);

  const _el_fn_modal_overlay_add = document.getElementById('fn-modal-overlay'); if (_el_fn_modal_overlay_add) _el_fn_modal_overlay_add.classList.add('open');
  document.body.style.overflow = 'hidden';

  // If functions exist, auto-select first
  if (n.functions.length > 0) selectFn(0);
}

function closeFnModal() {
  const _el_fn_modal_overlay_remove = document.getElementById('fn-modal-overlay'); if (_el_fn_modal_overlay_remove) _el_fn_modal_overlay_remove.classList.remove('open');
  document.body.style.overflow = '';
  fnModalNodeId = null;
  activeFnIdx = null;
  // Sync canvas and sidebar
  renderNodes();
  renderSidebar();
}

function buildFnListItem(fn, i, n) {
  const item = document.createElement('div');
  item.className = 'fn-list-item' + (activeFnIdx === i ? ' active' : '');
  item.dataset.idx = i;

  const grip = document.createElement('span');
  grip.className = 'fn-list-grip';
  grip.textContent = '⠿';
  grip.title = 'Drag to reorder';

  const dot = document.createElement('div');
  dot.className = 'fn-list-dot';

  const name = document.createElement('div');
  name.className = 'fn-list-name';
  name.textContent = (fn.name || '').trim() || 'Untitled function';
  if (!(fn.name || '').trim()) name.style.fontStyle = 'italic';

  item.appendChild(grip);
  item.appendChild(dot);
  item.appendChild(name);
  if (fn.hidden) {
    const hb = document.createElement('span');
    hb.className = 'fn-hidden-badge';
    hb.textContent = 'hidden';
    item.appendChild(hb);
  }

  item.addEventListener('click', () => selectFn(i));

  // Drag-to-reorder — never re-renders DOM mid-drag, only swaps nodes visually
  grip.addEventListener('mousedown', e2 => {
    e2.preventDefault();
    e2.stopPropagation();

    const container = document.getElementById('fn-list-items');
    let dragIdx = i;           // current logical position of the dragged item
    let lastY = e2.clientY;
    let accumulated = 0;

    // Mark item as dragging
    item.style.opacity = '0.5';
    item.style.outline = '1px dashed var(--accent3)';

    const onMove = ev => {
      const dy = ev.clientY - lastY;
      lastY = ev.clientY;
      accumulated += dy;

      // Use the actual rendered row height each tick
      const rows = Array.from(container.querySelectorAll('.fn-list-item'));
      const rowH = rows[0] ? rows[0].offsetHeight + 2 : 36;

      const steps = Math.trunc(accumulated / rowH);
      if (steps === 0) return;
      accumulated -= steps * rowH;

      const targetIdx = Math.max(0, Math.min(n.functions.length - 1, dragIdx + steps));
      if (targetIdx === dragIdx) return;

      // 1. Mutate the data array
      pushUndo();
      const [removed] = n.functions.splice(dragIdx, 1);
      n.functions.splice(targetIdx, 0, removed);

      // 2. Move the DOM node without rebuilding
      const currentRows = Array.from(container.querySelectorAll('.fn-list-item'));
      const dragEl = currentRows[dragIdx];
      if (dragEl) {
        if (targetIdx < dragIdx) {
          container.insertBefore(dragEl, currentRows[targetIdx]);
        } else {
          const after = currentRows[targetIdx];
          if (after && after.nextSibling) {
            container.insertBefore(dragEl, after.nextSibling);
          } else {
            container.appendChild(dragEl);
          }
        }
      }

      // 3. Track active fn index
      if (activeFnIdx === dragIdx) activeFnIdx = targetIdx;
      else if (activeFnIdx > dragIdx && activeFnIdx <= targetIdx) activeFnIdx--;
      else if (activeFnIdx < dragIdx && activeFnIdx >= targetIdx) activeFnIdx++;

      dragIdx = targetIdx;
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      item.style.opacity = '';
      item.style.outline = '';
      // Full re-render now drag is done — safe because mouse is up
      renderFnList();
      if (activeFnIdx !== null) selectFn(activeFnIdx);
      triggerFnAutoSave();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  return item;
}

function renderFnList() {
  const n = state.nodes.find(x => x.id === fnModalNodeId);
  if (!n) return;
  updateStatusBar();
  const container = document.getElementById('fn-list-items');
  container.innerHTML = '';

  if (n.functions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fn-list-empty';
    empty.textContent = 'No functions yet';
    container.appendChild(empty);
    return;
  }

  n.functions.forEach((fn, i) => {
    container.appendChild(buildFnListItem(fn, i, n));
  });
}

function selectFn(idx) {
  activeFnIdx = idx;
  // Update active state in list
  document.querySelectorAll('.fn-list-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  const n = state.nodes.find(x => x.id === fnModalNodeId);
  if (!n) return;
  showFnDetail(n.functions[idx], idx);
}

function showFnDetail(fn, idx) {
  const pane = document.getElementById('fn-detail-pane');
  pane.innerHTML = '';

  if (!fn) {
    pane.className = 'empty-state';
    pane.style.cssText = '';
    pane.innerHTML = '<div class="fn-empty-hint"><div class="fn-empty-icon">⚙</div>Select a function to edit,<br>or add a new one.</div>';
    return;
  }

  // Normalise: migrate old string inputs/outputs to arrays
  if (!Array.isArray(fn.inputs))  fn.inputs  = fn.inputs  ? [fn.inputs]  : [];
  if (!Array.isArray(fn.outputs)) fn.outputs = fn.outputs ? [fn.outputs] : [];
  if (fn.hidden === undefined) fn.hidden = false;

  pane.className = '';
  pane.style.cssText = '';

  // All content goes into a scrollable inner div — keeps padding inside the scroll area
  const inner = document.createElement('div');
  inner.className = 'fn-detail-inner';

  // ── helper: simple text field ──
  function makeField(labelText, hint, key, isTextarea, placeholder) {
    const wrap = document.createElement('div');
    wrap.className = 'fn-form-field';
    const lbl = document.createElement('div');
    lbl.className = 'fn-form-label';
    lbl.innerHTML = labelText + (hint ? ' <span class="fn-form-hint">— ' + hint + '</span>' : '');
    wrap.appendChild(lbl);
    const ctrl = document.createElement(isTextarea ? 'textarea' : 'input');
    ctrl.className = 'fn-form-input' + (isTextarea ? ' large' : '');
    if (!isTextarea) ctrl.type = 'text';
    ctrl.value = fn[key] || '';
    ctrl.placeholder = placeholder || '';
    ctrl.addEventListener('input', () => {
      pushUndoDebounced();
      fn[key] = ctrl.value;
      saveToLocalStorage();
      if (key === 'name') {
        updateStatusBar();
        const listItems = document.querySelectorAll('.fn-list-item');
        if (listItems[idx]) {
          const nameEl = listItems[idx].querySelector('.fn-list-name');
          if (nameEl) {
            nameEl.textContent = ctrl.value.trim() || 'Untitled function';
            nameEl.style.fontStyle = ctrl.value.trim() ? '' : 'italic';
          }
        }
      }
      triggerFnAutoSave();
    });
    wrap.appendChild(ctrl);
    return wrap;
  }

  // ── helper: tag-pill list for inputs or outputs ──
  function makeIOSection(key, colorClass, labelText, placeholder) {
    const col = document.createElement('div');
    col.className = 'io-section-col';

    const colLbl = document.createElement('div');
    colLbl.className = 'io-col-label ' + (key === 'inputs' ? 'input-label' : 'output-label');
    colLbl.innerHTML = (key === 'inputs'
      ? '<svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.5h7M5 1.5l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="9" height="9" viewBox="0 0 9 9"><path d="M8 4.5H1M4 1.5L1 4.5l3 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>')
      + ' ' + labelText;
    col.appendChild(colLbl);

    const tagList = document.createElement('div');
    tagList.className = 'io-tag-list';

    // Ensure hidden arrays exist
    const hidKey = key === 'inputs' ? 'hiddenInputs' : 'hiddenOutputs';
    if (!Array.isArray(fn[hidKey])) fn[hidKey] = [];

    function rebuildTags() {
      tagList.innerHTML = '';
      if (fn[key].length === 0) {
        const empty = document.createElement('div');
        empty.className = 'io-empty';
        empty.textContent = 'None added';
        tagList.appendChild(empty);
      } else {
        fn[key].forEach((val, ti) => {
          const isHidden = fn[hidKey].includes(ti);
          const tag = document.createElement('div');
          tag.className = 'io-tag ' + (key === 'inputs' ? 'input-tag' : 'output-tag') + (isHidden ? ' io-tag-hidden' : '');
          const span = document.createElement('span');
          setIOPillLabel(span, key === 'inputs' ? 'IN' : 'OUT', val);
          // Visibility toggle
          const vis = document.createElement('button');
          vis.className = 'io-tag-vis';
          vis.title = isHidden ? 'Show on canvas' : 'Hide from canvas';
          vis.innerHTML = isHidden ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>';
          vis.style.cssText = 'flex-shrink:0;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;padding:0 3px 0 0;opacity:' + (isHidden ? '0.35' : '0.75') + ';color:inherit;transition:opacity 0.12s;';
          vis.addEventListener('click', e => {
            e.stopPropagation();
            pushUndo();
            const idx = fn[hidKey].indexOf(ti);
            if (idx === -1) fn[hidKey].push(ti);
            else fn[hidKey].splice(idx, 1);
            rebuildTags();
            renderNodes();
            updateStatusBar();
            saveToLocalStorage();
          });
          const rm = document.createElement('button');
          rm.className = 'io-tag-remove';
          rm.innerHTML = '×';
          rm.title = 'Remove';
          rm.addEventListener('click', e => {
            e.stopPropagation();
            pushUndo();
            fn[key].splice(ti, 1);
            // Fix up hidden indices after removal
            fn[hidKey] = fn[hidKey].filter(i => i !== ti).map(i => i > ti ? i - 1 : i);
            rebuildTags();
            renderNodes();
            triggerFnAutoSave();
          });
          tag.appendChild(vis);
          tag.appendChild(span);
          tag.appendChild(rm);
          tagList.appendChild(tag);
        });
      }
    }
    rebuildTags();
    col.appendChild(tagList);

    // Add row
    const addRow = document.createElement('div');
    addRow.className = 'io-add-row';
    const addInp = document.createElement('input');
    addInp.type = 'text';
    addInp.className = 'io-add-input ' + (key === 'inputs' ? 'input-focus' : 'output-focus');
    addInp.placeholder = placeholder;
    const addBtn = document.createElement('button');
    addBtn.className = 'io-add-btn';
    addBtn.textContent = '+ Add';
    const doAdd = () => {
      const v = addInp.value.trim();
      if (!v) return;
      pushUndo();
      fn[key].push(v);
      addInp.value = '';
      rebuildTags();
      triggerFnAutoSave();
      addInp.focus();
    };
    addBtn.addEventListener('click', doAdd);
    addInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    addRow.appendChild(addInp);
    addRow.appendChild(addBtn);
    col.appendChild(addRow);

    return col;
  }

  // ── NAME ──
  inner.appendChild(makeField('Function name', '', 'name', false, 'e.g. Work order dispatch'));

  // ── VISIBILITY TOGGLE ──
  const visRow = document.createElement('div');
  visRow.className = 'fn-form-field';
  const visToggleWrap = document.createElement('div');
  visToggleWrap.className = 'fn-visibility-row';
  const visToggle = document.createElement('button');
  visToggle.className = 'fn-visibility-toggle' + (fn.hidden ? '' : ' visible');
  visToggle.setAttribute('aria-label', 'Toggle visibility');
  const visLabelWrap = document.createElement('div');
  visLabelWrap.style.flex = '1';
  const visLabel = document.createElement('div');
  visLabel.className = 'fn-visibility-label';
  visLabel.textContent = fn.hidden ? 'Hidden from diagram' : 'Visible on diagram';
  const visSub = document.createElement('div');
  visSub.className = 'fn-visibility-sub';
  visSub.textContent = fn.hidden ? 'Function is in the data but not shown on the canvas node' : 'Function name appears in the node on the canvas';
  visLabelWrap.appendChild(visLabel);
  visLabelWrap.appendChild(visSub);
  visToggleWrap.appendChild(visToggle);
  visToggleWrap.appendChild(visLabelWrap);
  visToggle.addEventListener('click', e => {
    e.stopPropagation();
    pushUndo();
    fn.hidden = !fn.hidden;
    visToggle.classList.toggle('visible', !fn.hidden);
    visLabel.textContent = fn.hidden ? 'Hidden from diagram' : 'Visible on diagram';
    visSub.textContent = fn.hidden ? 'Function is in the data but not shown on the canvas node' : 'Function name appears in the node on the canvas';
    // Update hidden badge in fn list
    const listItem = document.querySelectorAll('.fn-list-item')[idx];
    if (listItem) {
      let badge = listItem.querySelector('.fn-hidden-badge');
      if (fn.hidden && !badge) {
        badge = document.createElement('span');
        badge.className = 'fn-hidden-badge';
        badge.textContent = 'hidden';
        listItem.appendChild(badge);
      } else if (!fn.hidden && badge) {
        badge.remove();
      }
    }
    triggerFnAutoSave();
    updateStatusBar();
    saveToLocalStorage();
    // Re-render canvas node then re-draw arrows after layout settles
    const n = state.nodes.find(x => x.id === fnModalNodeId);
    if (n) {
      const el = createNodeEl(n);
      const old = document.getElementById('node-' + n.id);
      if (old) old.replaceWith(el);
      requestAnimationFrame(() => renderArrows());
    }
  });
  visToggleWrap.addEventListener('click', () => visToggle.click());
  visRow.appendChild(visToggleWrap);
  inner.appendChild(visRow);

  const divider = document.createElement('div');
  divider.className = 'fn-form-divider';
  inner.appendChild(divider);

  // ── INPUTS & OUTPUTS ──
  const ioSectionLabel = document.createElement('div');
  ioSectionLabel.className = 'fn-form-section-label';
  ioSectionLabel.textContent = 'Inputs & Outputs';
  inner.appendChild(ioSectionLabel);

  const ioRow = document.createElement('div');
  ioRow.className = 'io-section-row';
  ioRow.appendChild(makeIOSection('inputs',  'input-tag',  'Inputs',  'e.g. Sales order'));
  ioRow.appendChild(makeIOSection('outputs', 'output-tag', 'Outputs', 'e.g. Work order'));
  inner.appendChild(ioRow);

  const divider2 = document.createElement('div');
  divider2.className = 'fn-form-divider';
  inner.appendChild(divider2);

  // ── DESCRIPTION ──
  const descLabel = document.createElement('div');
  descLabel.className = 'fn-form-section-label';
  descLabel.textContent = 'Description & Rules';
  inner.appendChild(descLabel);

  inner.appendChild(makeField('Description', 'logic, triggers, ownership, SLAs', 'description', true,
    'Describe what this function does, who owns it, key business rules, trigger conditions, SLAs or constraints…'));

  const divider3 = document.createElement('div');
  divider3.className = 'fn-form-divider';
  inner.appendChild(divider3);

  // ── METADATA ──
  const metaLabel = document.createElement('div');
  metaLabel.className = 'fn-form-section-label';
  metaLabel.textContent = 'Metadata';
  inner.appendChild(metaLabel);

  const metaRow = document.createElement('div');
  metaRow.className = 'fn-form-row';
  metaRow.appendChild(makeField('Owner / Role', '', 'owner', false, 'e.g. Production Planner'));
  metaRow.appendChild(makeField('Trigger', '', 'trigger', false, 'e.g. On MRP run, daily at 06:00'));
  inner.appendChild(metaRow);

  inner.appendChild(makeField('System / Tool', 'specific system or module used', 'system', false, 'e.g. SAP PP module, custom MES screen'));

  // ── DELETE ──
  const actions = document.createElement('div');
  actions.id = 'fn-detail-actions';
  const delBtn = document.createElement('button');
  delBtn.className = 'fn-del-action';
  delBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> Remove function';
  delBtn.addEventListener('click', () => {
    const n = state.nodes.find(x => x.id === fnModalNodeId);
    if (!n) return;
    pushUndo();
    n.functions.splice(idx, 1);
    activeFnIdx = Math.min(activeFnIdx, n.functions.length - 1);
    if (activeFnIdx < 0) activeFnIdx = null;
    renderFnList();
    showFnDetail(activeFnIdx !== null ? n.functions[activeFnIdx] : null, activeFnIdx);
    triggerFnAutoSave();
  });
  actions.appendChild(delBtn);
  inner.appendChild(actions);
  pane.appendChild(inner);
}

function addFnAndSelect() {
  const n = state.nodes.find(x => x.id === fnModalNodeId);
  if (!n) return;
  const newFn = { name: '', inputs: [], outputs: [], description: '', owner: '', trigger: '', system: '', hidden: false };
  pushUndo();
  n.functions.push(newFn);
  renderFnList();
  selectFn(n.functions.length - 1);
  // Focus the name input
  const inp = document.querySelector('#fn-detail-pane .fn-form-input');
  if (inp) { inp.focus(); inp.select(); }
}

function triggerFnAutoSave() {
  const badge = document.getElementById('fn-autosave');
  if (badge) { badge.style.opacity = '1'; clearTimeout(fnAutoSaveTimer); fnAutoSaveTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1800); }
}

// Close on overlay click / Escape
document.getElementById('fn-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('fn-modal-overlay')) closeFnModal();
});
document.addEventListener('keydown', e => {
  const _fnOverlay = document.getElementById('fn-modal-overlay'); if (e.key === 'Escape' && _fnOverlay && _fnOverlay.classList.contains('open')) {
    closeFnModal();
  }
});
