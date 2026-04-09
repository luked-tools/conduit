let _layersPanelOpen = false;
let _layersPanelDragState = null;
let _layersPanelFilter = 'all';

function toggleLayersPanel(force) {
  const next = typeof force === 'boolean' ? force : !_layersPanelOpen;
  _layersPanelOpen = next;
  const panel = document.getElementById('layers-panel');
  const toggle = document.getElementById('layers-toggle-btn');
  if (!panel || !toggle) return;

  panel.classList.toggle('open', next);
  toggle.classList.toggle('active', next);
  toggle.setAttribute('aria-expanded', next ? 'true' : 'false');
  if (!next) finishLayersDrag();
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
  if (next) renderLayersPanel();
}

function closeLayersPanel() {
  toggleLayersPanel(false);
}

function setLayersPanelFilter(filter) {
  const next = ['all', 'nodes', 'connections'].includes(filter) ? filter : 'all';
  if (_layersPanelFilter === next) return;
  _layersPanelFilter = next;
  if (_layersPanelOpen) renderLayersPanel();
}

function updateLayersPanelFilterIndicator() {
  const filter = document.getElementById('layers-panel-filter');
  if (!filter) return;
  const indicator = filter.querySelector('.layers-filter-indicator');
  const activeBtn = filter.querySelector('.layers-filter-btn.active');
  if (!indicator || !activeBtn) return;

  const left = activeBtn.offsetLeft;
  const width = activeBtn.offsetWidth;
  indicator.style.width = `${width}px`;
  indicator.style.transform = `translateX(${left}px)`;
}

function clearLayersDropIndicators() {
  document.querySelectorAll('.layers-row.drag-before, .layers-row.drag-after, .layers-row.dragging').forEach(el => {
    el.classList.remove('drag-before', 'drag-after', 'dragging');
  });
}

function finishLayersDrag() {
  _layersPanelDragState = null;
  clearLayersDropIndicators();
}

function scrollLayersPanelSelectionIntoView() {
  const body = document.getElementById('layers-panel-body');
  if (!body || !_layersPanelOpen) return;
  const selected = body.querySelector('.layers-row.selected');
  if (!selected) return;
  requestAnimationFrame(() => {
    selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

function handleLayersPanelAutoScroll(clientY) {
  const body = document.getElementById('layers-panel-body');
  if (!body || !_layersPanelDragState) return;
  const rect = body.getBoundingClientRect();
  const threshold = 36;
  const step = 16;
  if (clientY < rect.top + threshold) {
    body.scrollTop -= step;
  } else if (clientY > rect.bottom - threshold) {
    body.scrollTop += step;
  }
}

function getLayerActionIcon(action) {
  if (action === 'front') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v8M5.5 4.5 8 2l2.5 2.5M4 12h8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (action === 'forward') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.5v8M5.5 6 8 3.5 10.5 6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (action === 'backward') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5v-8M5.5 10 8 12.5 10.5 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  if (action === 'back') return '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V6M5.5 11.5 8 14l2.5-2.5M4 4h8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '';
}

function getNodePreviewMarkup(node) {
  if (!node) return '';
  const isBoundary = node.type === 'boundary';
  const isExternal = node.type === 'external';
  const baseBg = isBoundary ? 'transparent' : (isExternal ? 'var(--node-external)' : 'var(--node-internal)');
  const previewBg = (!isBoundary && node.color)
    ? `${node.color}${(node.colorOpacity !== undefined ? node.colorOpacity : 51).toString(16).padStart(2, '0')}`
    : baseBg;
  const edgeColor = isBoundary
    ? 'var(--border2)'
    : (isExternal ? 'var(--node-external-edge)' : 'var(--node-internal-edge)');
  const accentColor = isBoundary
    ? 'var(--text3)'
    : (isExternal ? 'var(--node-external-border)' : 'var(--node-internal-border)');
  const titleColor = node.textColor || (isBoundary ? 'var(--text3)' : 'var(--text)');
  const subtitleColor = node.subtitleColor || 'var(--text2)';
  const tagColor = node.tagColor || 'var(--text3)';
  const borderDash = isBoundary || isExternal ? '3 2' : '';
  const leftRailDash = isExternal ? '3 2' : '';

  return `
    <span class="layers-node-preview" aria-hidden="true">
      <svg viewBox="0 0 24 14" preserveAspectRatio="xMidYMid meet">
        <rect x="0.75" y="0.75" width="22.5" height="12.5" rx="4"
          fill="${previewBg}"
          stroke="${edgeColor}"
          stroke-width="1"
          ${borderDash ? `stroke-dasharray="${borderDash}"` : ''} />
        ${isBoundary ? '' : `<line x1="2.25" y1="1.8" x2="2.25" y2="12.2" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" ${leftRailDash ? `stroke-dasharray="${leftRailDash}"` : ''} />`}
        ${isBoundary ? `<rect x="6.2" y="6.1" width="11.6" height="1.35" rx="0.675" fill="${titleColor}" opacity="0.55" />` : `<rect x="7.6" y="3.45" width="4.2" height="1" rx="0.5" fill="${tagColor}" opacity="0.78" />`}
        ${isBoundary ? '' : `<rect x="7.6" y="5.1" width="9.4" height="1.7" rx="0.85" fill="${titleColor}" opacity="0.82" />`}
        ${isBoundary ? '' : `<rect x="7.6" y="8.25" width="7" height="1.4" rx="0.7" fill="${subtitleColor}" opacity="0.58" />`}
      </svg>
    </span>
  `;
}

function getArrowPreviewMarkup(arrow) {
  const color = arrow.color || 'var(--accent2)';
  const dash = getArrowStrokeDasharray(arrow);
  const markerEnd = arrow.direction === 'directed' || arrow.direction === 'bidirectional';
  const markerStart = arrow.direction === 'bidirectional';

  return `
    <span class="layers-arrow-preview" aria-hidden="true">
      <svg viewBox="0 0 30 12">
        <line x1="4" y1="6" x2="26" y2="6" stroke="${color}" stroke-width="1.6" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>
        ${markerStart ? `<path d="M8 3.8 4.5 6 8 8.2" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        ${markerEnd ? `<path d="M22 3.8 25.5 6 22 8.2" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      </svg>
    </span>
  `;
}

function makeLayersActionButton({ title, action, disabled = false, onClick }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'layers-action-btn';
  btn.title = title;
  btn.innerHTML = getLayerActionIcon(action);
  btn.disabled = !!disabled;
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    onClick();
  });
  return btn;
}

function makeLayersDragHandle(kind, id) {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'layers-drag-handle';
  handle.title = 'Drag to reorder';
  handle.draggable = true;
  handle.setAttribute('aria-label', 'Drag to reorder');
  handle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 4h1.5M9.5 4H11M5 8h1.5M9.5 8H11M5 12h1.5M9.5 12H11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  handle.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
  });
  handle.addEventListener('mousedown', e => e.stopPropagation());
  handle.addEventListener('dragstart', e => {
    e.stopPropagation();
    _layersPanelDragState = { kind, id };
    const row = handle.closest('.layers-row');
    row?.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${kind}:${id}`);
    }
  });
  handle.addEventListener('dragend', () => {
    finishLayersDrag();
  });
  return handle;
}

function applyLayersDrop(sourceKind, sourceId, targetKind, targetId, position) {
  if (!sourceId || !targetId) return false;
  if (sourceKind === targetKind && sourceId === targetId) return false;
  pushUndo();
  // The panel displays front-to-back, while canvasOrder is stored back-to-front.
  // Convert the visual drop edge into the stored insertion side.
  const storedPosition = position === 'after' ? 'before' : 'after';
  const moved = moveCanvasLayerRelative(sourceKind, sourceId, targetKind, targetId, storedPosition);
  if (!moved) return false;
  if (sourceKind === 'node') {
    selectedNode = sourceId;
    selectedArrow = null;
  } else if (sourceKind === 'arrow') {
    selectedArrow = sourceId;
    selectedNode = null;
  }
  if (typeof refreshRenderedNodeLayers === 'function') refreshRenderedNodeLayers();
  if (typeof refreshRenderedArrowLayers === 'function') refreshRenderedArrowLayers();
  if (typeof scheduleSelectionChromeRefresh === 'function') scheduleSelectionChromeRefresh();
  scheduleSaveToLocalStorage();
  setStatusModeMessage('Layer order updated', { fade: true, autoClearMs: 1500 });
  return true;
}

function getNodeRowTitle(node) {
  return (node.title || node.tag || 'Untitled node').replace(/\n/g, ' ');
}

function getNodeDisplayLayerNumber(nodeId) {
  const ordered = getCanvasLayerEntries();
  const index = ordered.findIndex(entry => entry.kind === 'node' && entry.id === nodeId);
  return index >= 0 ? index + 1 : null;
}

function getArrowDisplayLayerNumber(arrowId) {
  const ordered = getCanvasLayerEntries();
  const index = ordered.findIndex(entry => entry.kind === 'arrow' && entry.id === arrowId);
  return index >= 0 ? index + 1 : null;
}

function getNodeRowMeta(node, entry) {
  const identifier = (node.tag || '').replace(/\n/g, ' ').trim();
  const layerText = `Layer ${getNodeDisplayLayerNumber(node.id) || (entry.index + 1)}`;
  return identifier ? `${identifier} · ${layerText}` : layerText;
}

function makeLayersRow({ kind, id, nodeType = '', previewMarkup = '', title, meta, selected, actions, onSelect }) {
  const row = document.createElement('div');
  row.className = 'layers-row' + (selected ? ' selected' : '');
  row.dataset.kind = kind;
  row.dataset.id = id;
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.addEventListener('click', () => onSelect());
  row.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  });

  const info = document.createElement('div');
  info.className = 'layers-row-info';

  const head = document.createElement('div');
  head.className = 'layers-row-head';

  const dragHandle = makeLayersDragHandle(kind, id);
  head.appendChild(dragHandle);

  const preview = document.createElement('span');
  preview.className = 'layers-row-preview ' + (kind === 'node' ? 'node-preview' : 'arrow-preview');
  preview.innerHTML = previewMarkup || getLayersKindMarkup(kind, nodeType);
  head.appendChild(preview);

  const titleEl = document.createElement('span');
  titleEl.className = 'layers-row-title';
  titleEl.textContent = title;
  head.appendChild(titleEl);

  info.appendChild(head);

  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'layers-row-meta';
    metaEl.textContent = meta;
    info.appendChild(metaEl);
  }

  const actionWrap = document.createElement('div');
  actionWrap.className = 'layers-row-actions';
  actions.forEach(actionWrap.appendChild.bind(actionWrap));

  row.addEventListener('dragover', e => {
    if (!_layersPanelDragState) return;
    if (_layersPanelDragState.kind === kind && _layersPanelDragState.id === id) return;
    e.preventDefault();
    const rect = row.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY >= midpoint ? 'after' : 'before';
    row.classList.toggle('drag-before', position === 'before');
    row.classList.toggle('drag-after', position === 'after');
  });
  row.addEventListener('dragleave', e => {
    if (!row.contains(e.relatedTarget)) {
      row.classList.remove('drag-before', 'drag-after');
    }
  });
  row.addEventListener('drop', e => {
    if (!_layersPanelDragState) return;
    if (_layersPanelDragState.kind === kind && _layersPanelDragState.id === id) return;
    e.preventDefault();
    const rect = row.getBoundingClientRect();
    const position = e.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
    applyLayersDrop(_layersPanelDragState.kind, _layersPanelDragState.id, kind, id, position);
    finishLayersDrag();
  });

  row.appendChild(info);
  row.appendChild(actionWrap);
  return row;
}

function renderLayersSection(body, title, badge, emptyText, rows) {
  const section = document.createElement('div');
  section.className = 'layers-section';
  section.dataset.section = title.toLowerCase().includes('connection') ? 'connections' : 'nodes';

  const header = document.createElement('div');
  header.className = 'layers-section-header';
  header.innerHTML = `<span class="layers-section-title">${title}</span><span class="layers-section-badge">${badge}</span>`;
  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'layers-list';
  list.addEventListener('dragover', e => {
    handleLayersPanelAutoScroll(e.clientY);
    if (!_layersPanelDragState) return;
    e.preventDefault();
    const row = e.target.closest('.layers-row');
    if (!row) clearLayersDropIndicators();
  });
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'layers-empty';
    empty.textContent = emptyText;
    list.appendChild(empty);
  } else {
    rows.forEach(row => list.appendChild(row));
  }

  section.appendChild(list);
  body.appendChild(section);
}

function renderLayersPanel() {
  const panel = document.getElementById('layers-panel');
  const body = document.getElementById('layers-panel-body');
  const header = document.getElementById('layers-panel-header');
  if (!panel || !body || !_layersPanelOpen) return;

  if (header) {
    let filter = document.getElementById('layers-panel-filter');
    if (!filter) {
      filter = document.createElement('div');
      filter.id = 'layers-panel-filter';
      filter.className = 'layers-panel-filter';
      filter.setAttribute('role', 'tablist');
      const indicator = document.createElement('div');
      indicator.className = 'layers-filter-indicator';
      filter.appendChild(indicator);
      [
        ['all', 'All'],
        ['nodes', 'Nodes'],
        ['connections', 'Connections']
      ].forEach(([value, label]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'layers-filter-btn';
        btn.dataset.filter = value;
        btn.textContent = label;
        btn.addEventListener('click', () => setLayersPanelFilter(value));
        filter.appendChild(btn);
      });
      const closeBtn = document.getElementById('layers-panel-close');
      if (closeBtn) {
        header.insertBefore(filter, closeBtn);
      } else {
        header.appendChild(filter);
      }
    }
    filter.querySelectorAll('.layers-filter-btn').forEach(btn => {
      const active = btn.dataset.filter === _layersPanelFilter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    requestAnimationFrame(updateLayersPanelFilterIndicator);
  }

  body.innerHTML = '';
  body.dataset.filter = _layersPanelFilter;
  body.ondragover = e => {
    handleLayersPanelAutoScroll(e.clientY);
  };

  const nodeRows = getCanvasLayerEntries()
    .filter(entry => entry.kind === 'node')
    .slice()
    .reverse()
    .map(entry => {
    const node = entry.object;
    return makeLayersRow({
      kind: 'node',
      id: node.id,
      nodeType: node.type,
      previewMarkup: getNodePreviewMarkup(node),
      title: getNodeRowTitle(node),
      meta: getNodeRowMeta(node, entry),
      selected: selectedNode === node.id,
      onSelect: () => selectNode(node.id),
      actions: [
        makeLayersActionButton({ title: 'To back', action: 'back', disabled: !canMoveNodeLayer(node.id, 'back'), onClick: () => moveNodeLayer(node.id, 'back') }),
        makeLayersActionButton({ title: 'Backward', action: 'backward', disabled: !canMoveNodeLayer(node.id, 'backward'), onClick: () => moveNodeLayer(node.id, 'backward') }),
        makeLayersActionButton({ title: 'Forward', action: 'forward', disabled: !canMoveNodeLayer(node.id, 'forward'), onClick: () => moveNodeLayer(node.id, 'forward') }),
        makeLayersActionButton({ title: 'To front', action: 'front', disabled: !canMoveNodeLayer(node.id, 'front'), onClick: () => moveNodeLayer(node.id, 'front') })
      ]
    });
  });

  const arrowRows = getCanvasLayerEntries()
    .filter(entry => entry.kind === 'arrow')
    .slice()
    .reverse()
    .map(entry => {
    const arrow = entry.object;
    const fromNode = state.nodes.find(n => n.id === arrow.from);
    const toNode = state.nodes.find(n => n.id === arrow.to);
    const fromName = fromNode ? (fromNode.tag || fromNode.title || arrow.from).replace(/\n/g, ' ') : arrow.from;
    const toName = toNode ? (toNode.tag || toNode.title || arrow.to).replace(/\n/g, ' ') : arrow.to;
    const title = `${fromName} → ${toName}`;
    const layerText = `Layer ${getArrowDisplayLayerNumber(arrow.id) || (entry.index + 1)}`;
    const meta = arrow.label ? `${arrow.label} · ${layerText}` : layerText;
    return makeLayersRow({
      kind: 'arrow',
      id: arrow.id,
      previewMarkup: getArrowPreviewMarkup(arrow),
      title,
      meta,
      selected: selectedArrow === arrow.id,
      onSelect: () => selectArrow(arrow.id),
      actions: [
        makeLayersActionButton({ title: 'To back', action: 'back', disabled: !canMoveArrowLayer(arrow.id, 'back'), onClick: () => moveArrowLayer(arrow.id, 'back') }),
        makeLayersActionButton({ title: 'Backward', action: 'backward', disabled: !canMoveArrowLayer(arrow.id, 'backward'), onClick: () => moveArrowLayer(arrow.id, 'backward') }),
        makeLayersActionButton({ title: 'Forward', action: 'forward', disabled: !canMoveArrowLayer(arrow.id, 'forward'), onClick: () => moveArrowLayer(arrow.id, 'forward') }),
        makeLayersActionButton({ title: 'To front', action: 'front', disabled: !canMoveArrowLayer(arrow.id, 'front'), onClick: () => moveArrowLayer(arrow.id, 'front') })
      ]
    });
  });

  if (_layersPanelFilter === 'all') {
    renderLayersSection(body, 'Node Layers', `${state.nodes.length}`, 'No nodes yet', nodeRows);
    renderLayersSection(body, 'Connection Layers', `${state.arrows.length}`, 'No connections yet', arrowRows);
  } else if (_layersPanelFilter !== 'connections') {
    renderLayersSection(body, 'Node Layers', `${state.nodes.length}`, 'No nodes yet', nodeRows);
  } else if (_layersPanelFilter !== 'nodes') {
    renderLayersSection(body, 'Connection Layers', `${state.arrows.length}`, 'No connections yet', arrowRows);
  }

  scrollLayersPanelSelectionIntoView();
}
