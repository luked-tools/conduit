// Appearance panel and style brush helpers extracted from main.js

// APPEARANCE PANEL
// ══════════════════════════════════════════════
let _apNodeId = null;

function openAppearancePanel(nodeId) {
  _apNodeId = nodeId;
  buildAppearancePanel(nodeId);
  document.getElementById('appearance-panel').classList.add('open');
  const closeBtn = document.getElementById('ap-close');
  if (closeBtn) {
    closeBtn.removeAttribute('title');
    closeBtn.setAttribute('aria-label', 'Close content style panel');
  }
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

  function makeSection(title) {
    const section = document.createElement('div');
    section.className = 'ap-section';
    const hdr = document.createElement('div');
    hdr.className = 'ap-section-label';
    hdr.textContent = title;
    section.appendChild(hdr);
    body.appendChild(section);
    return section;
  }

  function makeRow(section, labelText, field, defaultVal) {
    const row = document.createElement('div');
    row.className = 'ap-row';
    const lbl = document.createElement('span');
    lbl.className = 'ap-row-label';
    lbl.textContent = labelText;
    const swatch = document.createElement('div');
    swatch.className = 'ap-swatch';
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.className = 'ap-color';
    inp.value = toHex6(n[field] || defaultVal);
    inp.setAttribute('aria-label', labelText);
    swatch.style.background = inp.value;
    inp.addEventListener('input', () => {
      pushUndoDebounced();
      n[field] = inp.value;
      swatch.style.background = inp.value;
      renderNodes();
      if (typeof renderLayersPanel === 'function') renderLayersPanel();
      saveToLocalStorage();
    });
    const rst = document.createElement('button');
    rst.className = 'ap-reset';
    rst.setAttribute('aria-label', `Reset ${labelText}`);
    rst.textContent = '↺';
    rst.addEventListener('click', () => {
      pushUndo();
      n[field] = '';
      inp.value = toHex6(defaultVal);
      swatch.style.background = inp.value;
      renderNodes();
      if (typeof renderLayersPanel === 'function') renderLayersPanel();
      saveToLocalStorage();
    });
    swatch.appendChild(inp);
    row.appendChild(lbl); row.appendChild(swatch); row.appendChild(rst);
    section.appendChild(row);
  }

  // ── Text section ──
  const textSection = makeSection('Text');
  makeRow(textSection, 'Tag',              'tagColor',      dfltText3);
  makeRow(textSection, 'Title',            'textColor',     dfltText);
  makeRow(textSection, 'Subtitle',         'subtitleColor', dfltText2);
  makeRow(textSection, 'Functions label',  'fnLabelColor',  dfltText3);
  makeRow(textSection, 'Function items',   'fnTextColor',   dfltText2);

  // ── IO Pills section ──
  const inputSection = makeSection('Input pills');
  makeRow(inputSection, 'Background', 'ioInputBg',     dfltIIBg);
  makeRow(inputSection, 'Border',     'ioInputBorder', dfltIIBr);
  makeRow(inputSection, 'Text',       'ioInputText',   dfltIITx);

  const outputSection = makeSection('Output pills');
  makeRow(outputSection, 'Background', 'ioOutputBg',     dfltIOBg);
  makeRow(outputSection, 'Border',     'ioOutputBorder', dfltIOBr);
  makeRow(outputSection, 'Text',       'ioOutputText',   dfltIOTx);
}

function toHex6(val) {
  if (!val) return '#000000';
  // Strip alpha if 8-char hex
  return val.replace(/^(#[0-9a-fA-F]{6})[0-9a-fA-F]{2}$/, '$1');
}

// ══════════════════════════════════════════════
// STYLE BRUSH
// ══════════════════════════════════════════════
const STYLE_BRUSH_NODE_FIELDS = [
  'color','colorOpacity',
  'textColor','tagColor','subtitleColor','fnLabelColor','fnTextColor',
  'ioInputBg','ioInputBorder','ioInputText',
  'ioOutputBg','ioOutputBorder','ioOutputText'
];
const STYLE_BRUSH_LABEL_FIELDS = [
  'textColor','fontSize','fontWeight','fontStyle','backgroundStyle','fillColor','opacity'
];
const STYLE_BRUSH_ICON_FIELDS = [
  'color','size','opacity','backgroundStyle','fillColor'
];

let _brushActive = false;
let _brushData = null;
let _brushSource = null;

function getStyleBrushSource(kind, id) {
  if (kind === 'node') return state.nodes.find(x => x.id === id) || null;
  if (kind === 'label') return typeof getLabelById === 'function' ? getLabelById(id) : null;
  if (kind === 'icon') return typeof getIconById === 'function' ? getIconById(id) : null;
  return null;
}

function getStyleBrushTargetKind(kind, object) {
  if (kind === 'node' && object?.type === 'boundary') return 'boundary';
  return kind;
}

function extractStyleBrushData(kind, object) {
  const nodeData = {};
  const labelData = {};
  const iconData = {};
  STYLE_BRUSH_NODE_FIELDS.forEach(field => { nodeData[field] = object?.[field]; });
  STYLE_BRUSH_LABEL_FIELDS.forEach(field => { labelData[field] = object?.[field]; });
  STYLE_BRUSH_ICON_FIELDS.forEach(field => { iconData[field] = object?.[field]; });

  let foregroundColor = null;
  let fillColor = null;
  let fillEnabled = false;
  let opacity = null;

  if (kind === 'node') {
    foregroundColor = object?.textColor || object?.subtitleColor || object?.tagColor || null;
    fillColor = object?.color || null;
    fillEnabled = !!object?.color;
    opacity = typeof object?.colorOpacity === 'number' ? Math.max(0, Math.min(1, object.colorOpacity / 255)) : null;
  } else if (kind === 'label') {
    foregroundColor = object?.textColor || null;
    fillColor = object?.fillColor || null;
    fillEnabled = (object?.backgroundStyle === 'fill') && !!fillColor;
    opacity = typeof object?.opacity === 'number' ? object.opacity : null;
  } else if (kind === 'icon') {
    foregroundColor = object?.color || null;
    fillColor = object?.fillColor || null;
    fillEnabled = (object?.backgroundStyle === 'fill') && !!fillColor;
    opacity = typeof object?.opacity === 'number' ? object.opacity : null;
  }

  return {
    sourceKind: getStyleBrushTargetKind(kind, object),
    node: nodeData,
    label: labelData,
    icon: iconData,
    shared: {
      foregroundColor,
      fillColor,
      fillEnabled,
      opacity
    }
  };
}

function applyNodeStyleBrush(target, brushData) {
  let changed = false;
  if (brushData?.node) {
    STYLE_BRUSH_NODE_FIELDS.forEach(field => {
      if (brushData.node[field] === undefined) return;
      if (target[field] === brushData.node[field]) return;
      target[field] = brushData.node[field];
      changed = true;
    });
  }
  const shared = brushData?.shared || {};
  if (shared.foregroundColor) {
    ['textColor', 'subtitleColor', 'tagColor', 'fnLabelColor', 'fnTextColor'].forEach(field => {
      if (target[field] === shared.foregroundColor) return;
      target[field] = shared.foregroundColor;
      changed = true;
    });
  }
  if (shared.fillEnabled && shared.fillColor) {
    if (target.color !== shared.fillColor) {
      target.color = shared.fillColor;
      changed = true;
    }
    const nextOpacity = typeof shared.opacity === 'number'
      ? Math.max(0, Math.min(255, Math.round(shared.opacity * 255)))
      : 255;
    if (target.colorOpacity !== nextOpacity) {
      target.colorOpacity = nextOpacity;
      changed = true;
    }
  }
  return changed;
}

function applyLabelStyleBrush(target, brushData) {
  let changed = false;
  if (brushData?.label) {
    STYLE_BRUSH_LABEL_FIELDS.forEach(field => {
      if (brushData.label[field] === undefined) return;
      if (target[field] === brushData.label[field]) return;
      target[field] = brushData.label[field];
      changed = true;
    });
  }
  const shared = brushData?.shared || {};
  if (shared.foregroundColor && target.textColor !== shared.foregroundColor) {
    target.textColor = shared.foregroundColor;
    changed = true;
  }
  if (typeof shared.opacity === 'number' && target.opacity !== shared.opacity) {
    target.opacity = shared.opacity;
    changed = true;
  }
  if (shared.fillEnabled && shared.fillColor) {
    if (target.backgroundStyle !== 'fill') {
      target.backgroundStyle = 'fill';
      changed = true;
    }
    if (target.fillColor !== shared.fillColor) {
      target.fillColor = shared.fillColor;
      changed = true;
    }
  }
  return changed;
}

function applyIconStyleBrush(target, brushData) {
  let changed = false;
  if (brushData?.icon) {
    STYLE_BRUSH_ICON_FIELDS.forEach(field => {
      if (brushData.icon[field] === undefined) return;
      if (target[field] === brushData.icon[field]) return;
      target[field] = brushData.icon[field];
      changed = true;
    });
  }
  const shared = brushData?.shared || {};
  if (shared.foregroundColor && target.color !== shared.foregroundColor) {
    target.color = shared.foregroundColor;
    changed = true;
  }
  if (typeof shared.opacity === 'number' && target.opacity !== shared.opacity) {
    target.opacity = shared.opacity;
    changed = true;
  }
  if (shared.fillEnabled && shared.fillColor) {
    if (target.backgroundStyle !== 'fill') {
      target.backgroundStyle = 'fill';
      changed = true;
    }
    if (target.fillColor !== shared.fillColor) {
      target.fillColor = shared.fillColor;
      changed = true;
    }
  }
  return changed;
}

function startStyleBrush(kindOrId, maybeId = null) {
  const kind = maybeId === null ? 'node' : kindOrId;
  const id = maybeId === null ? kindOrId : maybeId;
  const source = getStyleBrushSource(kind, id);
  if (!source) return;
  if (_quickConnectMode) cancelQuickConnectMode();
  _brushData = extractStyleBrushData(kind, source);
  _brushSource = { kind, id };
  _brushActive = true;
  const banner = document.getElementById('style-brush-banner');
  if (banner) {
    banner.classList.add('active');
    const textNode = banner.childNodes[2];
    if (textNode) textNode.textContent = ' Style brush — click a canvas object to apply ';
  }
  const wrap = document.getElementById('canvas-wrap');
  if (wrap) {
    wrap.classList.add('brush-mode');
    wrap.style.cursor = 'crosshair';
  }
  document.querySelectorAll('.brush-btn').forEach(b => b.classList.add('active'));
}

function cancelStyleBrush() {
  _brushActive = false;
  _brushData = null;
  _brushSource = null;
  const banner = document.getElementById('style-brush-banner');
  if (banner) {
    banner.classList.remove('active');
    const textNode = banner.childNodes[2];
    if (textNode) textNode.textContent = ' Style brush — click a canvas object to apply ';
  }
  const wrap = document.getElementById('canvas-wrap');
  if (wrap) {
    wrap.classList.remove('brush-mode');
    wrap.style.cursor = '';
  }
  document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
}

function applyStyleBrush(kindOrId, maybeId = null) {
  if (!_brushActive || !_brushData) return;
  const kind = maybeId === null ? 'node' : kindOrId;
  const id = maybeId === null ? kindOrId : maybeId;
  const target = getStyleBrushSource(kind, id);
  if (!target) return;
  if (_brushSource && _brushSource.kind === kind && _brushSource.id === id) return;
  pushUndo();
  let changed = false;
  if (kind === 'node') changed = applyNodeStyleBrush(target, _brushData);
  else if (kind === 'label') changed = applyLabelStyleBrush(target, _brushData);
  else if (kind === 'icon') changed = applyIconStyleBrush(target, _brushData);
  if (!changed) {
    setStatusModeMessage('No compatible style fields to apply', { fade: true, autoClearMs: 1500 });
    return;
  }
  if (kind === 'node') renderNodes();
  else if (typeof renderAnnotations === 'function') renderAnnotations();
  if (typeof renderLayersPanel === 'function' && typeof _layersPanelOpen !== 'undefined' && _layersPanelOpen) renderLayersPanel();
  renderSidebar();
  saveToLocalStorage();
  setStatusModeMessage('Style applied', { fade: true, autoClearMs: 1200 });
}
function updateSliderPct(el) {
  const pct = ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%';
  el.style.setProperty('--slider-pct', pct);
}
