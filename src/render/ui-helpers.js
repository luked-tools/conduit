// Dropdown and tooltip helpers extracted from main.js

// ── Topbar dropdowns ──
let _ddOpen = null; // ID of currently open dropdown

function toggleDropdown(id) {
  if (_ddOpen === id) {
    // Already open — close it
    _closeDD(id);
  } else {
    // Close any other open one, then open this
    if (_ddOpen) _closeDD(_ddOpen);
    _openDD(id);
  }
}
function _openDD(id) {
  const el = document.getElementById(id);
  if (el) { el.setAttribute('data-open', ''); _ddOpen = id; }
}
function _closeDD(id) {
  const el = document.getElementById(id);
  if (el) { el.removeAttribute('data-open'); }
  if (_ddOpen === id) _ddOpen = null;
}
function closeDropdowns() {
  document.querySelectorAll('.tb-dropdown[data-open]').forEach(d => {
    d.removeAttribute('data-open');
  });
  _ddOpen = null;
}
// Close when clicking outside — use capture phase so it fires first
document.addEventListener('click', e => {
  if (_ddOpen && !e.target.closest('#' + _ddOpen)) {
    closeDropdowns();
  }
}, true);

// ── Arrow tooltip ──
const _arrowTooltip = document.getElementById('arrow-tooltip');
const _connectTooltip = document.getElementById('connect-tooltip');
let _tooltipTimer = null;

function showArrowTooltip(e, arrow) {
  const fromNode = state.nodes.find(n => n.id === arrow.from);
  const toNode   = state.nodes.find(n => n.id === arrow.to);
  if (!fromNode || !toNode) return;

  const fromName = (fromNode.tag ? fromNode.tag + ' ' : '') + fromNode.title.replace(/\n/g, ' ');
  const toName   = (toNode.tag   ? toNode.tag   + ' ' : '') + toNode.title.replace(/\n/g, ' ');
  const dirSymbol = arrow.direction === 'bidirectional' ? '↔' : arrow.direction === 'undirected' ? '──' : '→';
  const dirLabel  = arrow.direction === 'bidirectional' ? 'Bidirectional' : arrow.direction === 'undirected' ? 'Undirected' : 'Directed';

  _arrowTooltip.innerHTML =
    `<div class="att-route">
      <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${fromName}</span>
      <span class="att-route-arrow">${dirSymbol}</span>
      <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${toName}</span>
    </div>
    <div class="att-dir">${dirLabel}</div>
    ${arrow.label ? `<div class="att-label">${arrow.label}</div>` : ''}`;

  positionArrowTooltip(e);
  _arrowTooltip.classList.add('visible');
}

function positionArrowTooltip(e) {
  const tt = _arrowTooltip;
  const vw = window.innerWidth, vh = window.innerHeight;
  const tw = tt.offsetWidth  || 200;
  const th = tt.offsetHeight || 60;
  let x = e.clientX + 14;
  let y = e.clientY - 10;
  if (x + tw > vw - 10) x = e.clientX - tw - 14;
  if (y + th > vh - 10) y = e.clientY - th - 10;
  tt.style.left = x + 'px';
  tt.style.top  = y + 'px';
}

function hideArrowTooltip() {
  _arrowTooltip.classList.remove('visible');
}

function showConnectTargetTooltip(e, node) {
  if (!_connectTooltip || !node) return;

  const nodeName = [node.tag, node.title].filter(Boolean).join(' ').replace(/\n/g, ' ').trim() || 'Untitled node';
  _connectTooltip.innerHTML = '<div class="ctt-label">Connect To</div><div class="ctt-name"></div>';
  const nameEl = _connectTooltip.querySelector('.ctt-name');
  if (nameEl) nameEl.textContent = nodeName;
  positionConnectTooltip(e);
  _connectTooltip.classList.add('visible');
}

function positionConnectTooltip(e) {
  if (!_connectTooltip) return;
  const tt = _connectTooltip;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tw = tt.offsetWidth || 180;
  const th = tt.offsetHeight || 44;
  let x = e.clientX + 16;
  let y = e.clientY + 16;
  if (x + tw > vw - 10) x = e.clientX - tw - 16;
  if (y + th > vh - 10) y = e.clientY - th - 16;
  tt.style.left = x + 'px';
  tt.style.top = y + 'px';
}

function hideConnectTargetTooltip() {
  if (!_connectTooltip) return;
  _connectTooltip.classList.remove('visible');
}
