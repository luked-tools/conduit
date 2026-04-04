// Palette drag and inline label helpers extracted from main.js

// ══════════════════════════════════════════════
// PALETTE DRAG-TO-CANVAS
// ══════════════════════════════════════════════
let paletteDragType  = null;   // node type being dragged from palette
let paletteDragMoved = false;  // true once mouse moves > threshold
let paletteDragStartX = 0;
let paletteDragStartY = 0;
const PALETTE_DRAG_THRESHOLD = 6; // px movement before drag starts

const _ghost = document.getElementById('palette-drag-ghost');

function _startPaletteDrag(type, e) {
  paletteDragType   = type;
  paletteDragMoved  = false;
  paletteDragStartX = e.clientX;
  paletteDragStartY = e.clientY;
}

function _movePaletteDrag(e) {
  if (!paletteDragType) return;
  const dx = e.clientX - paletteDragStartX;
  const dy = e.clientY - paletteDragStartY;
  if (!paletteDragMoved && Math.sqrt(dx*dx + dy*dy) < PALETTE_DRAG_THRESHOLD) return;
  paletteDragMoved = true;

  // Show ghost
  const labels = { internal: 'Internal System', external: 'External Entity', boundary: 'Boundary Box' };
  _ghost.textContent  = labels[paletteDragType] || paletteDragType;
  _ghost.className    = paletteDragType;
  _ghost.style.display = 'block';
  _ghost.style.left   = e.clientX + 'px';
  _ghost.style.top    = e.clientY + 'px';

  // Highlight canvas if cursor is over it
  const rect = canvasWrap.getBoundingClientRect();
  const over = e.clientX >= rect.left && e.clientX <= rect.right &&
               e.clientY >= rect.top  && e.clientY <= rect.bottom;
  canvasWrap.classList.toggle('palette-drop-target', over);
}

function _endPaletteDrag(e) {
  if (!paletteDragType) return;
  const type = paletteDragType;
  const moved = paletteDragMoved;

  // Always clean up
  paletteDragType  = null;
  paletteDragMoved = false;
  _ghost.style.display = 'none';
  canvasWrap.classList.remove('palette-drop-target');

  if (!moved) return; // short click — let onclick fire normally

  // Dropped — check if over canvas
  const rect = canvasWrap.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom) return; // dropped outside

  // Convert to canvas coordinates and place node
  const canvasX = (e.clientX - rect.left - panX) / scale;
  const canvasY = (e.clientY - rect.top  - panY) / scale;
  addModeAt(type, canvasX, canvasY);
}

// Attach mousedown to each palette button
document.querySelectorAll('.add-node-btn[data-nodetype]').forEach(btn => {
  btn.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    _startPaletteDrag(btn.dataset.nodetype, e);
  });
});

// Hook into global mouse events (checked only when paletteDragType is set)
window.addEventListener('mousemove', e => { _movePaletteDrag(e); });
window.addEventListener('mouseup',   e => { _endPaletteDrag(e); });

// Cancel on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && paletteDragType) {
    paletteDragType = null; paletteDragMoved = false;
    _ghost.style.display = 'none';
    canvasWrap.classList.remove('palette-drop-target');
  }
});

let _inlineNodeEditor = null;

function autosizeQuickEditField(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function positionInlineNodeEdit(nodeEl, wrap) {
  if (!nodeEl || !wrap) return;
  const rect = nodeEl.getBoundingClientRect();
  const width = wrap.offsetWidth || 280;
  const height = wrap.offsetHeight || 150;
  const margin = 12;
  let left = rect.left + (rect.width - width) / 2;
  let top = rect.top + Math.min(12, Math.max(6, rect.height * 0.12));
  if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
  if (left < margin) left = margin;
  if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.bottom - height - 8);
  if (top < margin) top = margin;
  wrap.style.left = Math.round(left) + 'px';
  wrap.style.top = Math.round(top) + 'px';
}

function closeInlineNodeEdit({ save = false } = {}) {
  if (!_inlineNodeEditor) return;
  const session = _inlineNodeEditor;
  _inlineNodeEditor = null;
  const nodeEl = document.getElementById('node-' + session.nodeId);
  if (nodeEl) nodeEl.classList.remove('quick-editing');
  if (session.wrap.parentNode) session.wrap.remove();
  updateContextToolbar();
  if (save) {
    const node = state.nodes.find(x => x.id === session.nodeId);
    if (node) {
      const nextTitle = session.titleInput.value.trim() || node.title || 'Untitled';
      const nextSubtitle = session.subtitleInput.value.trim();
      if (node.title !== nextTitle || (node.subtitle || '') !== nextSubtitle) {
        pushUndo();
        node.title = nextTitle;
        node.subtitle = nextSubtitle;
        renderNodes();
        renderSidebar();
        saveToLocalStorage();
        return;
      }
    }
  }
}

function startInlineNodeEdit(nodeId) {
  const node = state.nodes.find(x => x.id === nodeId);
  const nodeEl = document.getElementById('node-' + nodeId);
  if (!node || !nodeEl) return;
  if (selectedNode !== nodeId) {
    selectNode(nodeId);
    requestAnimationFrame(() => startInlineNodeEdit(nodeId));
    return;
  }

  closeInlineNodeEdit();
  nodeEl.classList.add('quick-editing');

  const wrap = document.createElement('div');
  wrap.className = 'node-quick-edit-panel';

  const titleInput = document.createElement('textarea');
  titleInput.className = 'node-quick-edit-field title';
  titleInput.value = node.title || '';
  titleInput.placeholder = node.type === 'boundary' ? 'Boundary label' : 'Node title';
  titleInput.rows = 2;
  titleInput.spellcheck = false;
  if (node.textColor) titleInput.style.color = node.textColor;

  const subtitleInput = document.createElement('textarea');
  subtitleInput.className = 'node-quick-edit-field subtitle';
  subtitleInput.value = node.subtitle || '';
  subtitleInput.placeholder = node.type === 'boundary' ? 'Boundary description' : 'Subtitle / description';
  subtitleInput.rows = 2;
  subtitleInput.spellcheck = false;
  if (node.subtitleColor) subtitleInput.style.color = node.subtitleColor;

  const actions = document.createElement('div');
  actions.className = 'node-quick-edit-actions';
  actions.innerHTML =
    '<div class="node-quick-edit-hint">Enter to save · Esc to cancel</div>' +
    '<div class="node-quick-edit-buttons">' +
      '<button type="button" class="node-quick-edit-action">Cancel</button>' +
      '<button type="button" class="node-quick-edit-action primary">Save</button>' +
    '</div>';

  wrap.appendChild(titleInput);
  wrap.appendChild(subtitleInput);
  wrap.appendChild(actions);
  document.body.appendChild(wrap);

  autosizeQuickEditField(titleInput);
  autosizeQuickEditField(subtitleInput);
  positionInlineNodeEdit(nodeEl, wrap);

  _inlineNodeEditor = {
    nodeId,
    nodeEl,
    wrap,
    titleInput,
    subtitleInput
  };
  updateContextToolbar();

  const [cancelBtn, saveBtn] = wrap.querySelectorAll('button');
  cancelBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeInlineNodeEdit();
  });
  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeInlineNodeEdit({ save: true });
  });

  [titleInput, subtitleInput].forEach((input, index) => {
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('input', () => {
      autosizeQuickEditField(input);
      positionInlineNodeEdit(nodeEl, wrap);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeInlineNodeEdit();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        closeInlineNodeEdit({ save: true });
      }
      if (e.key === 'Tab' && !e.shiftKey && index === 0) {
        e.preventDefault();
        subtitleInput.focus();
      }
    });
  });

  wrap.addEventListener('mousedown', e => e.stopPropagation());
  wrap.addEventListener('click', e => e.stopPropagation());

  requestAnimationFrame(() => {
    positionInlineNodeEdit(nodeEl, wrap);
    titleInput.focus();
    titleInput.select();
  });
}

document.addEventListener('mousedown', e => {
  if (!_inlineNodeEditor) return;
  if (_inlineNodeEditor.wrap.contains(e.target)) return;
  closeInlineNodeEdit({ save: true });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _inlineNodeEditor) {
    closeInlineNodeEdit();
  }
});


// ── Inline label editor ──
function startInlineLabelEdit(arrow, svgX, svgY) {
  // Remove any existing inline editor
  const existing = document.getElementById('inline-label-editor');
  if (existing) existing.remove();

  // Convert SVG canvas coords to screen coords
  const rect = canvasWrap.getBoundingClientRect();
  const screenX = svgX * scale + panX + rect.left;
  const screenY = svgY * scale + panY + rect.top;

  const wrap = document.createElement('div');
  wrap.id = 'inline-label-editor';
  wrap.style.cssText = `position:fixed;z-index:1000;transform:translate(-50%,-50%);
    left:${screenX}px;top:${screenY}px;`;

  const ta = document.createElement('textarea');
  ta.value = arrow.label || '';
  ta.style.cssText = `background:var(--surface);border:1.5px solid var(--accent3);
    border-radius:5px;padding:5px 8px;color:var(--text);
    font-family:'Inter','IBM Plex Sans',sans-serif;font-size:12px;
    resize:none;outline:none;min-width:120px;max-width:240px;
    box-shadow:0 4px 20px #00000070;text-align:center;
    font-weight:${arrow.labelBold?'600':'400'};
    font-style:${arrow.labelItalic?'italic':'normal'};`;
  // Auto-size height
  const lines = (arrow.label||'').split('\n').length;
  ta.rows = Math.max(1, lines);

  ta.addEventListener('input', () => {
    // Auto-grow rows
    ta.rows = Math.max(1, ta.value.split('\n').length);
  });

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    pushUndo();
    arrow.label = ta.value.trim();
    if (wrap.parentNode) wrap.remove();
    renderArrows();
    saveToLocalStorage();
  };

  ta.addEventListener('keydown', e => {
    if (e.key === 'Escape') { committed = true; if (wrap.parentNode) wrap.remove(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
  });
  ta.addEventListener('blur', commit);

  wrap.appendChild(ta);
  document.body.appendChild(wrap);
  ta.focus();
  ta.select();
}
