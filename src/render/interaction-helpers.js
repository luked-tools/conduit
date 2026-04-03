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
