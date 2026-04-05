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
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="4.2" width="3.6" height="3.6" rx="0.9" stroke="currentColor" stroke-width="1.1"/><rect x="6.9" y="2.4" width="3.6" height="3.6" rx="0.9" stroke="currentColor" stroke-width="1.1"/><path d="M5.7 5.8h.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M8.7 6.8 10 5.5 8.7 4.2" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    case 'behind':
      return '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1.5" y="2.4" width="3.6" height="3.6" rx="0.9" stroke="currentColor" stroke-width="1.1"/><rect x="6.9" y="4.2" width="3.6" height="3.6" rx="0.9" stroke="currentColor" stroke-width="1.1"/><path d="M5.7 5.8h.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M7.3 4.2 6 5.5 7.3 6.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';
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
    const arrowGroup = arrowSVG?.querySelector(`[data-arrow-id="${selectedArrow}"]`);
    if (!arrowGroup) return null;
    const rect = arrowGroup.getBoundingClientRect();
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

function makeContextToolbarButton({ title, label, icon, onClick, danger = false, disabled = false }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'context-toolbar-btn' + (danger ? ' danger' : '');
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
      icon: '✎',
      onClick: () => startInlineNodeEdit(nodeId)
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Quick connect to another node',
      label: 'Connect',
      icon: '→',
      onClick: () => startQuickConnectMode(nodeId)
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move backward',
      label: 'Back',
      icon: '↓',
      disabled: !canMoveNodeLayer(nodeId, 'backward'),
      onClick: () => moveNodeLayer(nodeId, 'backward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move forward',
      label: 'Forward',
      icon: '↑',
      disabled: !canMoveNodeLayer(nodeId, 'forward'),
      onClick: () => moveNodeLayer(nodeId, 'forward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Duplicate node',
      label: 'Duplicate',
      icon: '⧉',
      onClick: () => {
        copySelectedNode();
        pasteNode();
      }
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
      icon: '↓',
      disabled: !canMoveArrowLayer(arrowId, 'backward'),
      onClick: () => moveArrowLayer(arrowId, 'backward')
    }));
    toolbar.appendChild(makeContextToolbarButton({
      title: 'Move forward',
      label: 'Forward',
      icon: '↑',
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
    icon: '⋯',
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
