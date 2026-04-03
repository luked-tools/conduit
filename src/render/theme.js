// Theme helpers extracted from main.js

const THEME_LS_KEY = 'conduit_theme';
function saveTheme() {
  try {
    const vars = {};
    Object.keys(THEME_DEFAULTS).forEach(k => {
      vars[k] = getComputedStyle(document.documentElement).getPropertyValue(k).trim();
    });
    localStorage.setItem(THEME_LS_KEY, JSON.stringify({ presetId: activePresetId, vars }));
  } catch(e) {}
}

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_LS_KEY);
    if (!raw) return;
    const { presetId, vars } = JSON.parse(raw);
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    activePresetId = presetId || 'default';
  } catch(e) {}
}
const THEME_PRESETS = [
  {
    name: 'Conduit', id: 'default',
    swatches: ['#f5f5f5','#ff8c42','#6c8ead'],
    vars: {} // uses defaults
  },
  {
    name: 'Midnight', id: 'midnight',
    swatches: ['#060810','#6366f1','#22d3ee'],
    vars: {
      '--bg':'#060810','--surface':'#0d1117','--surface2':'#161b25',
      '--surface3':'#1d2433','--border':'#232b3e','--border2':'#2e3a52',
      '--text':'#e2e8f0','--text2':'#94a3b8','--text3':'#475569',
      '--accent':'#6366f1','--accent2':'#a855f7','--accent3':'#22d3ee',
      '--node-internal':'#1e1b4b','--node-internal-border':'#6366f1',
      '--node-external':'#2d1b4e','--node-external-border':'#a855f7',
      '--arrow-color':'#6366f1',
      '--io-input-bg':'#1e1b4b','--io-input-border':'#6366f1','--io-input-text':'#a5b4fc',
      '--io-output-bg':'#2d1b4e','--io-output-border':'#a855f7','--io-output-text':'#d8b4fe',
    }
  },
  {
    name: 'Forest', id: 'forest',
    swatches: ['#0a1209','#22c55e','#84cc16'],
    vars: {
      '--bg':'#0a1209','--surface':'#0f1a0e','--surface2':'#162415',
      '--surface3':'#1d2e1c','--border':'#243823','--border2':'#2e4a2d',
      '--text':'#dcfce7','--text2':'#86efac','--text3':'#4ade80',
      '--accent':'#22c55e','--accent2':'#84cc16','--accent3':'#34d399',
      '--node-internal':'#052e16','--node-internal-border':'#22c55e',
      '--node-external':'#1a2e05','--node-external-border':'#84cc16',
      '--arrow-color':'#22c55e',
      '--io-input-bg':'#052e16','--io-input-border':'#22c55e','--io-input-text':'#86efac',
      '--io-output-bg':'#1a2e05','--io-output-border':'#84cc16','--io-output-text':'#d9f99d',
    }
  },
  {
    name: 'Ember', id: 'ember',
    swatches: ['#130a04','#f97316','#facc15'],
    vars: {
      '--bg':'#130a04','--surface':'#1c1008','--surface2':'#261610',
      '--surface3':'#311c14','--border':'#3d2418','--border2':'#4f2f1e',
      '--text':'#fef3c7','--text2':'#fcd34d','--text3':'#92400e',
      '--accent':'#f97316','--accent2':'#ef4444','--accent3':'#facc15',
      '--node-internal':'#3d1400','--node-internal-border':'#f97316',
      '--node-external':'#3d0b00','--node-external-border':'#ef4444',
      '--arrow-color':'#f97316',
      '--io-input-bg':'#3d1400','--io-input-border':'#f97316','--io-input-text':'#fed7aa',
      '--io-output-bg':'#3d0b00','--io-output-border':'#ef4444','--io-output-text':'#fca5a5',
    }
  },
  {
    name: 'Slate', id: 'slate',
    swatches: ['#0f172a','#38bdf8','#818cf8'],
    vars: {
      '--bg':'#0f172a','--surface':'#1e293b','--surface2':'#263347',
      '--surface3':'#2f3f55','--border':'#334155','--border2':'#475569',
      '--text':'#f1f5f9','--text2':'#94a3b8','--text3':'#64748b',
      '--accent':'#38bdf8','--accent2':'#818cf8','--accent3':'#2dd4bf',
      '--node-internal':'#0c2240','--node-internal-border':'#38bdf8',
      '--node-external':'#1e1040','--node-external-border':'#818cf8',
      '--arrow-color':'#38bdf8',
      '--io-input-bg':'#0c2240','--io-input-border':'#38bdf8','--io-input-text':'#7dd3fc',
      '--io-output-bg':'#1e1040','--io-output-border':'#818cf8','--io-output-text':'#c7d2fe',
    }
  },
  {
    name: 'Dark Navy', id: 'dark',
    swatches: ['#0d0f14','#4f8ef7','#00d4aa'],
    vars: {
      '--bg':'#0d0f14','--surface':'#13161d','--surface2':'#1a1e28',
      '--surface3':'#222736','--border':'#2a2f3e','--border2':'#353c50',
      '--text':'#e8eaf0','--text2':'#9aa0b8','--text3':'#5c6380',
      '--accent':'#4f8ef7','--accent2':'#7c5cfc','--accent3':'#00d4aa',
      '--danger':'#f75f5f',
      '--node-internal':'#1a2340','--node-internal-border':'#4f8ef7',
      '--node-external':'#231a2a','--node-external-border':'#7c5cfc',
      '--arrow-color':'#4f8ef7',
      '--io-input-bg':'#0d1f2d','--io-input-border':'#2a4a6a','--io-input-text':'#5fa8d3',
      '--io-output-bg':'#0d2018','--io-output-border':'#2a5a3a','--io-output-text':'#5fd38a',
    }
  },
];

const THEME_ROWS = {
  ui: [
    { label: 'Background',    var: '--bg' },
    { label: 'Surface',       var: '--surface' },
    { label: 'Surface 2',     var: '--surface2' },
    { label: 'Border',        var: '--border' },
    { label: 'Text primary',  var: '--text' },
    { label: 'Text secondary',var: '--text2' },
    { label: 'Text muted',    var: '--text3' },
  ],
  nodes: [
    { label: 'Internal fill',   var: '--node-internal' },
    { label: 'Internal border', var: '--node-internal-border' },
    { label: 'External fill',   var: '--node-external' },
    { label: 'External border', var: '--node-external-border' },
  ],
  accents: [
    { label: 'Accent (primary)',    var: '--accent' },
    { label: 'Accent (secondary)',  var: '--accent2' },
    { label: 'Accent (highlight)',  var: '--accent3' },
    { label: 'Arrow colour',        var: '--arrow-color' },
    { label: 'Delete / Remove',     var: '--danger' },
  ],
  io: [
    { label: 'Input fill',    var: '--io-input-bg' },
    { label: 'Input border',  var: '--io-input-border' },
    { label: 'Input text',    var: '--io-input-text' },
    { label: 'Output fill',   var: '--io-output-bg' },
    { label: 'Output border', var: '--io-output-border' },
    { label: 'Output text',   var: '--io-output-text' },
  ],
};

let activePresetId = 'default';
let themePanelOpen = false;

function toggleThemePanel() {
  themePanelOpen = !themePanelOpen;
  const panel = document.getElementById('theme-panel');
  const btn   = document.getElementById('theme-toggle-btn');
  if (panel) panel.classList.toggle('open', themePanelOpen);
  if (btn)   btn.style.color = themePanelOpen ? 'var(--accent3)' : '';
  if (themePanelOpen) buildThemePanel();
}

function getCurrentVarValue(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    || THEME_DEFAULTS[varName] || '#000000';
}

function setThemeVar(varName, value) {
  document.documentElement.style.setProperty(varName, value);
  // Re-render arrows since arrow-color may have changed
  renderArrows();
  // Update swatch background
  const swatch = document.querySelector(`.theme-swatch[data-var="${varName}"]`);
  if (swatch) swatch.style.background = value;
  // Update hex input
  const hex = document.querySelector(`.theme-hex[data-var="${varName}"]`);
  if (hex) hex.value = value;
  activePresetId = 'custom';
  document.querySelectorAll('.theme-preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === 'custom');
  });
  saveTheme();
}

function buildThemePanel() {
  // Presets
  const presetsEl = document.getElementById('theme-presets');
  presetsEl.innerHTML = '';
  THEME_PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'theme-preset-btn' + (activePresetId === p.id ? ' active' : '');
    btn.dataset.preset = p.id;
    const swatchHtml = p.swatches.map(c => `<span style="background:${c}"></span>`).join('');
    btn.innerHTML = `<div class="theme-preset-swatch">${swatchHtml}</div>${p.name}`;
    btn.addEventListener('click', () => applyPreset(p));
    presetsEl.appendChild(btn);
  });
  // Custom swatch for "custom" state
  const customBtn = document.createElement('button');
  customBtn.className = 'theme-preset-btn' + (activePresetId === 'custom' ? ' active' : '');
  customBtn.dataset.preset = 'custom';
  customBtn.innerHTML = `<div class="theme-preset-swatch"><span style="background:linear-gradient(135deg,#f97316,#6366f1,#22c55e)"></span></div>Custom`;
  presetsEl.appendChild(customBtn);

  // Rows
  buildThemeRows('theme-rows-ui', THEME_ROWS.ui);
  buildThemeRows('theme-rows-nodes', THEME_ROWS.nodes);
  buildThemeRows('theme-rows-accents', THEME_ROWS.accents);
  buildThemeRows('theme-rows-io', THEME_ROWS.io);
}

function buildThemeRows(containerId, rows) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  rows.forEach(row => {
    const current = getCurrentVarValue(row.var);
    const div = document.createElement('div');
    div.className = 'theme-row';

    const lbl = document.createElement('label');
    lbl.textContent = row.label;
    div.appendChild(lbl);

    // Hex text input
    const hexInp = document.createElement('input');
    hexInp.type = 'text';
    hexInp.className = 'theme-hex';
    hexInp.dataset.var = row.var;
    hexInp.value = normaliseHex(current);
    hexInp.maxLength = 7;
    hexInp.addEventListener('input', () => {
      const v = hexInp.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        setThemeVar(row.var, v);
      }
    });
    hexInp.addEventListener('blur', () => {
      // Snap to valid or revert
      if (!/^#[0-9a-fA-F]{6}$/.test(hexInp.value.trim())) {
        hexInp.value = normaliseHex(getCurrentVarValue(row.var));
      }
    });

    // Colour swatch (click opens native colour picker)
    const swatch = document.createElement('div');
    swatch.className = 'theme-swatch';
    swatch.dataset.var = row.var;
    swatch.style.background = normaliseHex(current);
    const picker = document.createElement('input');
    picker.type = 'color';
    picker.value = normaliseHex(current);
    picker.addEventListener('input', () => {
      setThemeVar(row.var, picker.value);
      hexInp.value = picker.value;
    });
    swatch.appendChild(picker);

    div.appendChild(hexInp);
    div.appendChild(swatch);
    el.appendChild(div);
  });
}

function normaliseHex(v) {
  v = v.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return '#' + v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
  }
  // Try rgb()/computed
  try {
    const tmp = document.createElement('div');
    tmp.style.color = v;
    document.body.appendChild(tmp);
    const rgb = getComputedStyle(tmp).color;
    document.body.removeChild(tmp);
    const m = rgb.match(/\d+/g);
    if (m && m.length >= 3) {
      return '#' + m.slice(0,3).map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
    }
  } catch(e) {}
  return v || '#000000';
}

function applyPreset(preset) {
  const vars = { ...THEME_DEFAULTS, ...preset.vars };
  Object.entries(vars).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  activePresetId = preset.id;
  renderArrows();
  renderNodes();
  buildThemePanel();
  saveTheme();
}

function resetTheme() {
  Object.entries(THEME_DEFAULTS).forEach(([k, v]) => {
    document.documentElement.style.setProperty(k, v);
  });
  activePresetId = 'default';
  renderArrows();
  renderNodes();
  buildThemePanel();
  saveTheme();
}

// Close theme panel on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && themePanelOpen) toggleThemePanel();
});
