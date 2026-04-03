function updatePaletteHighlight() {
  document.querySelectorAll('.add-node-btn[data-nodetype]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nodetype === lastNodeType);
  });
}

function addMode(type) {
  pushUndo();
  lastNodeType = type;
  updatePaletteHighlight();
  const id = nextNodeId();
  const cx = (-panX + canvasWrap.clientWidth / 2) / scale - 100;
  const cy = (-panY + canvasWrap.clientHeight / 2) / scale - 50;
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type === 'boundary' ? 'Boundary Box' : type === 'external' ? 'External Entity' : 'New System',
    subtitle: '',
    x: cx, y: cy, w: type === 'boundary' ? 300 : 180, h: type === 'boundary' ? 200 : 100,
    color: '', textColor: '', functions: []
  });
  render();
  selectNode(id);
}

function addModeAt(type, canvasX, canvasY) {
  pushUndo();
  lastNodeType = type;
  updatePaletteHighlight();
  const id = nextNodeId();
  const w = type === 'boundary' ? 300 : 180, h = type === 'boundary' ? 200 : 100;
  const x = Math.round((canvasX - w / 2) / 10) * 10;
  const y = Math.round((canvasY - h / 2) / 10) * 10;
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type === 'boundary' ? 'Boundary Box' : type === 'external' ? 'External Entity' : 'New System',
    subtitle: '',
    x, y, w, h, color: '', textColor: '', functions: []
  });
  render();
  selectNode(id);
}

function setStatusModeMessage(text = '', { fade = false, autoClearMs = 0, color = '' } = {}) {
  const sb = document.getElementById('sb-mode');
  if (!sb) return;

  clearTimeout(sb._modeTimer);
  clearTimeout(sb._modeClearTimer);

  sb.textContent = text;
  sb.style.color = color || '';

  if (fade) {
    sb.style.opacity = '0';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (sb.textContent === text) sb.style.opacity = '1';
      });
    });
  } else {
    sb.style.opacity = '1';
  }

  if (autoClearMs > 0) {
    sb._modeTimer = setTimeout(() => {
      if (sb.textContent !== text) return;
      sb.style.opacity = '0';
      sb._modeClearTimer = setTimeout(() => {
        if (sb.textContent === text) sb.textContent = '';
      }, 500);
    }, autoClearMs);
  }
}

let _canvasNoticeTimer = null;

function showCanvasNotice(text = '', { tone = 'accent', autoHideMs = 0 } = {}) {
  const banner = document.getElementById('canvas-notice-banner');
  const label = document.getElementById('canvas-notice-text');
  if (!banner || !label) return;
  if (_canvasNoticeTimer) {
    clearTimeout(_canvasNoticeTimer);
    _canvasNoticeTimer = null;
  }
  label.textContent = text;
  banner.classList.remove('danger');
  if (tone === 'danger') banner.classList.add('danger');
  banner.classList.add('active');
  if (autoHideMs > 0) {
    _canvasNoticeTimer = setTimeout(() => {
      hideCanvasNotice();
    }, autoHideMs);
  }
}

function hideCanvasNotice() {
  const banner = document.getElementById('canvas-notice-banner');
  if (!banner) return;
  if (_canvasNoticeTimer) {
    clearTimeout(_canvasNoticeTimer);
    _canvasNoticeTimer = null;
  }
  banner.classList.remove('active', 'danger');
}

function setIOPillLabel(el, prefix, text) {
  if (!el) return;
  el.textContent = '';
  const prefixSpan = document.createElement('span');
  prefixSpan.className = 'io-pill-prefix';
  prefixSpan.textContent = prefix;
  el.appendChild(prefixSpan);
  el.appendChild(document.createTextNode(text));
}

function clearCanvas() {
  pushUndo();
  cancelWire();
  closeBasicModal();
  closeConnectModal();
  closeFnModal();
  closeNodeModal();
  if (typeof closeAppearancePanel === 'function') closeAppearancePanel();
  selectedNode = null;
  selectedArrow = null;
  state.nodes = [];
  state.arrows = [];
  resetDiagramCounters();
  render();
  saveToLocalStorage();
  setStatusModeMessage('Canvas cleared', { fade: true, autoClearMs: 1800 });
}

function confirmClearCanvas() {
  if (!state.nodes.length && !state.arrows.length) return;
  openBasicModal({
    title: 'Clear canvas',
    body: '<div style="font-size:12px;color:var(--text2);line-height:1.6;">Remove all nodes, boundary boxes, and connections from the canvas? Your diagram title, subtitle, and theme will be kept. You can still undo this.</div>',
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      { label: 'Clear canvas', className: 'tb-btn danger', onClick: clearCanvas }
    ]
  });
}
