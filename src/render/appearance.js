// Appearance panel and style brush helpers extracted from main.js

// APPEARANCE PANEL
// ══════════════════════════════════════════════
let _apNodeId = null;

function openAppearancePanel(nodeId) {
  _apNodeId = nodeId;
  buildAppearancePanel(nodeId);
  document.getElementById('appearance-panel').classList.add('open');
  // Highlight the open button
  document.querySelectorAll('.ap-open-btn').forEach(b => b.classList.toggle('active', b.dataset.node === nodeId));
}

function closeAppearancePanel() {
  _apNodeId = null;
  document.getElementById('appearance-panel').classList.remove('open');
  document.querySelectorAll('.ap-open-btn').forEach(b => b.classList.remove('active'));
}

function buildAppearancePanel(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  const body = document.getElementById('ap-body');
  body.innerHTML = '';

  const cs = getComputedStyle(document.documentElement);
  const dfltText  = cs.getPropertyValue('--text').trim()  || '#111111';
  const dfltText2 = cs.getPropertyValue('--text2').trim() || '#555555';
  const dfltText3 = cs.getPropertyValue('--text3').trim() || '#999999';
  const dfltIIBg  = cs.getPropertyValue('--io-input-bg').trim();
  const dfltIIBr  = cs.getPropertyValue('--io-input-border').trim();
  const dfltIITx  = cs.getPropertyValue('--io-input-text').trim();
  const dfltIOBg  = cs.getPropertyValue('--io-output-bg').trim();
  const dfltIOBr  = cs.getPropertyValue('--io-output-border').trim();
  const dfltIOTx  = cs.getPropertyValue('--io-output-text').trim();

  function makeRow(labelText, field, defaultVal) {
    const row = document.createElement('div');
    row.className = 'ap-row';
    const lbl = document.createElement('span');
    lbl.className = 'ap-row-label';
    lbl.textContent = labelText;
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.className = 'ap-color';
    inp.value = toHex6(n[field] || defaultVal);
    inp.title = labelText;
    inp.addEventListener('input', () => {
      pushUndoDebounced();
      n[field] = inp.value;
      renderNodes();
      saveToLocalStorage();
    });
    const rst = document.createElement('button');
    rst.className = 'ap-reset';
    rst.title = 'Reset';
    rst.textContent = '↺';
    rst.addEventListener('click', () => {
      pushUndo();
      n[field] = '';
      inp.value = toHex6(defaultVal);
      renderNodes();
      saveToLocalStorage();
    });
    row.appendChild(lbl); row.appendChild(inp); row.appendChild(rst);
    body.appendChild(row);
  }

  // ── Text section ──
  const tHdr = document.createElement('div'); tHdr.className = 'ap-section-label'; tHdr.textContent = 'Text';
  body.appendChild(tHdr);
  makeRow('Tag',              'tagColor',    dfltText3);
  makeRow('Title',            'textColor',   dfltText);
  makeRow('Subtitle',         'subtitleColor', dfltText2);
  makeRow('Functions label',  'fnLabelColor', dfltText3);
  makeRow('Function items',   'fnTextColor',  dfltText2);

  // ── IO Pills section ──
  const pHdr = document.createElement('div'); pHdr.className = 'ap-section-label'; pHdr.textContent = 'Input pills';
  body.appendChild(pHdr);
  makeRow('Background', 'ioInputBg',    dfltIIBg);
  makeRow('Border',     'ioInputBorder', dfltIIBr);
  makeRow('Text',       'ioInputText',  dfltIITx);

  const oHdr = document.createElement('div'); oHdr.className = 'ap-section-label'; oHdr.textContent = 'Output pills';
  body.appendChild(oHdr);
  makeRow('Background', 'ioOutputBg',    dfltIOBg);
  makeRow('Border',     'ioOutputBorder', dfltIOBr);
  makeRow('Text',       'ioOutputText',  dfltIOTx);
}

function toHex6(val) {
  if (!val) return '#000000';
  // Strip alpha if 8-char hex
  return val.replace(/^(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, '$1');
}

// ══════════════════════════════════════════════
// STYLE BRUSH
// ══════════════════════════════════════════════
const STYLE_BRUSH_FIELDS = [
  'color','colorOpacity',
  'textColor','tagColor','subtitleColor','fnLabelColor','fnTextColor',
  'ioInputBg','ioInputBorder','ioInputText',
  'ioOutputBg','ioOutputBorder','ioOutputText'
];

let _brushActive = false;
let _brushData = null;

function startStyleBrush(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  _brushData = {};
  STYLE_BRUSH_FIELDS.forEach(f => { _brushData[f] = n[f]; });
  _brushActive = true;
  document.getElementById('style-brush-banner').classList.add('active');
  document.getElementById('canvas-wrap').classList.add('brush-mode');
  document.getElementById('canvas-wrap').style.cursor = 'crosshair';
  document.querySelectorAll('.brush-btn').forEach(b => b.classList.add('active'));
}

function cancelStyleBrush() {
  _brushActive = false;
  _brushData = null;
  document.getElementById('style-brush-banner').classList.remove('active');
  document.getElementById('canvas-wrap').classList.remove('brush-mode');
  document.getElementById('canvas-wrap').style.cursor = '';
  document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
}

function applyStyleBrush(nodeId) {
  if (!_brushActive || !_brushData) return;
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  pushUndo();
  STYLE_BRUSH_FIELDS.forEach(f => { n[f] = _brushData[f]; });
  renderNodes();
  saveToLocalStorage();
  // Re-render sidebar only if this was the selected node (to update pickers)
  if (selectedNode === nodeId) renderSidebar();
}
function updateSliderPct(el) {
  const pct = ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%';
  el.style.setProperty('--slider-pct', pct);
}
