let _contextToolbarMenuOpen = false;

function getContextMenuIcon(name) {
  switch (name) {
    case 'details':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 5v2.6M6 3.6h.01" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
    case 'front':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 9.5V3.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M2.8 5.4 4.5 3.5 6.2 5.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4 2.2h1.8M8.4 5.2h1.8M8.4 8.2h1.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';
    case 'back':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4.5 2.5v5.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M2.8 6.6 4.5 8.5 6.2 6.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.4 2.2h1.8M8.4 5.2h1.8M8.4 8.2h1.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';
    case 'front-of':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="4.1" width="4.1" height="4.1" rx="0.9" stroke="currentColor" stroke-width="1" opacity="0.45"/><rect x="5.9" y="2" width="4.1" height="4.1" rx="0.9" stroke="currentColor" stroke-width="1.6"/></svg>';
    case 'behind':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.2" y="2.2" width="4.2" height="4.2" rx="0.9" stroke="currentColor" stroke-width="1.6"/><rect x="5.2" y="3.8" width="4.2" height="4.2" rx="0.9" fill="var(--surface)" stroke="currentColor" stroke-width="1" opacity="0.85"/></svg>';
    case 'duplicate':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.2" y="2.2" width="5.3" height="5.3" rx="1" stroke="currentColor" stroke-width="1.1"/><rect x="4.5" y="4.5" width="5.3" height="5.3" rx="1" stroke="currentColor" stroke-width="1.1"/></svg>';
    default:
      return '';
  }
}

function getContextToolbarAnchor() {
  if (selectedNode) {
    const nodeEl = document.getElementById(`node-${selectedNode}`);
    if (!nodeEl) return null;
    return { rect: nodeEl.getBoundingClientRect() };
  }

  if (selectedArrow) {
    const arrowObject = document.querySelector(`.arrow-object[data-arrow-id="${selectedArrow}"]`);
    if (!arrowObject) return null;
    const anchorEl = arrowObject.querySelector('.arrow-path') || arrowObject;
    const rect = anchorEl.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) return null;
    return { rect };
  }

  return null;
}

function shouldShowContextToolbar() {
  if (!selectedNode && !selectedArrow) return false;
  if (wireActive || epDragActive || draggingNode || resizingNode || panDragging || _inlineNodeEditor || _nodeLayerTargetMode || _quickConnectMode) return false;
  return true;
}

function makeContextToolbarButton({ title, label, icon, onClick, danger = false, disabled = false, active = false }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'context-toolbar-btn' + (danger ? ' danger' : '') + (active ? ' active' : '');
  btn.title = title;
  btn.disabled = !!disabled;
  btn.innerHTML = `<span class="context-toolbar-btn-icon">${icon}</span><span class="context-toolbar-btn-label">${label}</span>`;
  btn.addEventListener('mousedown', e => {
    e.stopPropagation();
  });
  btn.addEventListener('mouseup', e => {
    e.stopPropagation();
  });
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    onClick();
  });
  return btn;
}

function renderContextToolbar() {
  const toolbar = document.getElementById('context-toolbar');
  if (!toolbar) return;

  toolbar.onmousedown = e => e.stopPropagation();
  toolbar.onmouseup = e => e.stopPropagation();
  toolbar.onclick = e => e.stopPropagation();
  toolbar.classList.toggle('under-layers-panel', !!_layersPanelOpen);

  if (!shouldShowContextToolbar()) {
    _contextToolbarMenuOpen = false;
    toolbar.classList.remove('visible');
    toolbar.innerHTML = '';
    toolbar.setAttribute('aria-hidden', 'true');
    return;
  }

  toolbar.innerHTML = '';

  if (selectedNode) {
    const nodeId = selectedNode;
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Rename title and description',
      label: 'Rename',
      icon: '&#9998;',
      onClick: () => startInlineNodeEdit(nodeId)
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Quick connect to another node',
      label: 'Connect',
      icon: '&#8594;',
      onClick: () => startQuickConnectMode(nodeId)
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: _brushActive ? 'Cancel style brush' : 'Start style brush',
      label: 'Style',
      icon: '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 12l3-3 5.5-5.5a1.5 1.5 0 0 0-2.1-2.1L3 7 2 12z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 3.5l1 1" stroke="currentColor" stroke-width="1.3"/><circle cx="2.5" cy="11.5" r="1" fill="currentColor" opacity="0.7"/></svg>',
      active: _brushActive,
      onClick: () => {
        if (_brushActive) cancelStyleBrush();
        else startStyleBrush(nodeId);
        renderContextToolbar();
      }
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move backward',
      label: 'Back',
      icon: '&#8595;',
      disabled: !canMoveNodeLayer(nodeId, 'backward'),
      onClick: () => moveNodeLayer(nodeId, 'backward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move forward',
      label: 'Forward',
      icon: '&#8593;',
      disabled: !canMoveNodeLayer(nodeId, 'forward'),
      onClick: () => moveNodeLayer(nodeId, 'forward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Delete node',
      label: 'Delete',
      icon: 'x',
      danger: true,
      onClick: () => deleteSelected()
    }));
    toolbar.appendChild(makeContextToolbarMoreButton('node', nodeId));
  } else if (selectedArrow) {
    const arrowId = selectedArrow;
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move backward',
      label: 'Back',
      icon: '&#8595;',
      disabled: !canMoveArrowLayer(arrowId, 'backward'),
      onClick: () => moveArrowLayer(arrowId, 'backward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move forward',
      label: 'Forward',
      icon: '&#8593;',
      disabled: !canMoveArrowLayer(arrowId, 'forward'),
      onClick: () => moveArrowLayer(arrowId, 'forward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Delete connection',
      label: 'Delete',
      icon: 'x',
      danger: true,
      onClick: () => deleteSelected()
    }));
    toolbar.appendChild(makeContextToolbarMoreButton('arrow', arrowId));
  }

  if (_contextToolbarMenuOpen) {
    toolbar.appendChild(makeContextToolbarMenu());
  }

  toolbar.classList.add('visible');
  toolbar.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(positionContextToolbar);
}

function makeContextToolbarMoreButton(type, id) {
  return makeContextToolbarButton({
    title: 'More actions',
    label: 'More',
    icon: '&#8942;',
    onClick: () => {
      const nextState = !_contextToolbarMenuOpen;
      _contextToolbarMenuOpen = nextState;
      renderContextToolbar();
      if (nextState) {
        const menu = document.querySelector('#context-toolbar .context-toolbar-menu');
        if (menu) menu.dataset.kind = type + ':' + id;
      }
    }
  });
}

function makeContextToolbarMenu() {
  const menu = createAppMenu({ className: 'context-toolbar-menu' });
  menu.addEventListener('mousedown', e => e.stopPropagation());
  menu.addEventListener('click', e => e.stopPropagation());
  const runMenuAction = fn => () => {
    _contextToolbarMenuOpen = false;
    fn();
  };

  if (selectedNode) {
    const nodeId = selectedNode;
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'Details',
      icon: getContextMenuIcon('details'),
      onClick: runMenuAction(() => openNodeModal(nodeId))
    }));
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'Duplicate',
      icon: getContextMenuIcon('duplicate'),
      onClick: runMenuAction(() => {
        copySelectedNode();
        pasteNode();
      })
    }));
    menu.appendChild(createAppMenuDivider('context-toolbar-menu-divider'));
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'To front',
      icon: getContextMenuIcon('front'),
      disabled: !canMoveNodeLayer(nodeId, 'front'),
      onClick: runMenuAction(() => moveNodeLayer(nodeId, 'front'))
    }));
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'To back',
      icon: getContextMenuIcon('back'),
      disabled: !canMoveNodeLayer(nodeId, 'back'),
      onClick: runMenuAction(() => moveNodeLayer(nodeId, 'back'))
    }));
    menu.appendChild(createAppMenuDivider('context-toolbar-menu-divider'));
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'Bring in front of...',
      icon: getContextMenuIcon('front-of'),
      onClick: runMenuAction(() => startNodeLayerTargetMode(nodeId, 'front-of'))
    }));
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'Send behind...',
      icon: getContextMenuIcon('behind'),
      onClick: runMenuAction(() => startNodeLayerTargetMode(nodeId, 'behind'))
    }));
  } else if (selectedArrow) {
    const arrowId = selectedArrow;
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'To front',
      icon: getContextMenuIcon('front'),
      disabled: !canMoveArrowLayer(arrowId, 'front'),
      onClick: runMenuAction(() => moveArrowLayer(arrowId, 'front'))
    }));
    menu.appendChild(createAppMenuItem({
      className: 'context-toolbar-menu-item',
      label: 'To back',
      icon: getContextMenuIcon('back'),
      disabled: !canMoveArrowLayer(arrowId, 'back'),
      onClick: runMenuAction(() => moveArrowLayer(arrowId, 'back'))
    }));
  }

  return menu;
}

function positionContextToolbar() {
  const toolbar = document.getElementById('context-toolbar');
  const wrap = document.getElementById('canvas-wrap');
  if (!toolbar || !wrap || !toolbar.classList.contains('visible')) return;

  const anchor = getContextToolbarAnchor();
  if (!anchor) {
    toolbar.classList.remove('visible');
    toolbar.setAttribute('aria-hidden', 'true');
    return;
  }

  const wrapRect = wrap.getBoundingClientRect();
  const anchorRect = anchor.rect;
  const toolbarRect = toolbar.getBoundingClientRect();
  const layersPanel = document.getElementById('layers-panel');
  const gap = 10;
  const minInset = 10;

  let left = anchorRect.left - wrapRect.left + (anchorRect.width / 2) - (toolbarRect.width / 2);
  let top = anchorRect.top - wrapRect.top - toolbarRect.height - gap;
  if (top < minInset) top = anchorRect.bottom - wrapRect.top + gap;

  let maxLeft = wrapRect.width - toolbarRect.width - minInset;
  if (layersPanel && layersPanel.classList.contains('open')) {
    const panelRect = layersPanel.getBoundingClientRect();
    const panelLeftWithinWrap = panelRect.left - wrapRect.left;
    maxLeft = Math.min(maxLeft, panelLeftWithinWrap - toolbarRect.width - gap);
  }

  left = Math.max(minInset, Math.min(left, maxLeft));
  top = Math.max(minInset, Math.min(top, wrapRect.height - toolbarRect.height - minInset));

  toolbar.style.left = `${Math.round(left)}px`;
  toolbar.style.top = `${Math.round(top)}px`;
}

function updateContextToolbar() {
  renderContextToolbar();
}

document.addEventListener('mousedown', e => {
  if (!_contextToolbarMenuOpen) return;
  const toolbar = document.getElementById('context-toolbar');
  if (toolbar && toolbar.contains(e.target)) return;
  _contextToolbarMenuOpen = false;
  renderContextToolbar();
});
