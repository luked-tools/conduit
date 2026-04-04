let _contextToolbarMenuOpen = false;

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
  if (wireActive || epDragActive || draggingNode || resizingNode || panDragging) return false;
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
    icon: '...',
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
  const menu = document.createElement('div');
  menu.className = 'context-toolbar-menu';
  menu.addEventListener('mousedown', e => e.stopPropagation());
  menu.addEventListener('click', e => e.stopPropagation());

  if (selectedNode) {
    const nodeId = selectedNode;
    menu.appendChild(makeContextToolbarMenuItem({
      label: 'To front',
      disabled: !canMoveNodeLayer(nodeId, 'front'),
      onClick: () => moveNodeLayer(nodeId, 'front')
    }));
    menu.appendChild(makeContextToolbarMenuItem({
      label: 'To back',
      disabled: !canMoveNodeLayer(nodeId, 'back'),
      onClick: () => moveNodeLayer(nodeId, 'back')
    }));
  } else if (selectedArrow) {
    const arrowId = selectedArrow;
    menu.appendChild(makeContextToolbarMenuItem({
      label: 'To front',
      disabled: !canMoveArrowLayer(arrowId, 'front'),
      onClick: () => moveArrowLayer(arrowId, 'front')
    }));
    menu.appendChild(makeContextToolbarMenuItem({
      label: 'To back',
      disabled: !canMoveArrowLayer(arrowId, 'back'),
      onClick: () => moveArrowLayer(arrowId, 'back')
    }));
  }

  return menu;
}

function makeContextToolbarMenuItem({ label, onClick, disabled = false }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'context-toolbar-menu-item';
  btn.textContent = label;
  btn.disabled = !!disabled;
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.disabled) return;
    _contextToolbarMenuOpen = false;
    onClick();
  });
  return btn;
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
  const gap = 10;
  const minInset = 10;

  let left = anchorRect.left - wrapRect.left + (anchorRect.width / 2) - (toolbarRect.width / 2);
  let top = anchorRect.top - wrapRect.top - toolbarRect.height - gap;
  if (top < minInset) top = anchorRect.bottom - wrapRect.top + gap;

  left = Math.max(minInset, Math.min(left, wrapRect.width - toolbarRect.width - minInset));
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
