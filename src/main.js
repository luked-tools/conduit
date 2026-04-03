
// ══════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════
let state = {
  nodes: [],   // {id, type, tag, title, subtitle, x, y, w, h, color, textColor}
  arrows: [],  // {id, from, to, fromPos, toPos, direction, label, labelOffsetX, labelOffsetY, color, dash, bend}
};
let scale = 1;
let panX = 0, panY = 0;
let selectedNode = null;
let selectedArrow = null;
let connectMode = false;
let connectFrom = null; // {nodeId, pos}
let nextArrowType = 'directed';
let _propSectionState = { functions: true, connections: true };
let draggingNode = null;
let dragOffset = {x:0, y:0};
let panDragging = false;
let panStart = {x:0, y:0};
let resizingNode = null;
let resizeStart = {};
let tempLine = null; // SVG line for preview

const canvas = document.getElementById('canvas');
const canvasWrap = document.getElementById('canvas-wrap');
const arrowSVG = document.getElementById('arrow-svg');
let _clipboardNode = null; // copy/paste clipboard (internal, not system clipboard)
let currentDraftId = null;
let currentDraftName = '';
let _quotaWarningShown = false;

// ══════════════════════════════════════════════
// INIT with sample diagram
// ══════════════════════════════════════════════
function init() {
  const blank = createBlankDiagramPayload();
  applyDiagramPayload(blank);
  render();
}

function loadSample() {
  state.nodes = [
    {id:'n1', type:'external', tag:'CLIENT', title:'Customer Portal', subtitle:'Demand capture,\npriority updates,\nand service notes', x:90, y:190, w:190, h:110, color:'#f6efe6', colorOpacity:255, textColor:'#5a3820', subtitleColor:'#7a573f', functions:[{name:'Order intake',inputs:['Demand signal, service notes'],outputs:['Approved order, priority flag'],description:'Captures customer demand and pushes the approved request into planning.',hidden:false},{name:'Change requests',inputs:['Project feedback'],outputs:['Spec adjustment'],description:'',hidden:false}]},
    {id:'n2', type:'internal', tag:'PLM', title:'Product Lifecycle\nManagement', subtitle:'Engineering source of truth\nwith richer style treatment', x:410, y:80, w:220, h:125, color:'#eef3f8', colorOpacity:255, textColor:'#223548', subtitleColor:'#4c6277', tagColor:'#6c8ead', fnLabelColor:'#4c6277', functions:[{name:'BoM authoring',inputs:['Design package'],outputs:['Released BoM'],description:'Creates and maintains the engineering BoM.',hidden:false},{name:'Change control',inputs:['Spec adjustment'],outputs:['Approved ECO'],description:'',hidden:false}], notes:'Styled to demonstrate custom background and text colours.'},
    {id:'n3', type:'internal', tag:'MES', title:'Manufacturing\nExecution System', subtitle:'Shop-floor orchestration,\nWIP tracking,\nand event capture', x:820, y:180, w:230, h:130, color:'#fdf0e7', colorOpacity:255, textColor:'#4a2d18', subtitleColor:'#7d583c', functions:[{name:'Dispatch',inputs:['Released BoM, production plan'],outputs:['Digital work order'],description:'',hidden:false},{name:'WIP telemetry',inputs:['Operator updates'],outputs:['Completion event, trace data'],description:'',hidden:false}], notes:'This node uses warmer colours to show content styling and contrast.'},
    {id:'n4', type:'internal', tag:'ERP', title:'ERP Planning Hub', subtitle:'Financial planning,\nprocurement,\nand replenishment', x:430, y:360, w:220, h:115, color:'#f4f6eb', colorOpacity:255, textColor:'#2f4127', subtitleColor:'#586a4d', functions:[{name:'MRP orchestration',inputs:['Approved order, stock'],outputs:['Supply plan'],description:'',hidden:false},{name:'Purchasing',inputs:['Supply plan'],outputs:['PO release'],description:'',hidden:false}]},
    {id:'n5', type:'internal', tag:'SCM', title:'Supplier Collaboration', subtitle:'Inbound logistics,\nASN visibility,\nand inventory response', x:90, y:560, w:210, h:115, color:'#eff6f5', colorOpacity:255, textColor:'#1d3d3a', subtitleColor:'#4d6d69', functions:[{name:'Supplier scheduling',inputs:['PO release'],outputs:['Confirmed slot'],description:'',hidden:false},{name:'Inbound visibility',inputs:['ASN'],outputs:['Receipt forecast'],description:'',hidden:false}]},
    {id:'n6', type:'internal', tag:'QMS', title:'Quality Management', subtitle:'Inspection triggers,\nnon-conformance,\nand release status', x:835, y:540, w:220, h:120, color:'#f6eef5', colorOpacity:255, textColor:'#492948', subtitleColor:'#755473', functions:[{name:'Inspection routing',inputs:['Completion event'],outputs:['Inspection trigger'],description:'',hidden:false},{name:'Disposition',inputs:['Test result'],outputs:['Pass / hold'],description:'',hidden:false}]},
    {id:'n7', type:'boundary', tag:'', title:'Manufacturing Value Stream', subtitle:'Example boundary box with direct-resize handles', x:45, y:38, w:1080, h:700, color:'', textColor:'#777777', subtitleColor:'#8a8a8a', functions:[]},
  ];
  state.arrows = [
    {id:'a1', from:'n1', to:'n2', fromPos:'e', toPos:'w', direction:'directed', label:'Approved order', labelOffsetX:0, labelOffsetY:-10, color:'#6c8ead', dash:false, bend:0, lineStyle:'curved'},
    {id:'a2', from:'n1', to:'n4', fromPos:'s', toPos:'w', direction:'bidirectional', label:'Spec adjustment', labelOffsetX:-12, labelOffsetY:0, color:'#ff8c42', dash:true, bend:0, lineStyle:'orthogonal', orthoY:60},
    {id:'a3', from:'n2', to:'n3', fromPos:'e', toPos:'n', direction:'directed', label:'Released BoM', labelOffsetX:0, labelOffsetY:-10, color:'', dash:false, bend:0, lineStyle:'orthogonal', orthoY:-30},
    {id:'a4', from:'n2', to:'n4', fromPos:'s', toPos:'n', direction:'bidirectional', label:'Engineering sync', labelOffsetX:12, labelOffsetY:0, color:'#889b4a', dash:false, bend:0, lineStyle:'straight'},
    {id:'a5', from:'n4', to:'n3', fromPos:'e', toPos:'w', direction:'directed', label:'Production plan', labelOffsetX:0, labelOffsetY:-12, color:'#e85e00', dash:false, bend:24, lineStyle:'curved'},
    {id:'a6', from:'n4', to:'n5', fromPos:'w', toPos:'e', direction:'bidirectional', label:'PO release', labelOffsetX:0, labelOffsetY:-12, color:'#2f7a71', dash:true, bend:0, lineStyle:'orthogonal', orthoY:40},
    {id:'a7', from:'n5', to:'n3', fromPos:'e', toPos:'s', direction:'directed', label:'Inbound readiness', labelOffsetX:16, labelOffsetY:0, color:'#6c8ead', dash:false, bend:0, lineStyle:'orthogonal', orthoY:120},
    {id:'a8', from:'n3', to:'n6', fromPos:'s', toPos:'n', direction:'directed', label:'Inspection trigger', labelOffsetX:10, labelOffsetY:0, color:'', dash:false, bend:0, lineStyle:'straight'},
    {id:'a9', from:'n6', to:'n4', fromPos:'w', toPos:'e', direction:'bidirectional', label:'Release status', labelOffsetX:0, labelOffsetY:-12, color:'#9b5f9a', dash:false, bend:0, lineStyle:'orthogonal', orthoY:-30},
  ];
  setDiagramCounters(10, 20);
}

function loadSampleIntoCurrentDraft() {
  pushUndo();
  loadSample();
  selectedNode = null;
  selectedArrow = null;
  render();
  saveToLocalStorage();
  setStatusModeMessage('Sample loaded', { fade: true, autoClearMs: 1600 });
}

// ══════════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════════
function render() {
  renderNodes();
  renderArrows();
  renderSidebar();
  updateStatusBar();
  updateEmptyState();
}

function updateEmptyState() {
  const el = document.getElementById('canvas-empty');
  if (!el) return;
  const hasNodes = state.nodes.length > 0;
  el.classList.toggle('visible', !hasNodes);
}

function renderNodes() {
  // Remove old node elements (keep svg)
  document.querySelectorAll('.node').forEach(e => e.remove());
  // Sort: boundary first so it renders behind
  const sorted = [...state.nodes].sort((a,b) => (a.type==='boundary'?-1:1)-(b.type==='boundary'?-1:1));
  sorted.forEach(n => {
    const el = createNodeEl(n);
    canvas.appendChild(el);
  });
  saveToLocalStorage();
}

function createNodeEl(n) {
  const div = document.createElement('div');
  div.className = `node ${n.type}`;
  div.id = `node-${n.id}`;
  div.style.left = n.x + 'px';
  div.style.top = n.y + 'px';
  div.style.width = n.w + 'px';
  div.style.minHeight = n.h + 'px';
  if (n.color) {
    const op = n.colorOpacity !== undefined ? n.colorOpacity : 51;
    const hex = op.toString(16).padStart(2,'0');
    div.style.setProperty('background', n.color + hex);
  }
  if (selectedNode === n.id) div.classList.add('selected');

  const inner = document.createElement('div');
  inner.className = 'node-inner';
  if (n.type !== 'boundary') {
    if (n.tag) {
      const tag = document.createElement('div');
      tag.className = 'node-tag';
      tag.textContent = n.tag;
      if (n.tagColor) tag.style.color = n.tagColor;
      inner.appendChild(tag);
    }
    const title = document.createElement('div');
    title.className = 'node-title';
    title.style.whiteSpace = 'pre-line';
    title.textContent = n.title;
    if (n.textColor) title.style.color = n.textColor; // textColor kept as title override for legacy
    inner.appendChild(title);
    if (n.subtitle) {
      const sub = document.createElement('div');
      sub.className = 'node-subtitle';
      sub.style.whiteSpace = 'pre-line';
      sub.textContent = n.subtitle;
      if (n.subtitleColor) sub.style.color = n.subtitleColor;
      else if (n.textColor) sub.style.color = n.textColor;
      inner.appendChild(sub);
    }
    // Functions list
    const visibleFns = (n.functions || []).filter(fn => { const name = typeof fn === 'string' ? fn : (fn.name || ''); return name.trim() && !fn.hidden; });
    if (visibleFns.length > 0) {
      const fnsWrap = document.createElement('div');
      fnsWrap.className = 'node-functions';
      const fnsLbl = document.createElement('div');
      fnsLbl.className = 'node-functions-label';
      fnsLbl.textContent = 'Functions';
      if (n.fnLabelColor) fnsLbl.style.color = n.fnLabelColor;
      else if (n.textColor) fnsLbl.style.color = n.textColor;
      fnsWrap.appendChild(fnsLbl);
      n.functions.forEach(fn => {
        const name = typeof fn === 'string' ? fn : (fn.name || '');
        if (!name.trim()) return;
        if (fn.hidden) return;
        const item = document.createElement('div');
        item.className = 'node-fn-item';
        item.textContent = name;
        if (n.fnTextColor) item.style.color = n.fnTextColor;
        else if (n.textColor) item.style.color = n.textColor;
        fnsWrap.appendChild(item);
        // Visible IO pills
        const hidIn  = fn.hiddenInputs  || [];
        const hidOut = fn.hiddenOutputs || [];
        const visIns  = (Array.isArray(fn.inputs)  ? fn.inputs  : (fn.inputs  ? [fn.inputs]  : [])).filter((_,i) => !hidIn.includes(i));
        const visOuts = (Array.isArray(fn.outputs) ? fn.outputs : (fn.outputs ? [fn.outputs] : [])).filter((_,i) => !hidOut.includes(i));
        if (visIns.length || visOuts.length) {
          const pillWrap = document.createElement('div');
          pillWrap.className = 'node-io-wrap';
          visIns.forEach(v => {
            const p = document.createElement('span');
            p.className = 'node-io-pill input';
            if (n.ioInputBg)     p.style.background = n.ioInputBg;
            if (n.ioInputBorder) p.style.borderColor = n.ioInputBorder;
            if (n.ioInputText)   p.style.color = n.ioInputText;
            setIOPillLabel(p, 'IN', v);
            pillWrap.appendChild(p);
          });
          visOuts.forEach(v => {
            const p = document.createElement('span');
            p.className = 'node-io-pill output';
            if (n.ioOutputBg)     p.style.background = n.ioOutputBg;
            if (n.ioOutputBorder) p.style.borderColor = n.ioOutputBorder;
            if (n.ioOutputText)   p.style.color = n.ioOutputText;
            setIOPillLabel(p, 'OUT', v);
            pillWrap.appendChild(p);
          });
          fnsWrap.appendChild(pillWrap);
        }
      });
      inner.appendChild(fnsWrap);
    }
  } else {
    // Boundary label — title as the main label, subtitle as smaller description
    if (n.title) {
      const title = document.createElement('div');
      title.className = 'node-title';
      title.textContent = n.title;
      if (n.textColor) title.style.color = n.textColor;
      inner.appendChild(title);
    }
    if (n.subtitle) {
      const sub = document.createElement('div');
      sub.className = 'node-boundary-sub';
      sub.textContent = n.subtitle;
      if (n.subtitleColor) sub.style.color = n.subtitleColor;
      else if (n.textColor) sub.style.color = n.textColor;
      inner.appendChild(sub);
    }
  }
  div.appendChild(inner);

  // Resize handles
  const rh = document.createElement('div');
  rh.className = 'node-resize';
  rh.addEventListener('mousedown', e => startResize(e, n.id, 'se'));
  div.appendChild(rh);
  if (n.type === 'boundary') {
    ['n','e','s','w'].forEach(edge => {
      const eh = document.createElement('div');
      eh.className = 'node-boundary-edge ' + edge;
      eh.addEventListener('mousedown', e => startResize(e, n.id, edge));
      div.appendChild(eh);
    });
  }

  // Connection points — all node types including boundary
  {
    ['n','s','e','w'].forEach(pos => {
      const cp = document.createElement('div');
      cp.className = 'conn-point';
      cp.dataset.pos = pos;
      cp.addEventListener('mousedown', e => {
        e.stopPropagation();
        if (selectedArrow && cp.classList.contains('arrow-endpoint-port')) {
          startEndpointDrag(selectedArrow, n.id, pos, e);
        } else {
          startConnect(n.id, pos, e);
        }
      });
      div.appendChild(cp);
    });
  }

  // Unified top-right info hint
  if (n.type !== 'boundary') {
    const hasDetail = (n.notes && n.notes.trim()) ||
      (n.functions || []).some(f => f.description || (f.inputs && f.inputs.length) || (f.outputs && f.outputs.length));
    const hint = document.createElement('div');
    if (hasDetail) {
      hint.className = 'node-info-hint has-detail';
      hint.textContent = 'i';
      hint.title = 'Contains documentation — double-click to view';
      div.addEventListener('mouseenter', () => { hint.textContent = '⊞ double-click'; });
      div.addEventListener('mouseleave', () => { hint.textContent = 'i'; });
    } else {
      hint.className = 'node-info-hint';
      hint.textContent = '⊞ double-click';
    }
    div.appendChild(hint);
  }

  div.addEventListener('dblclick', e => {
    if (n.type === 'boundary') return;
    e.stopPropagation();
    openNodeModal(n.id);
  });

  div.addEventListener('mousedown', e => {
    if (e.target && e.target.classList && (e.target.classList.contains('conn-point') || e.target.classList.contains('node-resize'))) return;
    if (wireActive) return;
    if (_brushActive) {
      e.stopPropagation();
      applyStyleBrush(n.id);
      return; // don't select, don't drag
    }
    selectNode(n.id);
    startDrag(e, n.id);
  });

  return div;
}

// ── ARROWS ──
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function normalizeSideOffset(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  return clamp(value, 0, 1);
}

function getArrowEndOffset(arr, end) {
  const key = end === 'from' ? 'fromOffset' : 'toOffset';
  return typeof arr?.[key] === 'number' && Number.isFinite(arr[key]) ? clamp(arr[key], 0, 1) : null;
}

function getPortXY(node, pos, offset, heightOverride) {
  const x = node.x, y = node.y, w = node.w;
  // Always use actual rendered height ? node.h is only min-height,
  // content (functions list etc.) routinely makes nodes taller.
  const h = heightOverride !== undefined ? heightOverride : getNodeActualH(node);
  const t = normalizeSideOffset(offset);
  switch(pos) {
    case 'n': return {x: x + w * t, y: y};
    case 's': return {x: x + w * t, y: y + h};
    case 'e': return {x: x + w,     y: y + h * t};
    case 'w': return {x: x,         y: y + h * t};
    default:  return {x: x + w/2,   y: y + h/2};
  }
}

function getEdgeOffsetFromPoint(node, pos, mx, my, heightOverride) {
  const h = heightOverride !== undefined ? heightOverride : getNodeActualH(node);
  const sideLen = (pos === 'n' || pos === 's') ? node.w : h;
  const inset = Math.min(24, Math.max(10, sideLen * 0.08));
  const minT = sideLen > 0 ? inset / sideLen : 0;
  const maxT = sideLen > 0 ? 1 - minT : 1;
  const raw = (pos === 'n' || pos === 's')
    ? (mx - node.x) / Math.max(node.w, 1)
    : (my - node.y) / Math.max(h, 1);
  return clamp(raw, minT, maxT);
}

function getNodeEdgeAttachment(node, mx, my, heightOverride) {
  const h = heightOverride !== undefined ? heightOverride : getNodeActualH(node);
  const edges = [
    { pos: 'n', dist: Math.abs(my - node.y) },
    { pos: 's', dist: Math.abs(my - (node.y + h)) },
    { pos: 'e', dist: Math.abs(mx - (node.x + node.w)) },
    { pos: 'w', dist: Math.abs(mx - node.x) }
  ];
  edges.sort((a, b) => a.dist - b.dist);
  const pos = edges[0].pos;
  return { pos, offset: getEdgeOffsetFromPoint(node, pos, mx, my, h) };
}

function buildArrowPath(p1, p2, fromPos, toPos, bend, lineStyle, ox, oy, orthoOffset) {
  ox = ox || 0; oy = oy || 0;
  const x1 = p1.x - ox, y1 = p1.y - oy;
  const x2 = p2.x - ox, y2 = p2.y - oy;
  const style = lineStyle || 'curved';
  const offs = { n:{x:0,y:-1}, s:{x:0,y:1}, e:{x:1,y:0}, w:{x:-1,y:0} };

  if (style === 'straight') {
    return {
      d:  `M${x1},${y1} L${x2},${y2}`,
      lx: (x1 + x2) / 2,
      ly: (y1 + y2) / 2,
      cx1: x1, cy1: y1, cx2: x2, cy2: y2  // dummy control pts (for compat)
    };
  }

  if (style === 'orthogonal') {
    // Orthogonal Z-path with two independently adjustable axes.
    // bend (pixels) = primary axis: X offset for horizontal exits, Y offset for vertical.
    // orthoOffset (pixels) = secondary axis: Y offset for horizontal exits, X for vertical.
    // Both are raw pixel offsets so canvas drag is always 1:1 with mouse movement.
    const fo  = offs[fromPos || 'e'] || {x:1, y:0};
    const to2 = offs[toPos   || 'w'] || {x:-1, y:0};
    const stub = 28;
    const ex1 = x1 + fo.x * stub,  ey1 = y1 + fo.y * stub;
    const ex2 = x2 + to2.x * stub, ey2 = y2 + to2.y * stub;
    const bendPx  = bend || 0;
    const orthoPx = orthoOffset || 0;

    if (fo.x !== 0) {
      // Horizontal exits (e/w): Z goes right→down→right (or left→up→left)
      // midX = position of the left vertical column  (bend = X offset from centre)
      // sy   = shared Y level of the horizontal crossbar (orthoOffset = Y offset from centre)
      const midX = (ex1 + ex2) / 2 + bendPx;
      const sy   = (ey1 + ey2) / 2 + orthoPx;
      const d = `M${x1},${y1} L${ex1},${ey1} L${midX},${ey1} L${midX},${sy} L${ex2},${sy} L${ex2},${ey2} L${x2},${y2}`;
      return {
        d,
        lx: (midX + ex2) / 2, ly: sy,
        cx1: ex1, cy1: ey1, cx2: ex2, cy2: ey2,
        hX: { x: midX,           y: (ey1 + sy) / 2, axis: 'x', seg: 'vertical',
              snapBase: (ex1+ex2)/2, snapTargets: [ex1, (ex1+ex2)/2, ex2] },
        hY: { x: (midX+ex2) / 2, y: sy,              axis: 'y', seg: 'horizontal',
              snapBase: (ey1+ey2)/2, snapTargets: [ey1, (ey1+ey2)/2, ey2] },
      };
    } else {
      // Vertical exits (n/s): Z goes down→right→down (or up→left→up)
      // midY = position of the horizontal crossbar (bend = Y offset from centre)
      // sx   = shared X column of the right vertical (orthoOffset = X offset from centre)
      const midY = (ey1 + ey2) / 2 + bendPx;
      const sx   = (ex1 + ex2) / 2 + orthoPx;
      const d = `M${x1},${y1} L${ex1},${ey1} L${ex1},${midY} L${sx},${midY} L${sx},${ey2} L${ex2},${ey2} L${x2},${y2}`;
      return {
        d,
        lx: sx, ly: (midY + ey2) / 2,
        cx1: ex1, cy1: ey1, cx2: ex2, cy2: ey2,
        hX: { x: (ex1+sx) / 2, y: midY,              axis: 'y', seg: 'horizontal',
              snapBase: (ey1+ey2)/2, snapTargets: [ey1, (ey1+ey2)/2, ey2] },
        hY: { x: sx,            y: (midY + ey2) / 2, axis: 'x', seg: 'vertical',
              snapBase: (ex1+ex2)/2, snapTargets: [ex1, (ex1+ex2)/2, ex2] },
      };
    }
  }

  // Default: curved bezier
  const b = bend || 0;
  const dist = Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2);
  const curve = Math.max(40, dist * 0.35) + b;
  const fo  = offs[fromPos || 'e'] || {x:1,  y:0};
  const to2 = offs[toPos   || 'w'] || {x:-1, y:0};
  const cx1 = x1 + fo.x  * curve;
  const cy1 = y1 + fo.y  * curve;
  const cx2 = x2 + to2.x * curve;
  const cy2 = y2 + to2.y * curve;
  // Bezier midpoint
  const t = 0.5, mt = 0.5;
  const lx = mt*mt*mt*x1 + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*x2;
  const ly = mt*mt*mt*y1 + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*y2;
  return {
    d: `M${x1},${y1} C${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`,
    lx, ly, cx1, cy1, cx2, cy2
  };
}

function renderArrows() {
  while (arrowSVG.firstChild) arrowSVG.removeChild(arrowSVG.firstChild);

  // Defs — markers for arrowheads
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  function makeMarker(id, color, reverse) {
    const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    m.setAttribute('id', id);
    m.setAttribute('markerWidth', '8');
    m.setAttribute('markerHeight', '6');
    m.setAttribute('refX', reverse ? '1' : '7');
    m.setAttribute('refY', '3');
    m.setAttribute('orient', 'auto');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M0,0 L0,6 L8,3 z');
    p.setAttribute('fill', color);
    m.appendChild(p);
    defs.appendChild(m);
  }
  makeMarker('ah-fwd',     getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#ff8c42', false);
  makeMarker('ah-bwd',     getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#ff8c42', true);
  makeMarker('ah-fwd-sel', getComputedStyle(document.documentElement).getPropertyValue('--accent3').trim()||'#e85e00', false);
  makeMarker('ah-bwd-sel', getComputedStyle(document.documentElement).getPropertyValue('--accent3').trim()||'#e85e00', true);
  makeMarker('ah-fwd-col', '#4f8ef7', false); // placeholder, overridden per-arrow
  arrowSVG.appendChild(defs);

  // ── Port stagger: arrows sharing the same port get a perpendicular offset
  // so they fan out instead of sitting directly on top of each other.
  // Group arrows by (nodeId, portPos) for both ends, then assign a stagger index.
  const portGroups = {}; // key: 'nodeId:pos' ? ['arrowId:end', ...]
  state.arrows.forEach(a => {
    const fk = a.from + ':' + (a.fromPos || 'e');
    const tk = a.to   + ':' + (a.toPos   || 'w');
    if (!portGroups[fk]) portGroups[fk] = [];
    if (!portGroups[tk]) portGroups[tk] = [];
    if (getArrowEndOffset(a, 'from') === null) portGroups[fk].push(a.id + ':from');
    if (getArrowEndOffset(a, 'to') === null) portGroups[tk].push(a.id + ':to');
  });

  // Perpendicular offset per port direction (rotate 90?)
  const portPerp = { n:{x:1,y:0}, s:{x:1,y:0}, e:{x:0,y:1}, w:{x:0,y:1} };
  const STAGGER = 8; // px between co-located arrows at the same port

  function staggeredPortXY(node, pos, arrowId, end, manualOffset) {
    if (manualOffset !== null) return getPortXY(node, pos, manualOffset);
    const base = getPortXY(node, pos);
    const key  = node.id + ':' + pos;
    const token = arrowId + ':' + end;
    const group = portGroups[key] || [];
    if (group.length <= 1) return base; // only arrow here ? no stagger needed
    const idx  = group.indexOf(token);
    if (idx === -1) return base;
    const total = group.length;
    const offset = (idx - (total - 1) / 2) * STAGGER;
    const perp = portPerp[pos] || {x:1, y:0};
    return { x: base.x + perp.x * offset, y: base.y + perp.y * offset };
  }

  state.arrows.forEach(a => {
    const fromNode = state.nodes.find(n => n.id === a.from);
    const toNode   = state.nodes.find(n => n.id === a.to);
    if (!fromNode || !toNode) return;

    const p1 = staggeredPortXY(fromNode, a.fromPos || 'e', a.id, 'from', getArrowEndOffset(a, 'from'));
    const p2 = staggeredPortXY(toNode,   a.toPos   || 'w', a.id, 'to', getArrowEndOffset(a, 'to'));

    const isSelected = selectedArrow === a.id;
    const stroke = isSelected ? (getComputedStyle(document.documentElement).getPropertyValue('--accent3').trim()||'#e85e00') : (a.color || (getComputedStyle(document.documentElement).getPropertyValue('--arrow-color').trim()||'#ff8c42'));

    // Per-arrow markers so colour is baked in.
    // Triangle: M0,0 L0,6 L8,3 z  — base at x=0, tip at x=8, centre at y=3
    // refX=8 places the TIP exactly at the path endpoint.
    // marker-end  uses orient="auto"              — SVG aligns tip to path direction at end.
    // marker-start uses orient="auto-start-reverse" — SVG flips 180° so tip points back along path at start.
    const uid = a.id;
    function makeArrowMarker(mid, forStart) {
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      m.setAttribute('id', mid);
      m.setAttribute('markerWidth', '8');
      m.setAttribute('markerHeight', '6');
      m.setAttribute('refX', '8');   // tip of triangle
      m.setAttribute('refY', '3');   // vertical centre
      m.setAttribute('orient', forStart ? 'auto-start-reverse' : 'auto');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', 'M0,0 L0,6 L8,3 z');
      p.setAttribute('fill', stroke);
      m.appendChild(p);
      defs.appendChild(m);
      return mid;
    }
    const mFwd = makeArrowMarker('mf-' + uid, false);  // marker-end
    const mBwd = makeArrowMarker('mb-' + uid, true);   // marker-start

    // Build path (curved / straight / orthogonal)
    const _pathResult = buildArrowPath(p1, p2, a.fromPos || 'e', a.toPos || 'w', a.bend || 0, a.lineStyle || 'curved', 0, 0, a.orthoY || 0);
    const { d, lx: _lx, ly: _ly, cx1, cy1, cx2, cy2 } = _pathResult;

    // Wide invisible hit area — must use a real (non-transparent) stroke colour
    // because SVG pointer events don't fire on stroke="transparent" in most browsers.
    // opacity="0" hides it visually while keeping hit detection reliable.
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('fill', 'none');
    hit.setAttribute('stroke', '#ffffff');
    hit.setAttribute('stroke-width', '14');
    hit.setAttribute('opacity', '0');
    hit.style.cursor = 'pointer';
    hit.style.pointerEvents = 'stroke';
    hit.addEventListener('click', e => { e.stopPropagation(); selectArrow(a.id); });
    hit.addEventListener('mouseenter', e => { showArrowTooltip(e, a); });
    hit.addEventListener('mousemove',  e => { positionArrowTooltip(e); });
    hit.addEventListener('mouseleave', () => { hideArrowTooltip(); });
    arrowSVG.appendChild(hit);

    // Visible path with markers
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', isSelected ? '2' : '1.5');
    path.style.pointerEvents = 'none';
    if (a.dash) path.setAttribute('stroke-dasharray', '6 3');
    if (a.direction === 'directed') {
      path.setAttribute('marker-end', `url(#mf-${uid})`);
    } else if (a.direction === 'bidirectional') {
      path.setAttribute('marker-end',   `url(#mf-${uid})`);
      path.setAttribute('marker-start', `url(#mb-${uid})`);
    }
    arrowSVG.appendChild(path);

    if (isSelected) {
      [
        { end: 'from', point: p1, nodeId: a.from, pos: a.fromPos || 'e' },
        { end: 'to',   point: p2, nodeId: a.to,   pos: a.toPos   || 'w' }
      ].forEach(handle => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'arrow-endpoint-handle' + (epDragActive && epDragArrowId === a.id && epDragEnd === handle.end ? ' dragging' : ''));
        g.setAttribute('transform', `translate(${handle.point.x},${handle.point.y})`);
        const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hit.setAttribute('class', 'hit');
        hit.setAttribute('r', '16');
        g.appendChild(hit);
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('class', 'dot');
        c.setAttribute('r', '5.5');
        g.appendChild(c);
        g.addEventListener('mousedown', e => startEndpointDrag(a.id, handle.nodeId, handle.pos, e, handle.end));
        arrowSVG.appendChild(g);
      });
    }

    // Label
    if (a.label) {
      const lx = _lx + (a.labelOffsetX || 0);
      const ly = _ly + (a.labelOffsetY || 0);
      const lines   = a.label.split('\n');
      const lBold   = !!a.labelBold;
      const lItalic = !!a.labelItalic;
      const lColor  = a.labelColor || 'var(--text2)';
      const fontSize = 11;
      const lineH   = fontSize + 4;
      const totalH  = lines.length * lineH;
      const maxW    = Math.max(...lines.map(l => l.length)) * (lBold ? 7 : 6.5);

      // Background rect — highlighted when selected
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', lx - maxW/2 - 5);
      bg.setAttribute('y', ly - totalH/2 - 5);
      bg.setAttribute('width',  maxW + 10);
      bg.setAttribute('height', totalH + 8);
      bg.setAttribute('rx', '4');
      bg.setAttribute('fill', 'var(--bg)');
      bg.setAttribute('stroke', isSelected ? 'var(--accent3)' : 'var(--border)');
      bg.setAttribute('stroke-width', isSelected ? '1.5' : '1');
      arrowSVG.appendChild(bg);

      // Text — one tspan per line for multi-line support
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', lx);
      txt.setAttribute('y', ly - (lines.length - 1) * lineH / 2);
      txt.setAttribute('fill', lColor);
      txt.setAttribute('font-size', fontSize);
      txt.setAttribute('font-family', 'Inter, IBM Plex Sans, sans-serif');
      txt.setAttribute('font-weight', lBold ? '600' : '400');
      txt.setAttribute('font-style',  lItalic ? 'italic' : 'normal');
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'middle');
      lines.forEach((line, i) => {
        const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        ts.setAttribute('x', lx);
        ts.setAttribute('dy', i === 0 ? '0' : lineH);
        ts.textContent = line;
        txt.appendChild(ts);
      });
      arrowSVG.appendChild(txt);

      // Drag label
      let dragging = false, ldx, ldy;
      bg.style.cursor = txt.style.cursor = 'move';
      bg.style.pointerEvents = txt.style.pointerEvents = 'all';
      const onDown = e2 => {
        if (e2.detail === 2) return; // dblclick handled separately
        e2.stopPropagation(); dragging = true;
        ldx = e2.clientX; ldy = e2.clientY;
        pushUndo();
        selectArrow(a.id);
      };
      bg.addEventListener('mousedown', onDown);
      txt.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', e2 => {
        if (!dragging) return;
        a.labelOffsetX = (a.labelOffsetX||0) + (e2.clientX - ldx) / scale;
        a.labelOffsetY = (a.labelOffsetY||0) + (e2.clientY - ldy) / scale;
        ldx = e2.clientX; ldy = e2.clientY;
        renderArrows();
      });
      window.addEventListener('mouseup', () => { if (dragging) { dragging = false; saveToLocalStorage(); } });

      // Double-click label to inline edit
      const onDbl = e2 => {
        e2.stopPropagation();
        selectArrow(a.id);
        startInlineLabelEdit(a, lx, ly);
      };
      bg.addEventListener('dblclick', onDbl);
      txt.addEventListener('dblclick', onDbl);
    }

    // Orthogonal handles — two pills, one per axis, only when selected
    if (isSelected && (a.lineStyle || 'curved') === 'orthogonal' && _pathResult.hX) {
      const handles = [
        { info: _pathResult.hX, prop: 'bend',   color: 'var(--accent3)' },
        { info: _pathResult.hY, prop: 'orthoY',  color: 'var(--accent2)' },
      ];

      handles.forEach(({ info, prop, color }) => {
        // seg = which line segment it sits on ('vertical' or 'horizontal')
        // axis = which direction to drag ('x' = left/right, 'y' = up/down)
        const isVertSeg = info.seg === 'vertical';
        const isXDrag   = info.axis === 'x';
        // Pill shape: tall (portrait) for vertical segments, wide (landscape) for horizontal
        const hw = isVertSeg ? 14 : 28;
        const hh = isVertSeg ? 28 : 14;

        const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        pill.setAttribute('x', info.x - hw/2);
        pill.setAttribute('y', info.y - hh/2);
        pill.setAttribute('width', hw);
        pill.setAttribute('height', hh);
        pill.setAttribute('rx', '7');
        pill.setAttribute('fill', color);
        pill.setAttribute('opacity', '0.85');
        pill.style.cursor = isXDrag ? 'ew-resize' : 'ns-resize';
        pill.style.pointerEvents = 'all';

        // Grip lines — perpendicular to the pill's long axis
        const grip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        grip.style.pointerEvents = 'none';
        [-4, 0, 4].forEach(off => {
          const gl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          if (isVertSeg) {
            // Tall pill — horizontal grips
            gl.setAttribute('x1', info.x - 4); gl.setAttribute('y1', info.y + off);
            gl.setAttribute('x2', info.x + 4); gl.setAttribute('y2', info.y + off);
          } else {
            // Wide pill — vertical grips
            gl.setAttribute('x1', info.x + off); gl.setAttribute('y1', info.y - 4);
            gl.setAttribute('x2', info.x + off); gl.setAttribute('y2', info.y + 4);
          }
          gl.setAttribute('stroke', 'var(--bg)');
          gl.setAttribute('stroke-width', '1.5');
          gl.setAttribute('stroke-linecap', 'round');
          grip.appendChild(gl);
        });

        arrowSVG.appendChild(pill);
        arrowSVG.appendChild(grip);

        // Drag — raw pixels, 1:1 with mouse movement
        let dragging = false, startPos = 0, startVal = 0;
        pill.addEventListener('mousedown', e2 => {
          e2.stopPropagation();
          dragging = true;
          startPos = isXDrag ? e2.clientX : e2.clientY;
          startVal = a[prop] || 0;
          pushUndo();
          selectArrow(a.id);
        });
        const SNAP_THRESHOLD = 12; // canvas px within which we snap
        window.addEventListener('mousemove', e2 => {
          if (!dragging) return;
          const delta = (isXDrag ? (e2.clientX - startPos) : (e2.clientY - startPos)) / scale;
          let val = startVal + delta;

          // Snap to port alignment targets if snap targets are defined on this handle
          if (info.snapTargets && info.snapBase !== undefined) {
            for (const target of info.snapTargets) {
              const offset = target - info.snapBase; // what a[prop] would need to be
              if (Math.abs(val - offset) < SNAP_THRESHOLD) {
                val = offset;
                break;
              }
            }
          }

          a[prop] = val;
          renderArrows();
          // Sync sidebar sliders
          const slA = document.getElementById('ortho-slider-bend');
          const slB = document.getElementById('ortho-slider-orthoY');
          if (slA) { slA.value = Math.round(a.bend || 0); updateSliderPct(slA); }
          if (slB) { slB.value = Math.round(a.orthoY || 0); updateSliderPct(slB); }
        });
        window.addEventListener('mouseup', () => {
          if (dragging) {
            dragging = false;
            saveToLocalStorage();
            if (selectedArrow === a.id) renderSidebar();
          }
        });
      });
    }

  });
}


function bezierPt(p0,p1,p2,p3,t) {
  const mt = 1-t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
}

// ── SIDEBAR ──

// ══════════════════════════════════════════════
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

function createPropSectionHeader(labelText, badgeText, sectionKey, bodyEl) {
  const header = document.createElement('div');
  header.className = 'prop-section-head' + (_propSectionState[sectionKey] !== false ? ' open' : '');

  const label = document.createElement('div');
  label.className = 'prop-label';
  label.style.marginBottom = '0';
  label.textContent = labelText;
  header.appendChild(label);

  const meta = document.createElement('div');
  meta.className = 'prop-section-meta';

  const badge = document.createElement('span');
  badge.style.cssText = 'font-family:"IBM Plex Mono",monospace;font-size:9px;background:var(--surface3);color:var(--text3);padding:1px 6px;border-radius:3px;';
  badge.textContent = badgeText;
  meta.appendChild(badge);

  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'prop-section-chevron');
  chevron.setAttribute('viewBox', '0 0 10 10');
  chevron.setAttribute('fill', 'none');
  chevron.innerHTML = '<path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>';
  meta.appendChild(chevron);

  header.appendChild(meta);
  if (_propSectionState[sectionKey] === false) bodyEl.classList.add('hidden');

  header.addEventListener('click', () => {
    const isOpen = _propSectionState[sectionKey] !== false;
    _propSectionState[sectionKey] = !isOpen;
    header.classList.toggle('open', !isOpen);
    bodyEl.classList.toggle('hidden', isOpen);
  });

  return header;
}

function renderSidebar() {
  document.getElementById('node-count').textContent = state.nodes.filter(n=>n.type!=='boundary').length;
  const list = document.getElementById('node-list');
  list.innerHTML = '';
  state.nodes.filter(n=>n.type!=='boundary').forEach(n => {
    const item = document.createElement('div');
    item.className = 'node-list-item' + (selectedNode===n.id ? ' selected':'');
    const dot = document.createElement('div');
    dot.className = 'node-list-dot';
    dot.style.background = n.type==='internal' ? 'var(--accent)' : 'var(--accent2)';
    item.appendChild(dot);
    const label = document.createElement('span');
    label.textContent = (n.tag ? n.tag + ' · ':'') + n.title.replace(/\n/g,' ');
    item.appendChild(label);
    item.addEventListener('click', () => selectNode(n.id));
    list.appendChild(item);
  });
  renderPropsPanel();
}

function renderPropsPanel() {
  const section = document.getElementById('props-section');
  const body = document.getElementById('props-body');
  if (!selectedNode && !selectedArrow) {
    body.innerHTML = '<div style="font-size:11px;color:var(--text3);font-style:italic;padding:4px 0 2px;text-align:center;line-height:1.6;">Select a node or arrow<br>to view properties</div>';
    return;
  }
  body.innerHTML = '';

  if (selectedNode) {
    const n = state.nodes.find(x => x.id===selectedNode);
    if (!n) return;

    const isBoundary = n.type === 'boundary';
    const fields = [
      {label:'Tag / ID', key:'tag', type:'text', placeholder:'e.g. ERP-01'},
      {label: isBoundary ? 'Label' : 'Title', key:'title', type:'textarea', placeholder: isBoundary ? 'Boundary label' : 'System name'},
      {label: isBoundary ? 'Description' : 'Subtitle / Description', key:'subtitle', type:'textarea', placeholder:'Short description'},
    ];
    fields.forEach(f => {
      const row = document.createElement('div');
      row.className = 'prop-row';
      const lbl = document.createElement('div');
      lbl.className = 'prop-label';
      lbl.textContent = f.label;
      row.appendChild(lbl);
      let inp;
      if (f.type === 'textarea') {
        inp = document.createElement('textarea');
        inp.rows = 2;
      } else {
        inp = document.createElement('input');
        inp.type = f.type;
      }
      inp.className = 'prop-input';
      inp.value = n[f.key] || '';
      inp.placeholder = f.placeholder || '';
      inp.addEventListener('input', () => { n[f.key] = inp.value; renderNodes(); renderArrows(); });
      row.appendChild(inp);
      body.appendChild(row);
    });

    // Text colour controls for boundary nodes (no Content Style panel for them)
    if (n.type === 'boundary') {
      function makeBoundaryColorRow(labelText, field, defaultVar) {
        const row = document.createElement('div'); row.className = 'prop-row';
        const lbl = document.createElement('div'); lbl.className='prop-label'; lbl.textContent=labelText;
        row.appendChild(lbl);
        const inline = document.createElement('div'); inline.className='prop-row-inline';
        const inp = document.createElement('input'); inp.type='color'; inp.className='prop-input';
        inp.style.cssText = 'flex:1;min-width:0;height:32px;padding:2px 4px;cursor:pointer;';
        const dflt = getComputedStyle(document.documentElement).getPropertyValue(defaultVar).trim() || '#999999';
        inp.value = n[field] || dflt;
        inp.addEventListener('input', () => { pushUndoDebounced(); n[field] = inp.value; renderNodes(); saveToLocalStorage(); });
        const rst = document.createElement('button'); rst.className='prop-btn'; rst.title='Reset colour'; rst.textContent='↺';
        rst.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;margin-bottom:0;font-size:13px;display:flex;align-items:center;justify-content:center;';
        rst.addEventListener('click', () => {
          pushUndo(); n[field] = '';
          inp.value = getComputedStyle(document.documentElement).getPropertyValue(defaultVar).trim() || '#999999';
          renderNodes(); saveToLocalStorage();
        });
        inline.appendChild(inp); inline.appendChild(rst);
        row.appendChild(inline);
        body.appendChild(row);
      }
      makeBoundaryColorRow('Label colour',       'textColor',     '--text3');
      makeBoundaryColorRow('Description colour', 'subtitleColor', '--text3');
    }

    // Type
    addPropRow(body, 'Node type', () => {
      const sel = document.createElement('select');
      sel.className = 'prop-select';
      ['internal','external','boundary'].forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t.charAt(0).toUpperCase()+t.slice(1);
        if (n.type===t) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => { pushUndo(); n.type = sel.value; renderNodes(); });
      return sel;
    });

    const typeDivider = document.createElement('div');
    typeDivider.className = 'prop-divider';
    body.appendChild(typeDivider);

    // Color
    const colorRow = document.createElement('div');
    colorRow.className = 'prop-row';
    const colorLbl = document.createElement('div'); colorLbl.className='prop-label'; colorLbl.textContent='Background colour';
    colorRow.appendChild(colorLbl);
    const colorInline = document.createElement('div'); colorInline.className='prop-row-inline';
    const colorInp = document.createElement('input'); colorInp.type='color'; colorInp.className='prop-input';
    colorInp.style.cssText = 'flex:1;min-width:0;height:32px;padding:2px 4px;cursor:pointer;';
    const _defaultNodeColor = getComputedStyle(document.documentElement).getPropertyValue(
      n.type === 'external' ? '--node-external' : '--node-internal'
    ).trim().replace(/^#([0-9a-f]{6})[0-9a-f]{0,2}$/i,'#$1') || '#ffffff';
    colorInp.value = n.color || _defaultNodeColor;
    colorInp.addEventListener('input', () => { pushUndoDebounced(); n.color = colorInp.value; updateNodeBg(); });
    const colorReset = document.createElement('button'); colorReset.className='prop-btn'; colorReset.title='Reset colour'; colorReset.textContent='↺';
    colorReset.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;margin-bottom:0;font-size:13px;display:flex;align-items:center;justify-content:center;';
    colorReset.addEventListener('click', () => {
      pushUndo(); n.color=''; n.colorOpacity=undefined;
      colorInp.value = getComputedStyle(document.documentElement).getPropertyValue(
        n.type === 'external' ? '--node-external' : '--node-internal'
      ).trim().replace(/^#([0-9a-f]{6})[0-9a-f]{0,2}$/i,'#$1') || '#ffffff';
      opacitySlider.value=255; updateSliderPct(opacitySlider); renderNodes();
    });
    colorInline.appendChild(colorInp); colorInline.appendChild(colorReset);
    colorRow.appendChild(colorInline);
    body.appendChild(colorRow);
    // Opacity slider
    const opRow = document.createElement('div'); opRow.className='prop-row';
    const opLbl = document.createElement('div'); opLbl.className='prop-label';
    const currentOp = n.colorOpacity !== undefined ? n.colorOpacity : 255;
    opLbl.textContent = 'Fill opacity — ' + Math.round(currentOp/255*100) + '%';
    opRow.appendChild(opLbl);
    const opSlider = document.createElement('input'); opSlider.type='range'; opSlider.className='prop-input';
    opSlider.min=0; opSlider.max=255; opSlider.value=currentOp;
    const opacitySlider = opSlider;
    updateSliderPct(opSlider);
    function updateNodeBg() {
      pushUndoDebounced();
      n.color = colorInp.value;
      n.colorOpacity = parseInt(opSlider.value);
      opLbl.textContent = 'Fill opacity — ' + Math.round(n.colorOpacity/255*100) + '%';
      renderNodes();
    }
    opSlider.addEventListener('input', () => { updateSliderPct(opSlider); updateNodeBg(); });
    opRow.appendChild(opSlider);
    body.appendChild(opRow);



    // Appearance slide-out button — not shown for boundary nodes
    if (n.type !== 'boundary') {
      const apBtn = document.createElement('button');
      apBtn.className = 'prop-btn accent ap-open-btn';
      apBtn.dataset.node = n.id;
      apBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2"/><path d="M6 3.5v1M6 7.5v1M3.5 6h1M7.5 6h1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg> Content Style…';
      if (_apNodeId === n.id) apBtn.classList.add('active');
      apBtn.addEventListener('click', () => {
        if (_apNodeId === n.id) { closeAppearancePanel(); }
        else { openAppearancePanel(n.id); }
      });
      body.appendChild(apBtn);
    }

    // Style brush button
    const brushBtn = document.createElement('button');
    brushBtn.className = 'prop-btn accent brush-btn';
    brushBtn.dataset.node = n.id;
    if (_brushActive) brushBtn.classList.add('active');
    brushBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 12l3-3 5.5-5.5a1.5 1.5 0 0 0-2.1-2.1L3 7 2 12z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 3.5l1 1" stroke="currentColor" stroke-width="1.3"/><circle cx="2.5" cy="11.5" r="1" fill="currentColor" opacity="0.7"/></svg> Style Brush`;
    brushBtn.addEventListener('click', () => {
      if (_brushActive) { cancelStyleBrush(); }
      else { startStyleBrush(n.id); }
    });
    body.appendChild(brushBtn);

    const functionsDivider = document.createElement('div');
    functionsDivider.className = 'prop-divider';
    body.appendChild(functionsDivider);

    // Functions — compact summary + open modal button
    if (n.type !== 'boundary') {
      if (!n.functions) n.functions = [];
      n.functions = n.functions.map(f => typeof f === 'string' ? { name: f, inputs: '', outputs: '', description: '' } : f);

      const fnSection = document.createElement('div');
      fnSection.className = 'prop-row';

      const visibleFnCount = n.functions.filter(f => (f.name||'').trim() && !f.hidden).length;
      const hiddenFnCount = n.functions.filter(f => f.hidden).length;
      const fnBody = document.createElement('div');
      fnBody.className = 'prop-section-body';
      const fnHeader = createPropSectionHeader('Internal Functions', visibleFnCount + ' visible' + (hiddenFnCount ? ', ' + hiddenFnCount + ' hidden' : ''), 'functions', fnBody);
      fnSection.appendChild(fnHeader);

      // Per-function rows with visibility toggle + click-to-edit
      const fnList = document.createElement('div');
      fnList.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-bottom:8px;';
      const namedFns = n.functions.filter(f => (f.name||'').trim());
      if (namedFns.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:11px;color:var(--text3);font-style:italic;padding:2px 0;';
        empty.textContent = 'No functions defined yet';
        fnList.appendChild(empty);
      } else {
        namedFns.forEach((f, idx) => {
          // Find real index in n.functions (namedFns may skip empty entries)
          const realIdx = n.functions.indexOf(f);
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:5px;padding:3px 6px;border-radius:4px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:border-color 0.12s;' + (f.hidden ? 'opacity:0.45;' : '');
          row.title = 'Click to edit in function editor';
          // Eye toggle
          const eyeBtn = document.createElement('button');
          eyeBtn.style.cssText = 'flex-shrink:0;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;padding:0;color:var(--text3);opacity:' + (f.hidden ? '0.4' : '0.75') + ';transition:opacity 0.12s;';
          eyeBtn.title = f.hidden ? 'Show on canvas' : 'Hide from canvas';
          eyeBtn.innerHTML = f.hidden ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>';
          eyeBtn.addEventListener('click', e2 => {
            e2.stopPropagation();
            pushUndo();
            f.hidden = !f.hidden;
            renderNodes();
            requestAnimationFrame(() => renderArrows());
            renderSidebar();
            updateStatusBar();
            saveToLocalStorage();
          });
          // Name
          const nameSpan = document.createElement('span');
          nameSpan.style.cssText = 'flex:1;font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          nameSpan.textContent = (f.name||'').slice(0, 32);
          // Edit arrow
          const editArrow = document.createElement('span');
          editArrow.style.cssText = 'flex-shrink:0;font-size:10px;color:var(--text3);opacity:0.5;';
          editArrow.textContent = '›';
          row.appendChild(eyeBtn);
          row.appendChild(nameSpan);
          row.appendChild(editArrow);
          row.addEventListener('mouseenter', () => { row.style.borderColor = 'var(--border2)'; editArrow.style.opacity = '1'; });
          row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--border)'; editArrow.style.opacity = '0.5'; });
          row.addEventListener('click', () => {
            openFnModal(n.id);
            // Select the specific function after modal opens
            setTimeout(() => selectFn(realIdx), 60);
          });
          fnList.appendChild(row);
        });
      }
      fnBody.appendChild(fnList);

      // Edit button
      const editFnBtn = document.createElement('button');
      editFnBtn.className = 'prop-btn accent';
      editFnBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;';
      editFnBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg> Edit functions…';
      editFnBtn.addEventListener('click', () => openFnModal(n.id));
      fnBody.appendChild(editFnBtn);

      fnSection.appendChild(fnBody);
      body.appendChild(fnSection);
    }

    // Connections — compact summary above the action button
    if (n.type !== 'boundary') {
      const connSection = document.createElement('div');
      connSection.className = 'prop-row';

      const relatedConnections = state.arrows.filter(a => a.from === n.id || a.to === n.id);
      const connBody = document.createElement('div');
      connBody.className = 'prop-section-body';
      const connHeader = createPropSectionHeader('Connections', relatedConnections.length + ' total', 'connections', connBody);
      connSection.appendChild(connHeader);

      const connList = document.createElement('div');
      connList.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-bottom:8px;';
      if (relatedConnections.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'font-size:11px;color:var(--text3);font-style:italic;padding:2px 0;';
        empty.textContent = 'No connections yet';
        connList.appendChild(empty);
      } else {
        relatedConnections.forEach(a => {
          const otherId = a.from === n.id ? a.to : a.from;
          const other = state.nodes.find(x => x.id === otherId);
          const isOutgoing = a.from === n.id;
          const isBidir = a.direction === 'bidirectional';

          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;transition:border-color 0.12s;';
          row.title = 'Click to select this connection';

          const dir = document.createElement('span');
          dir.style.cssText = 'flex-shrink:0;font-size:11px;color:var(--accent3);font-family:"IBM Plex Mono",monospace;';
          dir.textContent = isBidir ? '↔' : (isOutgoing ? '→' : '←');
          row.appendChild(dir);

          const info = document.createElement('div');
          info.style.cssText = 'flex:1;min-width:0;';

          const name = document.createElement('div');
          name.style.cssText = 'font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          name.textContent = other
            ? ((other.tag ? other.tag + ' · ' : '') + (other.title || '').replace(/\n/g, ' '))
            : 'Unknown node';
          info.appendChild(name);

          const meta = document.createElement('div');
          meta.style.cssText = 'font-size:9px;color:var(--text3);font-family:"IBM Plex Mono",monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;';
          meta.textContent = a.label
            ? ((isBidir ? 'bidirectional' : (isOutgoing ? 'outgoing' : 'incoming')) + ' · ' + a.label)
            : (isBidir ? 'bidirectional' : (isOutgoing ? 'outgoing' : 'incoming'));
          info.appendChild(meta);

          row.appendChild(info);
          const editArrow = document.createElement('span');
          editArrow.style.cssText = 'flex-shrink:0;font-size:10px;color:var(--text3);opacity:0.5;';
          editArrow.textContent = '\u203A';
          row.appendChild(editArrow);
          row.addEventListener('mouseenter', () => { row.style.borderColor = 'var(--border2)'; editArrow.style.opacity = '1'; });
          row.addEventListener('mouseleave', () => { row.style.borderColor = 'var(--border)'; editArrow.style.opacity = '0.5'; });
          row.addEventListener('click', () => selectArrow(a.id));
          connList.appendChild(row);
        });
      }
      connBody.appendChild(connList);
      const connBtn = document.createElement('button');
      connBtn.className = 'prop-btn accent';
      connBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;';
      connBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="2.5" cy="6" r="1.5" fill="currentColor"/><circle cx="9.5" cy="6" r="1.5" fill="currentColor"/><line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 1.2"/></svg> New connection…';
      connBtn.addEventListener('click', () => openConnectModal(n.id));
      connBody.appendChild(connBtn);
      connSection.appendChild(connBody);
      body.appendChild(connSection);
    }

    const actionDivider = document.createElement('div');
    actionDivider.className = 'prop-divider';
    body.appendChild(actionDivider);

    // Duplicate
    const dupBtn = document.createElement('button');
    dupBtn.className = 'prop-btn accent';
    dupBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:6px;width:100%;';
    dupBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 8V2a1 1 0 0 1 1-1h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg> Duplicate node';
    dupBtn.title = 'Duplicate this node (Ctrl+C then Ctrl+V)';
    dupBtn.addEventListener('click', () => {
      copySelectedNode();
      pasteNode();
    });
    body.appendChild(dupBtn);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.className = 'prop-btn danger'; delBtn.textContent = '✕ Delete node';
    delBtn.addEventListener('click', () => deleteSelected());
    body.appendChild(delBtn);

  } else if (selectedArrow) {
    const a = state.arrows.find(x => x.id===selectedArrow);
    if (!a) return;

    addPropRow(body, 'Label', () => {
      const ta = document.createElement('textarea');
      ta.className = 'prop-input';
      ta.rows = 2;
      ta.style.cssText = 'resize:vertical;min-height:42px;line-height:1.4;font-family:inherit;font-size:11.5px;';
      ta.placeholder = 'Connection label… (Shift+Enter for new line)';
      ta.value = a.label || '';
      ta.addEventListener('input', () => {
        pushUndoDebounced();
        a.label = ta.value;
        renderArrows(); saveToLocalStorage();
      });
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
      });
      return ta;
    });

    // Line style
    addPropRow(body, 'Line style', () => {
      const row = document.createElement('div');
      row.className = 'line-style-row';
      const styles = [{v:'curved',l:'∿'},{v:'straight',l:'╱'},{v:'orthogonal',l:'⌐'}];
      styles.forEach(s => {
        const b = document.createElement('button');
        b.className = 'line-style-btn' + ((a.lineStyle||'curved')===s.v?' active':'');
        b.textContent = s.l; b.title = s.v.charAt(0).toUpperCase()+s.v.slice(1);
        b.addEventListener('click', () => {
          pushUndo(); a.lineStyle = s.v;
          // Reset offsets when switching styles
          a.bend = 0; a.orthoY = 0;
          renderArrows(); saveToLocalStorage();
          renderPropsPanel(); // rebuild so correct sliders render
        });
        row.appendChild(b);
      });
      return row;
    });

    addPropRow(body, 'Direction', () => {
      const row = document.createElement('div');
      row.className = 'dir-toggle-row';
      const opts = [{v:'directed',l:'→'},{v:'bidirectional',l:'↔'},{v:'undirected',l:'──'}];
      opts.forEach(o => {
        const b = document.createElement('button');
        b.className = 'dir-btn' + (a.direction===o.v?' active':'');
        b.textContent = o.l; b.title = o.v;
        b.addEventListener('click', () => {
          pushUndo();
          a.direction = o.v;
          row.querySelectorAll('.dir-btn').forEach(x=>x.classList.remove('active'));
          b.classList.add('active');
          renderArrows();
        });
        row.appendChild(b);
      });
      return row;
    });

    // From/To port
    addPropRow(body, 'From port (source)', () => makePortSelect(a, 'fromPos', () => { renderArrows(); renderSidebar(); }));
    addPropRow(body, 'To port (target)', () => makePortSelect(a, 'toPos', () => { renderArrows(); renderSidebar(); }));

    // Bend
    const _isOrth = a.lineStyle === 'orthogonal';
    const _isStraight = a.lineStyle === 'straight';

    // For curved: bend slider. For orthogonal: two offset sliders. For straight: nothing.
    if (!_isStraight && !_isOrth) {
      const bendRow = document.createElement('div');
      bendRow.className = 'prop-row bend-row';
      const bendLbl = document.createElement('div'); bendLbl.className='prop-label'; bendLbl.textContent='Curve / bend';
      bendRow.appendChild(bendLbl);
      const bendInp = document.createElement('input'); bendInp.type='range'; bendInp.className='prop-input';
      bendInp.min=-120; bendInp.max=120; bendInp.value=a.bend||0;
      updateSliderPct(bendInp);
      bendInp.addEventListener('input', () => { updateSliderPct(bendInp); pushUndoDebounced(); a.bend = parseInt(bendInp.value); renderArrows(); });
      bendRow.appendChild(bendInp);
      body.appendChild(bendRow);
    }
    const hasManualEndpointOffsets = getArrowEndOffset(a, 'from') !== null || getArrowEndOffset(a, 'to') !== null;
    const resetControlsRow = document.createElement('div');
    resetControlsRow.style.cssText = 'display:flex;justify-content:flex-end;gap:6px;margin-bottom:6px;';
    function setMiniResetDisabled(btn, disabled) {
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.45' : '1';
      btn.style.cursor = disabled ? 'default' : 'pointer';
    }
    if (_isOrth) {
      const hasManualRouting = () => Math.round(a.bend || 0) !== 0 || Math.round(a.orthoY || 0) !== 0;
      const resetRouteBtn = document.createElement('button');
      resetRouteBtn.textContent = '\u21ba Reset routing';
      resetRouteBtn.title = 'Reset connection path to default';
      resetRouteBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-size:10px;';
      setMiniResetDisabled(resetRouteBtn, !hasManualRouting());
      resetRouteBtn.addEventListener('click', () => {
        if (!hasManualRouting()) return;
        pushUndo(); a.bend = 0; a.orthoY = 0;
        const slA = document.getElementById('ortho-slider-bend');
        const slB = document.getElementById('ortho-slider-orthoY');
        if (slA) { slA.value = 0; updateSliderPct(slA); }
        if (slB) { slB.value = 0; updateSliderPct(slB); }
        setMiniResetDisabled(resetRouteBtn, true);
        renderArrows(); saveToLocalStorage(); renderSidebar();
      });
      resetControlsRow.appendChild(resetRouteBtn);
    }
    const resetEndpointsBtn = document.createElement('button');
    resetEndpointsBtn.textContent = '\u21ba Reset end-points';
    resetEndpointsBtn.title = 'Reset manual endpoint positions to the default side midpoint';
    resetEndpointsBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-size:10px;';
    if (!hasManualEndpointOffsets) {
      resetEndpointsBtn.disabled = true;
      resetEndpointsBtn.style.opacity = '0.45';
      resetEndpointsBtn.style.cursor = 'default';
    }
    resetEndpointsBtn.addEventListener('click', () => {
      if (!hasManualEndpointOffsets) return;
      pushUndo();
      a.fromOffset = null;
      a.toOffset = null;
      saveToLocalStorage();
      selectArrow(a.id);
    });
    resetControlsRow.appendChild(resetEndpointsBtn);
    body.appendChild(resetControlsRow);

    if (_isOrth) {
      // Two sliders ? one per axis. Labels depend on from-port direction.
      const fromP = a.fromPos || 'e';
      const isHorizExit = (fromP === 'e' || fromP === 'w');
      const labelA = isHorizExit ? 'Column X position' : 'Crossbar Y position';
      const labelB = isHorizExit ? 'Crossbar Y position' : 'Column X position';

      [[labelA, 'bend', 'ortho-slider-bend'], [labelB, 'orthoY', 'ortho-slider-orthoY']].forEach(([lbl, prop, sid]) => {
        const row = document.createElement('div');
        row.className = 'prop-row';
        const rl = document.createElement('div'); rl.className = 'prop-label'; rl.textContent = lbl;
        row.appendChild(rl);
        const sl = document.createElement('input'); sl.type = 'range'; sl.className = 'prop-input';
        sl.id = sid; sl.min = -300; sl.max = 300; sl.value = Math.round(a[prop] || 0);
        updateSliderPct(sl);
        sl.addEventListener('input', () => {
          updateSliderPct(sl);
          pushUndoDebounced();
          a[prop] = parseInt(sl.value);
          const routeResetBtn = resetControlsRow.querySelector('button');
          if (routeResetBtn && routeResetBtn.textContent.includes('Reset routing')) {
            setMiniResetDisabled(routeResetBtn, Math.round(a.bend || 0) === 0 && Math.round(a.orthoY || 0) === 0);
          }
          renderArrows();
          saveToLocalStorage();
        });
        row.appendChild(sl);
        body.appendChild(row);
      });
    }

    // Dash
    const dashRow = document.createElement('div');
    dashRow.className = 'prop-row prop-row-inline';
    const dashChk = document.createElement('input'); dashChk.type='checkbox'; dashChk.checked=!!a.dash;
    dashChk.addEventListener('change', () => { pushUndo(); a.dash=dashChk.checked; renderArrows(); });
    const dashLbl = document.createElement('label'); dashLbl.textContent=' Dashed line'; dashLbl.style.fontSize='12px'; dashLbl.style.color='var(--text2)';
    dashRow.appendChild(dashChk); dashRow.appendChild(dashLbl);
    body.appendChild(dashRow);

    // Color
    const colorRow2 = document.createElement('div');
    colorRow2.className = 'prop-row';
    const cl2 = document.createElement('div'); cl2.className='prop-label'; cl2.textContent='Connector colour';
    colorRow2.appendChild(cl2);
    const ci2Inline = document.createElement('div'); ci2Inline.className='prop-row-inline';
    const ci2 = document.createElement('input'); ci2.type='color'; ci2.className='prop-input';
    ci2.style.cssText = 'flex:1;min-width:0;height:32px;padding:2px 4px;cursor:pointer;';
    ci2.value = a.color || getComputedStyle(document.documentElement).getPropertyValue('--arrow-color').trim() || '#ff8c42';
    ci2.addEventListener('input', () => { pushUndoDebounced(); a.color=ci2.value; renderArrows(); });
    const ci2Reset = document.createElement('button'); ci2Reset.className='prop-btn'; ci2Reset.title='Reset colour'; ci2Reset.textContent='↺';
    ci2Reset.style.cssText = 'flex-shrink:0;width:28px;height:28px;padding:0;margin-bottom:0;font-size:13px;display:flex;align-items:center;justify-content:center;';
    ci2Reset.addEventListener('click', () => {
      pushUndo(); a.color='';
      ci2.value = getComputedStyle(document.documentElement).getPropertyValue('--arrow-color').trim() || '#ff8c42';
      renderArrows(); saveToLocalStorage();
    });
    ci2Inline.appendChild(ci2); ci2Inline.appendChild(ci2Reset);
    colorRow2.appendChild(ci2Inline);
    body.appendChild(colorRow2);

    // ── Label section ──
    const lblSec = document.createElement('div');
    lblSec.className = 'prop-row';
    const lblSecHead = document.createElement('div');
    lblSecHead.className = 'prop-label'; lblSecHead.textContent = 'Label style';
    lblSec.appendChild(lblSecHead);

    // Bold / Italic toggles + colour + reset position
    const lblStyleRow = document.createElement('div');
    lblStyleRow.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap;';

    const boldBtn = document.createElement('button');
    boldBtn.textContent = 'B'; boldBtn.title = 'Bold';
    boldBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:'+(a.labelBold?'var(--surface3)':'transparent')+';color:'+(a.labelBold?'var(--text)':'var(--text2)')+';font-weight:700;cursor:pointer;font-size:11px;';
    boldBtn.addEventListener('click', () => {
      pushUndo(); a.labelBold = !a.labelBold;
      boldBtn.style.background = a.labelBold ? 'var(--surface3)' : 'transparent';
      boldBtn.style.color = a.labelBold ? 'var(--text)' : 'var(--text2)';
      renderArrows(); saveToLocalStorage();
    });

    const italicBtn = document.createElement('button');
    italicBtn.textContent = 'I'; italicBtn.title = 'Italic';
    italicBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:'+(a.labelItalic?'var(--surface3)':'transparent')+';color:'+(a.labelItalic?'var(--text)':'var(--text2)')+';font-style:italic;cursor:pointer;font-size:11px;';
    italicBtn.addEventListener('click', () => {
      pushUndo(); a.labelItalic = !a.labelItalic;
      italicBtn.style.background = a.labelItalic ? 'var(--surface3)' : 'transparent';
      italicBtn.style.color = a.labelItalic ? 'var(--text)' : 'var(--text2)';
      renderArrows(); saveToLocalStorage();
    });

    const lblColorInp = document.createElement('input');
    lblColorInp.type = 'color'; lblColorInp.title = 'Label colour';
    lblColorInp.value = a.labelColor || '#9aa0b8';
    lblColorInp.style.cssText = 'width:28px;height:22px;padding:1px 3px;border:1px solid var(--border);border-radius:4px;background:var(--surface2);cursor:pointer;';
    lblColorInp.addEventListener('input', () => {
      pushUndoDebounced(); a.labelColor = lblColorInp.value;
      renderArrows(); saveToLocalStorage();
    });

    const resetPosBtn = document.createElement('button');
    resetPosBtn.textContent = '↺ Reset position'; resetPosBtn.title = 'Reset label to midpoint';
    resetPosBtn.style.cssText = 'padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text3);cursor:pointer;font-size:10px;margin-left:auto;';
    resetPosBtn.addEventListener('click', () => {
      pushUndo();
      a.labelOffsetX = 0; a.labelOffsetY = 0;
      renderArrows(); saveToLocalStorage();
    });

    lblStyleRow.appendChild(boldBtn);
    lblStyleRow.appendChild(italicBtn);
    lblStyleRow.appendChild(lblColorInp);
    lblStyleRow.appendChild(resetPosBtn);
    lblSec.appendChild(lblStyleRow);

    const lblHint = document.createElement('div');
    lblHint.style.cssText = 'font-size:9.5px;color:var(--text3);margin-top:5px;font-family:"IBM Plex Mono",monospace;';
    lblHint.textContent = '↖ Drag to reposition · Double-click to edit inline';
    lblSec.appendChild(lblHint);
    body.appendChild(lblSec);

    const delBtn = document.createElement('button');
    delBtn.className = 'prop-btn danger'; delBtn.textContent = '✕ Delete arrow';
    delBtn.addEventListener('click', () => deleteSelected());
    body.appendChild(delBtn);
  }
}

function addPropRow(parent, label, makeEl) {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('div'); lbl.className='prop-label'; lbl.textContent=label;
  row.appendChild(lbl);
  const el = makeEl();
  row.appendChild(el);
  parent.appendChild(row);
}

function addPropTextInput(parent, label, obj, key, onChange) {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('div'); lbl.className='prop-label'; lbl.textContent=label;
  row.appendChild(lbl);
  const inp = document.createElement('input'); inp.type='text'; inp.className='prop-input';
  inp.value = obj[key]||'';
  inp.addEventListener('input', () => { obj[key]=inp.value; onChange(); saveToLocalStorage(); });
  row.appendChild(inp);
  parent.appendChild(row);
}

function makePortSelect(obj, key, onChange) {
  const sel = document.createElement('select');
  sel.className = 'prop-select';
  const opts = [{v:'n',l:'Top (N)'},{v:'s',l:'Bottom (S)'},{v:'e',l:'Right (E)'},{v:'w',l:'Left (W)'}];
  opts.forEach(o => {
    const opt = document.createElement('option'); opt.value=o.v; opt.textContent=o.l;
    if (obj[key]===o.v) opt.selected=true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    pushUndo();
    obj[key]=sel.value;
    if (key === 'fromPos') obj.fromOffset = null;
    if (key === 'toPos') obj.toOffset = null;
    onChange();
    saveToLocalStorage();
  });
  return sel;
}

// ══════════════════════════════════════════════
// INTERACTIONS
// ══════════════════════════════════════════════
function selectNode(id) {
  selectedNode = id;
  selectedArrow = null;
  arrowSVG.style.zIndex = '2';
  document.querySelectorAll('.node').forEach(e => {
    e.classList.remove('selected');
    e.classList.remove('arrow-endpoint');
    e.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
  const el = document.getElementById(`node-${id}`);
  if (el) el.classList.add('selected');
  // If appearance panel is open, update it for the new node (close for boundary)
  if (_apNodeId) {
    const selN = state.nodes.find(x => x.id === id);
    if (selN && selN.type === 'boundary') closeAppearancePanel();
    else if (_apNodeId !== id) openAppearancePanel(id);
  }
  renderArrows();
  renderSidebar();
}

function selectArrow(id) {
  selectedArrow = id;
  selectedNode = null;
  closeAppearancePanel();
  document.querySelectorAll('.node').forEach(e => {
    e.classList.remove('selected');
    e.classList.remove('arrow-endpoint');
    e.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
  const arr = state.arrows.find(a => a.id === id);
  if (arr) {
    const fromEl = document.getElementById('node-' + arr.from);
    const toEl   = document.getElementById('node-' + arr.to);
    if (fromEl) {
      fromEl.classList.add('arrow-endpoint');
      const ports = new Set((fromEl.dataset.hidePorts || '').split(' ').filter(Boolean));
      ports.add(arr.fromPos || 'e');
      fromEl.dataset.hidePorts = [...ports].join(' ');
    }
    if (toEl) {
      toEl.classList.add('arrow-endpoint');
      const ports = new Set((toEl.dataset.hidePorts || '').split(' ').filter(Boolean));
      ports.add(arr.toPos || 'w');
      toEl.dataset.hidePorts = [...ports].join(' ');
    }
  }
  arrowSVG.style.zIndex = '4'; // float above nodes while arrow is selected
  renderArrows();
  renderSidebar();
}

function deselect(e) {
  if (e && (e.target !== canvas && !e.target.closest('#canvas-wrap') || e.target.closest('.node') || e.target.closest('.arrow-path'))) return;
  selectedNode = null;
  selectedArrow = null;
  closeAppearancePanel();
  document.querySelectorAll('.node').forEach(e => {
    e.classList.remove('selected');
    e.classList.remove('arrow-endpoint');
    e.removeAttribute('data-hide-ports');
  });
  document.querySelectorAll('.conn-point.arrow-endpoint-port').forEach(cp => cp.classList.remove('arrow-endpoint-port'));
  arrowSVG.style.zIndex = '2'; // restore below nodes
  renderArrows();
  renderSidebar();
}

// Drag nodes
function startDrag(e, id) {
  e.preventDefault();
  pushUndo(); // snapshot before move
  const n = state.nodes.find(x=>x.id===id);
  draggingNode = id;
  const rect = canvasWrap.getBoundingClientRect();
  dragOffset.x = (e.clientX - rect.left)/scale - panX/scale - n.x;
  dragOffset.y = (e.clientY - rect.top)/scale - panY/scale - n.y;
}

// Resize
function startResize(e, id, edge = 'se') {
  e.preventDefault();
  e.stopPropagation();
  pushUndo(); // snapshot before resize
  const n = state.nodes.find(x=>x.id===id);
  resizingNode = id;
  resizeStart = { mx: e.clientX, my: e.clientY, x: n.x, y: n.y, w: n.w, h: n.h, edge };
}

// ── Connect mode ──
// ══════════════════════════════════════════════
// DRAG-TO-CONNECT SYSTEM
// ══════════════════════════════════════════════
// State
let wireActive = false;      // dragging a wire right now
let wireSrcId = null;        // source node id
let wireSrcPos = null;       // source port: n/s/e/w
let wireTempPath = null;     // SVG path element for preview
let wireTargetId = null;     // node currently being hovered as target
let wireTargetPos = null;    // best port on hovered target

// Endpoint drag — moving an existing arrow's start or end
let epDragActive = false;    // true when dragging an arrow endpoint
let epDragArrowId = null;    // which arrow
let epDragEnd = null;        // 'from' or 'to'
let wireTargetOffset = null; // normalized offset along the snapped target edge

// Called from conn-point mousedown
function startConnect(nodeId, pos, e) {
  e.preventDefault();
  e.stopPropagation();

  wireActive = true;
  wireSrcId = nodeId;
  wireSrcPos = pos;
  wireTargetId = null;
  wireTargetPos = null;
  wireTargetOffset = null;

  // Visual: mark source port
  const srcEl = document.getElementById('node-' + nodeId);
  if (srcEl) {
    srcEl.querySelectorAll('.conn-point').forEach(cp => {
      if (cp.dataset.pos === pos) cp.classList.add('drag-active');
    });
  }

  // Create SVG preview path
  wireTempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  wireTempPath.setAttribute('fill', 'none');
  wireTempPath.setAttribute('stroke', 'var(--accent3)');
  wireTempPath.setAttribute('stroke-width', '1.8');
  wireTempPath.setAttribute('stroke-dasharray', '6 3');
  wireTempPath.setAttribute('pointer-events', 'none');
  wireTempPath.setAttribute('opacity', '0.9');
  arrowSVG.appendChild(wireTempPath);

  // Add defs for preview arrowhead if needed
  let previewMarker = document.getElementById('wire-preview-marker');
  if (!previewMarker) {
    const defs = arrowSVG.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    previewMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    previewMarker.setAttribute('id', 'wire-preview-marker');
    previewMarker.setAttribute('markerWidth', '7');
    previewMarker.setAttribute('markerHeight', '5');
    previewMarker.setAttribute('refX', '6');
    previewMarker.setAttribute('refY', '2.5');
    previewMarker.setAttribute('orient', 'auto');
    const mPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mPath.setAttribute('d', 'M0,0 L0,5 L7,2.5 z');
    mPath.setAttribute('fill', 'var(--accent3)');
    previewMarker.appendChild(mPath);
    defs.appendChild(previewMarker);
    if (!arrowSVG.querySelector('defs')) arrowSVG.insertBefore(defs, arrowSVG.firstChild);
  }
  wireTempPath.setAttribute('marker-end', 'url(#wire-preview-marker)');

  document.body.classList.add('connecting');
  setStatusModeMessage('\u2192 Drag to target node \u2014 release to connect');
}

function updateWirePreview(mouseX, mouseY) {
  if (!wireActive || !wireTempPath) return;
  const srcNode = state.nodes.find(x => x.id === wireSrcId);
  if (!srcNode) return;

  let p1 = getPortXY(srcNode, wireSrcPos);
  if (epDragActive && epDragArrowId) {
    const arr = state.arrows.find(x => x.id === epDragArrowId);
    if (arr) {
      const otherEnd = epDragEnd === 'from' ? 'to' : 'from';
      const otherNode = state.nodes.find(x => x.id === (otherEnd === 'from' ? arr.from : arr.to));
      const otherPos = otherEnd === 'from' ? (arr.fromPos || 'e') : (arr.toPos || 'w');
      const otherOffset = getArrowEndOffset(arr, otherEnd);
      if (otherNode) p1 = getPortXY(otherNode, otherPos, otherOffset);
    }
  }

  let p2x = mouseX, p2y = mouseY;
  let snapPos = null;
  if (wireTargetId) {
    const tgt = state.nodes.find(x => x.id === wireTargetId);
    if (tgt) {
      if (wireTargetPos) {
        snapPos = wireTargetPos;
      } else {
        snapPos = getBestTargetPort(srcNode, wireSrcPos, tgt, mouseX, mouseY);
        wireTargetPos = snapPos;
      }
      const snapped = getPortXY(tgt, snapPos, wireTargetOffset);
      p2x = snapped.x;
      p2y = snapped.y;
    }
  }

  const offsets = {n:{x:0,y:-1}, s:{x:0,y:1}, e:{x:1,y:0}, w:{x:-1,y:0}};
  const fo = offsets[wireSrcPos] || {x:1, y:0};
  const dx = p2x - p1.x, dy = p2y - p1.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const curve = Math.max(40, dist * 0.4);
  const cx1 = p1.x + fo.x * curve;
  const cy1 = p1.y + fo.y * curve;

  let cx2, cy2;
  if (snapPos) {
    const to2 = offsets[snapPos] || {x:-1, y:0};
    cx2 = p2x + to2.x * curve;
    cy2 = p2y + to2.y * curve;
  } else {
    cx2 = p2x - fo.x * curve * 0.5;
    cy2 = p2y - fo.y * curve * 0.5;
  }

  const d = `M${p1.x},${p1.y} C${cx1},${cy1} ${cx2},${cy2} ${p2x},${p2y}`;
  wireTempPath.setAttribute('d', d);
}

function cancelWire() {
  wireActive = false;
  wireSrcId = null; wireSrcPos = null;
  wireTargetId = null; wireTargetPos = null; wireTargetOffset = null;
  epDragActive = false; epDragArrowId = null; epDragEnd = null;

  if (wireTempPath) { wireTempPath.remove(); wireTempPath = null; }
  document.body.classList.remove('connecting');
  document.querySelectorAll('.conn-point.drag-active').forEach(cp => cp.classList.remove('drag-active'));
  document.querySelectorAll('.conn-point.snap-target').forEach(cp => cp.classList.remove('snap-target'));
  document.querySelectorAll('.node.connect-target').forEach(n => n.classList.remove('connect-target'));
  const sbMode = document.getElementById('sb-mode');
  if (sbMode) setStatusModeMessage('');
}

function completeWire() {
  if (!wireActive || !wireSrcId || !wireTargetId || wireTargetId === wireSrcId) {
    cancelWire();
    return;
  }
  const toPos = wireTargetPos || getBestTargetPort(
    state.nodes.find(x=>x.id===wireSrcId), wireSrcPos,
    state.nodes.find(x=>x.id===wireTargetId), 0, 0
  );
  const id = nextArrowId();
  state.arrows.push({
    id,
    from: wireSrcId, to: wireTargetId,
    fromPos: wireSrcPos, toPos,
    direction: nextArrowType,
    label: '', labelOffsetX: 0, labelOffsetY: 0,
    color: '', dash: false, bend: 0
  });
  cancelWire();
  render();
  selectedArrow = id;
  renderArrows();
  renderSidebar();
}

// ── ENDPOINT DRAG — move an existing arrow's from/to port ──
function startEndpointDrag(arrowId, nodeId, pos, e, forcedEnd) {
  e.preventDefault();
  e.stopPropagation();
  const arr = state.arrows.find(a => a.id === arrowId);
  if (!arr) return;

  let isFrom = forcedEnd === 'from';
  let isTo = forcedEnd === 'to';
  if (!forcedEnd) {
    isFrom = arr.from === nodeId && (arr.fromPos || 'e') === pos;
    isTo   = arr.to   === nodeId && (arr.toPos   || 'w') === pos;
  }
  if (!isFrom && !isTo) return;

  pushUndo();

  epDragActive  = true;
  epDragArrowId = arrowId;
  epDragEnd     = isFrom ? 'from' : 'to';

  const otherNodeId  = isFrom ? arr.to   : arr.from;
  const otherNodePos = isFrom ? (arr.toPos || 'w') : (arr.fromPos || 'e');

  wireActive   = true;
  wireSrcId    = otherNodeId;
  wireSrcPos   = otherNodePos;
  wireTargetId = null;
  wireTargetPos = null;
  wireTargetOffset = null;

  wireTempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  wireTempPath.setAttribute('fill', 'none');
  wireTempPath.setAttribute('stroke', 'var(--accent2)');
  wireTempPath.setAttribute('stroke-width', '2');
  wireTempPath.setAttribute('stroke-dasharray', '5 3');
  wireTempPath.setAttribute('pointer-events', 'none');
  wireTempPath.setAttribute('opacity', '0.9');
  arrowSVG.appendChild(wireTempPath);

  const srcEl = document.getElementById('node-' + nodeId);
  if (srcEl && getArrowEndOffset(arr, epDragEnd) === null) {
    const cp = srcEl.querySelector(`.conn-point[data-pos="${pos}"]`);
    if (cp) cp.classList.add('drag-active');
  }

  document.body.classList.add('connecting');
  setStatusModeMessage('\u2194 Drag to reposition arrow endpoint');
}

function completeEndpointDrag() {
  if (!epDragActive) return;

  const arr = state.arrows.find(a => a.id === epDragArrowId);
  if (!arr) {
    cancelWire();
    return;
  }

  if (wireTargetId) {
    if (epDragEnd === 'from') {
      arr.from = wireTargetId;
      arr.fromPos = wireTargetPos || 'e';
      arr.fromOffset = wireTargetOffset;
    } else {
      arr.to = wireTargetId;
      arr.toPos = wireTargetPos || 'w';
      arr.toOffset = wireTargetOffset;
    }
    saveToLocalStorage();
  }

  epDragActive  = false;
  epDragArrowId = null;
  epDragEnd     = null;

  cancelWire();
  const arrowId = selectedArrow;
  render();
  if (arrowId) {
    selectedArrow = arrowId;
    selectArrow(arrowId);
  }
}

// Find best target port based on mouse position proximity to each port
function getNodeActualH(n) {
  const el = document.getElementById('node-' + n.id);
  return el ? el.offsetHeight : n.h;
}

function getPortXYActual(n, pos, offset) {
  return getPortXY(n, pos, offset, getNodeActualH(n));
}

function getBestTargetPort(srcNode, srcPos, tgtNode, mx, my) {
  const ports = ['n','s','e','w'];
  const offsets = {n:{x:0,y:-1}, s:{x:0,y:1}, e:{x:1,y:0}, w:{x:-1,y:0}};
  const tgtH = getNodeActualH(tgtNode);
  const tgtCy = tgtNode.y + tgtH / 2;

  let best = 'w', bestScore = -Infinity;
  ports.forEach(pos => {
    const p = getPortXYActual(tgtNode, pos);
    const dist = Math.sqrt((mx-p.x)**2 + (my-p.y)**2);
    const po = offsets[pos];
    // Vector from target centre toward source centre
    const sc = {
      x: srcNode.x + srcNode.w/2 - (tgtNode.x + tgtNode.w/2),
      y: srcNode.y + getNodeActualH(srcNode)/2 - tgtCy
    };
    const len = Math.sqrt(sc.x*sc.x + sc.y*sc.y) || 1;
    const align = po.x*(sc.x/len) + po.y*(sc.y/len);
    const score = align * 100 - dist * 0.3;
    if (score > bestScore) { bestScore = score; best = pos; }
  });
  return best;
}

function getBestPos(fromId, toId) {
  const fn = state.nodes.find(x=>x.id===fromId);
  const tn = state.nodes.find(x=>x.id===toId);
  const fc = {x:fn.x+fn.w/2, y:fn.y+fn.h/2};
  const tc = {x:tn.x+tn.w/2, y:tn.y+tn.h/2};
  const dx = tc.x-fc.x, dy = tc.y-fc.y;
  let fromPos, toPos;
  if (Math.abs(dx) > Math.abs(dy)) {
    fromPos = dx>0?'e':'w'; toPos = dx>0?'w':'e';
  } else {
    fromPos = dy>0?'s':'n'; toPos = dy>0?'n':'s';
  }
  return {fromPos, toPos};
}

// Legacy shim — no longer used but kept for safety
function toggleConnectMode() {}
function finishConnect(toNodeId, toPos) { completeWire(); }
connectMode = false;

// ── Add node ──
let lastNodeType = 'internal'; // tracks most recently added type for dblclick

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
  const cx = (-panX + canvasWrap.clientWidth/2) / scale - 100;
  const cy = (-panY + canvasWrap.clientHeight/2) / scale - 50;
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type==='boundary'?'Boundary Box':type==='external'?'External Entity':'New System',
    subtitle: '',
    x: cx, y: cy, w: type==='boundary'?300:180, h: type==='boundary'?200:100,
    color:'', textColor:'', functions:[]
  });
  render();
  selectNode(id);
}

function addModeAt(type, canvasX, canvasY) {
  pushUndo();
  lastNodeType = type;
  updatePaletteHighlight();
  const id = nextNodeId();
  const w = type==='boundary'?300:180, h = type==='boundary'?200:100;
  const x = Math.round((canvasX - w/2) / 10) * 10;
  const y = Math.round((canvasY - h/2) / 10) * 10;
  state.nodes.push({
    id, type, tag: nextNodeTag(type),
    title: type==='boundary'?'Boundary Box':type==='external'?'External Entity':'New System',
    subtitle: '',
    x, y, w, h, color:'', textColor:'', functions:[]
  });
  render();
  selectNode(id);
}

// ══════════════════════════════════════════════
// ZOOM & PAN
// ══════════════════════════════════════════════
function applyTransform() {
  if (canvas) canvas.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
  const zl = document.getElementById('zoom-label');
  const sz = document.getElementById('sb-zoom');
  if (zl) zl.textContent = Math.round(scale*100)+'%';
  if (sz) sz.textContent = '⊕ '+Math.round(scale*100)+'%';
}

function zoom(factor, cx, cy) {
  const oldScale = scale;
  scale = Math.min(3, Math.max(0.2, scale * factor));
  const rect = canvasWrap.getBoundingClientRect();
  cx = cx ?? rect.width/2; cy = cy ?? rect.height/2;
  panX = cx - (cx - panX) * (scale/oldScale);
  panY = cy - (cy - panY) * (scale/oldScale);
  applyTransform();
}

function resetZoom() { scale=1; panX=60; panY=40; applyTransform(); }

function fitDiagram() {
  const nonBoundary = state.nodes.filter(n => n.type !== 'boundary');
  if (nonBoundary.length === 0) return;
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  nonBoundary.forEach(n => {
    const h = getNodeActualH(n);
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + h);
  });
  const pad = 60;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const dw = maxX - minX, dh = maxY - minY;
  const vw = canvasWrap.clientWidth, vh = canvasWrap.clientHeight;
  const newScale = Math.min(3, Math.max(0.2, Math.min(vw / dw, vh / dh)));
  scale = newScale;
  panX = (vw - dw * scale) / 2 - minX * scale;
  panY = (vh - dh * scale) / 2 - minY * scale;
  applyTransform();
}


// ══════════════════════════════════════════════
// KEYBOARD
// ══════════════════════════════════════════════
document.addEventListener('keydown', e => {
  const inTextField = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA'
    || e.target.isContentEditable;

  // Delete / Backspace — only when NOT in a text field
  if (!inTextField && (e.key==='Delete'||e.key==='Backspace') && (selectedNode||selectedArrow)) deleteSelected();

  // Escape — only when NOT in a text field (text fields handle their own Escape)
  if (!inTextField && e.key==='Escape') {
    if (wireActive) cancelWire();
    if (_brushActive) { cancelStyleBrush(); return; }
    closeAppearancePanel();
    deselect();
  }

  // Ctrl/Cmd+Z — undo. Ctrl/Cmd+Shift+Z — redo. Ctrl/Cmd+Y — redo.
  if (!inTextField && (e.ctrlKey||e.metaKey) && e.key==='z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
  if (!inTextField && (e.ctrlKey||e.metaKey) && !e.shiftKey && e.key==='y') {
    e.preventDefault();
    redo();
  }

  // Ctrl/Cmd+C — copy selected node (skip when in a text field so normal text copy works)
  if (!inTextField && (e.ctrlKey||e.metaKey) && e.key==='c' && selectedNode) {
    // Don't prevent default — we don't put anything on the system clipboard,
    // so normal browser copy behaviour on selected text is unaffected.
    copySelectedNode();
  }

  // Ctrl/Cmd+V — paste node (skip when in a text field so normal text paste works)
  if (!inTextField && (e.ctrlKey||e.metaKey) && e.key==='v' && _clipboardNode) {
    e.preventDefault();
    pasteNode();
  }
});

function deleteSelected() {
  if (selectedNode) {
    pushUndo();
    state.arrows = state.arrows.filter(a => a.from!==selectedNode && a.to!==selectedNode);
    state.nodes = state.nodes.filter(n => n.id!==selectedNode);
    selectedNode = null;
  } else if (selectedArrow) {
    pushUndo();
    state.arrows = state.arrows.filter(a => a.id!==selectedArrow);
    selectedArrow = null;
  }
  render();
}

function copySelectedNode() {
  if (!selectedNode) return;
  const n = state.nodes.find(x => x.id === selectedNode);
  if (!n) return;
  // Deep-clone the node so clipboard is isolated from future edits
  _clipboardNode = JSON.parse(JSON.stringify(n));
  // Brief visual feedback via status bar
  setStatusModeMessage('\u2398 Copied \u2014 Ctrl+V to paste', { fade: true, autoClearMs: 1800 });
}

function pasteNode() {
  if (!_clipboardNode) return;
  pushUndo();
  const src = _clipboardNode;
  const id = nextNodeId();
  const OFFSET = 30; // pixels to nudge so paste is visibly distinct
  const copy = {
    ...JSON.parse(JSON.stringify(src)), // full deep-clone of all fields
    id,
    x: src.x + OFFSET,
    y: src.y + OFFSET,
  };
  // Give copy a fresh tag only if original had a tag (keeps boundary nodes tag-free)
  if (copy.tag && copy.type !== 'boundary') {
    copy.tag = nextNodeTag(copy.type);
  }
  state.nodes.push(copy);
  render();
  selectNode(id);
  // Update clipboard position so repeated pastes cascade rather than stack
  _clipboardNode = JSON.parse(JSON.stringify(copy));
}

// ══════════════════════════════════════════════
// MOUSE EVENTS
// ══════════════════════════════════════════════
canvasWrap.addEventListener('mousedown', e => {
  if (e.button === 1) {
    // Middle mouse — pan from anywhere on the canvas, no deselect
    e.preventDefault();
    panDragging = true;
    panStart = {x: e.clientX - panX, y: e.clientY - panY};
    return;
  }
  if (wireActive) return; // handled by window mouseup
  if (e.target === canvasWrap || e.target.id==='canvas' || e.target===arrowSVG) {
    deselect(e);
    panDragging = true;
    panStart = {x: e.clientX - panX, y: e.clientY - panY};
  }
});

// Double-click on empty canvas to add a node at the cursor position
canvasWrap.addEventListener('dblclick', e => {
  // Only fire on empty canvas — not on nodes, arrows, or controls
  if (e.target !== canvasWrap && e.target.id !== 'canvas' && e.target !== arrowSVG) return;
  if (wireActive) return;
  const rect = canvasWrap.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left - panX) / scale;
  const canvasY = (e.clientY - rect.top  - panY) / scale;
  addModeAt(lastNodeType, canvasX, canvasY);
});

window.addEventListener('mousemove', e => {
  if (panDragging) {
    panX = e.clientX - panStart.x;
    panY = e.clientY - panStart.y;
    applyTransform();
    return;
  }
  if (draggingNode) {
    const n = state.nodes.find(x=>x.id===draggingNode);
    const rect = canvasWrap.getBoundingClientRect();
    n.x = Math.round(((e.clientX - rect.left) / scale - panX/scale - dragOffset.x) / 10) * 10;
    n.y = Math.round(((e.clientY - rect.top) / scale - panY/scale - dragOffset.y) / 10) * 10;
    const el = document.getElementById(`node-${n.id}`);
    if (el) { el.style.left=n.x+'px'; el.style.top=n.y+'px'; }
    renderArrows();
    return;
  }
  if (resizingNode) {
    const n = state.nodes.find(x=>x.id===resizingNode);
    const dx = (e.clientX - resizeStart.mx) / scale;
    const dy = (e.clientY - resizeStart.my) / scale;
    const MIN_W = 100;
    const MIN_H = 60;
    const edge = resizeStart.edge || 'se';

    if (edge.includes('e')) {
      n.w = Math.max(MIN_W, resizeStart.w + dx);
    }
    if (edge.includes('s')) {
      n.h = Math.max(MIN_H, resizeStart.h + dy);
    }
    if (edge === 'w') {
      const nextW = Math.max(MIN_W, resizeStart.w - dx);
      n.x = resizeStart.x + (resizeStart.w - nextW);
      n.w = nextW;
    }
    if (edge === 'n') {
      const nextH = Math.max(MIN_H, resizeStart.h - dy);
      n.y = resizeStart.y + (resizeStart.h - nextH);
      n.h = nextH;
    }
    const el = document.getElementById(`node-${n.id}`);
    if (el) {
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.style.width = n.w + 'px';
      el.style.minHeight = n.h + 'px';
    }
    renderArrows();
    return;
  }
  if (wireActive) {
    const rect = canvasWrap.getBoundingClientRect();
    const mx = (e.clientX - rect.left - panX) / scale;
    const my = (e.clientY - rect.top - panY) / scale;

    // Two-pass snap:
    // Pass 1 ? snap to a specific port dot if cursor is within PORT_SNAP px of it.
    // Pass 2 ? if not near any port, snap to the nearest edge point on a hovered node.
    const PORT_SNAP = 28;   // px in canvas space ? radius around each port dot
    const NODE_MARGIN = 12; // extra margin beyond node edge for node-level hover

    let snapNodeId = null;
    let snapPortPos = null;
    let snapOffset = null;
    let bestPortDist = Infinity;

    function getActualPortXY(n, pos) {
      return getPortXYActual(n, pos);
    }

    state.nodes.forEach(n => {
      if (n.id === wireSrcId) return;
      ['n','s','e','w'].forEach(pos => {
        if (epDragActive && n.type === 'boundary') {
          const el = document.getElementById('node-' + n.id);
          const actualH = el ? el.offsetHeight : n.h;
          const EDGE_ONLY_MARGIN = 20;
          const nearBoundaryEdge =
            Math.abs(mx - n.x) <= EDGE_ONLY_MARGIN ||
            Math.abs(mx - (n.x + n.w)) <= EDGE_ONLY_MARGIN ||
            Math.abs(my - n.y) <= EDGE_ONLY_MARGIN ||
            Math.abs(my - (n.y + actualH)) <= EDGE_ONLY_MARGIN;
          if (!nearBoundaryEdge) return;
        }
        const p = getActualPortXY(n, pos);
        const d = Math.sqrt((mx - p.x)**2 + (my - p.y)**2);
        if (d < PORT_SNAP && d < bestPortDist) {
          bestPortDist = d;
          snapNodeId = n.id;
          snapPortPos = pos;
          snapOffset = null;
        }
      });
    });

    if (!snapNodeId) {
      let bestBoxDist = Infinity;
      state.nodes.forEach(n => {
        if (n.id === wireSrcId) return;
        const el = document.getElementById('node-' + n.id);
        const actualH = el ? el.offsetHeight : n.h;
        const inBox = mx >= n.x - NODE_MARGIN && mx <= n.x + n.w + NODE_MARGIN &&
                      my >= n.y - NODE_MARGIN && my <= n.y + actualH + NODE_MARGIN;
        if (!inBox) return;
        if (epDragActive) {
          if (n.type === 'boundary') {
            const EDGE_ONLY_MARGIN = 20;
            const nearBoundaryEdge =
              Math.abs(mx - n.x) <= EDGE_ONLY_MARGIN ||
              Math.abs(mx - (n.x + n.w)) <= EDGE_ONLY_MARGIN ||
              Math.abs(my - n.y) <= EDGE_ONLY_MARGIN ||
              Math.abs(my - (n.y + actualH)) <= EDGE_ONLY_MARGIN;
            if (!nearBoundaryEdge) return;
          }
          const attachment = getNodeEdgeAttachment(n, mx, my, actualH);
          const p = getPortXY(n, attachment.pos, attachment.offset, actualH);
          const d = Math.sqrt((mx - p.x)**2 + (my - p.y)**2);
          if (d < bestBoxDist) {
            bestBoxDist = d;
            snapNodeId = n.id;
            snapPortPos = attachment.pos;
            snapOffset = attachment.offset;
          }
        } else {
          const cx = n.x + n.w / 2, cy = n.y + actualH / 2;
          const d = Math.sqrt((mx-cx)**2 + (my-cy)**2);
          if (d < bestBoxDist) {
            bestBoxDist = d;
            snapNodeId = n.id;
            snapPortPos = null;
            snapOffset = null;
          }
        }
      });
    }

    if (snapNodeId !== wireTargetId || snapPortPos !== wireTargetPos || snapOffset !== wireTargetOffset) {
      document.querySelectorAll('.node.connect-target').forEach(el => el.classList.remove('connect-target'));
      if (wireTargetId) {
        const oldEl = document.getElementById('node-' + wireTargetId);
        if (oldEl) oldEl.querySelectorAll('.conn-point').forEach(cp => cp.classList.remove('snap-target'));
      }
      wireTargetId = snapNodeId;
      wireTargetPos = snapPortPos;
      wireTargetOffset = snapOffset;
      if (wireTargetId) {
        const el = document.getElementById('node-' + wireTargetId);
        if (el) {
          el.classList.add('connect-target');
          if (wireTargetPos && wireTargetOffset === null) {
            el.querySelectorAll('.conn-point').forEach(cp => {
              cp.classList.toggle('snap-target', cp.dataset.pos === wireTargetPos);
            });
          }
        }
      }
    }

    updateWirePreview(mx, my);
  }
});

window.addEventListener('mouseup', e => {
  panDragging = false;
  const wasDragging = draggingNode;
  const wasResizing = resizingNode;
  draggingNode = null;
  resizingNode = null;

  if (epDragActive) {
    // Endpoint drag takes priority over normal wire completion
    completeEndpointDrag();
  } else if (wireActive) {
    completeWire();
  } else if (wasDragging || wasResizing) {
    saveToLocalStorage();
  }
});

canvasWrap.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvasWrap.getBoundingClientRect();
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.1 : 0.91;
  zoom(factor, cx, cy);
}, {passive:false});

// ══════════════════════════════════════════════
// SIDEBAR TOGGLES
// ══════════════════════════════════════════════
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  sb.classList.toggle('collapsed');
  if (sb.classList.contains('collapsed')) closeAppearancePanel();
  updateDocumentPanelPosition();
  requestAnimationFrame(() => updateDocumentPanelPosition());
  setTimeout(updateDocumentPanelPosition, 220);
}
function toggleSection(header) {
  header.classList.toggle('open');
  const body = header.nextElementSibling;
  if (body) body.classList.toggle('hidden');
  // Persist state
  try {
    const label = header.textContent.trim().slice(0,20);
    const isOpen = header.classList.contains('open');
    const saved = JSON.parse(localStorage.getItem('sb-sections') || '{}');
    saved[label] = isOpen;
    localStorage.setItem('sb-sections', JSON.stringify(saved));
  } catch(e) {}
}

function restoreSectionState() {
  try {
    const saved = JSON.parse(localStorage.getItem('sb-sections') || '{}');
    document.querySelectorAll('.sb-header').forEach(header => {
      const label = header.textContent.trim().slice(0,20);
      if (label in saved) {
        const shouldBeOpen = saved[label];
        const isOpen = header.classList.contains('open');
        if (isOpen !== shouldBeOpen) {
          header.classList.toggle('open', shouldBeOpen);
          const body = header.nextElementSibling;
          if (body) body.classList.toggle('hidden', !shouldBeOpen);
        }
      }
    });
  } catch(e) {}
}
function setArrowType(t) {
  nextArrowType = t;
  ['directed','bidirectional','undirected'].forEach(x => {
    const el = document.getElementById('atype-'+x);
    if (el) el.classList.toggle('active', x===t);
  });
}

function updateStatusBar() {
  const nonBoundary = state.nodes.filter(n => n.type !== 'boundary');
  document.getElementById('sb-nodes').textContent = `⬡ ${nonBoundary.length} nodes`;
  document.getElementById('sb-arrows').textContent = `→ ${state.arrows.length} connections`;
  const allFns = nonBoundary.flatMap(n => (n.functions||[]).filter(f => (f.name||'').trim() && !f.hidden));
  document.getElementById('sb-functions').textContent = `⚙ ${allFns.length} functions`;
  const totalIO = allFns.reduce((sum, f) => {
    const ins  = Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : []);
    const outs = Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : []);
    return sum + ins.filter((_,i) => !(f.hiddenInputs||[]).includes(i)).length
               + outs.filter((_,i) => !(f.hiddenOutputs||[]).includes(i)).length;
  }, 0);
  document.getElementById('sb-io').textContent = `⇅ ${totalIO} I/O`;
}

function setStatusModeMessage(text = '', { fade = false, autoClearMs = 0 } = {}) {
  const sb = document.getElementById('sb-mode');
  if (!sb) return;

  clearTimeout(sb._modeTimer);
  clearTimeout(sb._modeClearTimer);

  if (!text) {
    sb.style.opacity = '0';
    sb._modeClearTimer = setTimeout(() => {
      if (sb.style.opacity === '0') sb.textContent = '';
    }, 500);
    return;
  }

  sb.textContent = text;

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

function setIOPillLabel(el, prefix, text) {
  if (!el) return;
  el.textContent = '';
  const prefixSpan = document.createElement('span');
  prefixSpan.className = 'io-pill-prefix';
  prefixSpan.textContent = prefix;
  el.appendChild(prefixSpan);
  el.appendChild(document.createTextNode(text));
}

function autosizeDocumentField(el) {
  if (!el || el.tagName !== 'TEXTAREA') return;
  const styles = getComputedStyle(el);
  const maxH = parseFloat(styles.maxHeight) || Infinity;
  el.style.height = '0px';
  const nextH = Math.min(el.scrollHeight, maxH);
  el.style.height = nextH + 'px';
  el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
}

function updateDocumentPanelFromInputs() {
  const titleInput = document.getElementById('diagram-title-input');
  const subtitleInput = document.getElementById('diagram-subtitle-input');
  const docTitle = document.getElementById('doc-title-input');
  const docSubtitle = document.getElementById('doc-subtitle-input');
  const previewTitle = document.getElementById('document-panel-preview-title');
  const previewSubtitle = document.getElementById('document-panel-preview-subtitle');
  const title = titleInput?.value || 'Untitled document';
  const subtitleRaw = subtitleInput?.value || '';
  const subtitle = subtitleRaw || 'Add a short description or scope';
  if (docTitle && docTitle.value !== title) docTitle.value = title;
  if (docSubtitle && docSubtitle.value !== subtitleRaw) docSubtitle.value = subtitleRaw;
  if (previewTitle) previewTitle.textContent = title;
  if (previewSubtitle) previewSubtitle.textContent = subtitle;
  autosizeDocumentField(docTitle);
  autosizeDocumentField(docSubtitle);
}

function updateDocumentPanelPosition() {
  const panel = document.getElementById('document-panel');
  const sb = document.getElementById('sidebar');
  if (!panel || !sb) return;
  const sidebarWidth = sb.getBoundingClientRect().width;
  const left = sb.classList.contains('collapsed') ? 14 : (Math.round(sidebarWidth) + 14);
  panel.style.left = left + 'px';
}

function toggleDocumentPanel(forceOpen) {
  const panel = document.getElementById('document-panel');
  if (!panel) return;
  const nextOpen = typeof forceOpen === 'boolean' ? forceOpen : !panel.classList.contains('open');
  panel.classList.toggle('open', nextOpen);
  const toggle = document.getElementById('document-panel-toggle');
  if (toggle) toggle.title = nextOpen ? 'Collapse document details' : 'Expand document details';
  if (nextOpen) {
    updateDocumentPanelFromInputs();
    requestAnimationFrame(() => {
      const el = document.getElementById('doc-title-input');
      if (el) el.focus();
    });
  }
}

function openBasicModal({ title = '', body = '', buttons = [] } = {}) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const btnsEl = document.getElementById('modal-btns');
  if (!overlay || !titleEl || !bodyEl || !btnsEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = body;
  btnsEl.innerHTML = '';

  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.className = btn.className || 'tb-btn';
    b.textContent = btn.label || 'OK';
    b.onclick = () => {
      if (btn.closeFirst !== false) closeBasicModal();
      if (typeof btn.onClick === 'function') btn.onClick();
    };
    btnsEl.appendChild(b);
  });

  overlay.classList.add('open');
}

function closeBasicModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
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

function escapeDraftText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDraftTime(iso) {
  if (!iso) return 'Unknown';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Unknown';
  return dt.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getDraftSummary(meta) {
  const payload = getDraftPayload(meta.id) || {};
  const nodeCount = Array.isArray(payload.state?.nodes) ? payload.state.nodes.length : 0;
  const arrowCount = Array.isArray(payload.state?.arrows) ? payload.state.arrows.length : 0;
  return { payload, nodeCount, arrowCount };
}

function suggestDraftName(baseName = '') {
  const clean = draftDisplayName(baseName || document.getElementById('diagram-title-input')?.value || 'Untitled draft');
  const names = new Set(getDraftIndex().drafts.map(d => draftDisplayName(d.name)));
  if (!names.has(clean)) return clean;
  let i = 2;
  while (names.has(`${clean} (${i})`)) i++;
  return `${clean} (${i})`;
}

function isQuotaExceededError(err) {
  if (!err) return false;
  return err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22 || err.code === 1014;
}

function warnDraftStorageFull() {
  setStatusModeMessage('Draft save failed — local storage is full', { fade: true, autoClearMs: 2600 });
  if (_quotaWarningShown) return;
  _quotaWarningShown = true;
  openBasicModal({
    title: 'Draft storage full',
    body: '<div class="draft-modal-note">This browser storage is full, so the latest draft changes could not be saved locally. Delete older drafts or export JSON to keep a safe copy.</div>',
    buttons: [
      { label: 'Open drafts', className: 'tb-btn primary', onClick: openDraftManager },
      { label: 'Close', className: 'tb-btn' }
    ]
  });
}

function renderDraftManagerBody() {
  const host = document.getElementById('draft-manager-body');
  if (!host) return;
  const index = getDraftIndex();
  if (!index.drafts.length) {
    host.innerHTML = '<div class="draft-empty-note">No drafts saved yet.</div>';
    return;
  }
  const softCapNote = index.drafts.length > 12
    ? `<div class="draft-warning-note">You have ${index.drafts.length} local drafts. Consider deleting older ones to avoid storage pressure.</div>`
    : '';
  host.innerHTML = `${softCapNote}<div class="draft-list">${
    index.drafts.map(meta => {
      const summary = getDraftSummary(meta);
      return `<div class="draft-row${meta.id === currentDraftId ? ' active' : ''}">
        <div class="draft-row-main">
          <div class="draft-row-title">
            <span class="draft-row-title-text">${escapeDraftText(draftDisplayName(meta.name))}</span>
            ${meta.id === currentDraftId ? '<span class="draft-active-badge">Active</span>' : ''}
          </div>
          <div class="draft-row-meta">
            Updated ${escapeDraftText(formatDraftTime(meta.updatedAt))}<br>
            ${summary.nodeCount} items · ${summary.arrowCount} connections
          </div>
        </div>
        <div class="draft-row-actions">
          ${meta.id === currentDraftId ? '' : '<button class="tb-btn" onclick="switchToDraft(\'' + meta.id + '\')">Open</button>'}
          <button class="tb-btn" onclick="renameDraftById('${meta.id}')">Rename</button>
          <button class="tb-btn" onclick="duplicateDraftById('${meta.id}')">Duplicate</button>
          <button class="tb-btn danger" onclick="deleteDraftById('${meta.id}')">Delete</button>
        </div>
      </div>`;
    }).join('')
  }</div>`;
}

function openDraftManager() {
  openBasicModal({
    title: 'Drafts',
    body: '<div class="draft-modal-note">Switch between locally saved diagrams, or manage a few in-progress drafts in parallel.</div><div id="draft-manager-body"></div>',
    buttons: [
      { label: 'New draft', className: 'tb-btn primary', onClick: () => { createNewDraft(); }, closeFirst: false },
      { label: 'Close', className: 'tb-btn' }
    ]
  });
  renderDraftManagerBody();
}

function openDraftNameModal({ title, initialValue = '', confirmLabel, onConfirm }) {
  openBasicModal({
    title,
    body: `<div class="draft-modal-note">Choose a draft name.</div><input id="draft-name-input" class="draft-name-input" type="text" value="${escapeDraftText(initialValue)}" placeholder="Draft name">`,
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      {
        label: confirmLabel,
        className: 'tb-btn primary',
        onClick: () => {
          const input = document.getElementById('draft-name-input');
          const value = draftDisplayName(input?.value || initialValue);
          onConfirm(value);
        }
      }
    ]
  });
  requestAnimationFrame(() => {
    const input = document.getElementById('draft-name-input');
    if (input) {
      input.focus();
      input.select();
      input.onkeydown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const btn = document.querySelector('#modal-btns .tb-btn.primary');
          if (btn) btn.click();
        }
      };
    }
  });
}

function createDraftFromPayload(payload, name, { activate = true } = {}) {
  const meta = ensureDraftRecord({
    name: draftDisplayName(name),
    payload,
    activate
  });
  if (activate) {
    applyDiagramPayload(getDraftPayload(meta.id));
    clearHistoryStacks();
    render();
  }
  return meta;
}

function createNewDraft() {
  openDraftNameModal({
    title: 'New draft',
    initialValue: suggestDraftName('Untitled draft'),
    confirmLabel: 'Create draft',
    onConfirm: value => {
      createDraftFromPayload(createBlankDiagramPayload(), value, { activate: true });
      setStatusModeMessage('New draft created', { fade: true, autoClearMs: 1600 });
      saveToLocalStorage();
      renderDraftManagerBody();
    }
  });
}

function switchToDraft(id) {
  closeBasicModal();
  if (loadDraftIntoCanvas(id)) {
    setStatusModeMessage(`Opened ${draftDisplayName(currentDraftName)}`, { fade: true, autoClearMs: 1600 });
  }
}

function renameDraftById(id) {
  const payload = getDraftPayload(id);
  const meta = getDraftIndex().drafts.find(d => d.id === id);
  if (!meta) return;
  openDraftNameModal({
    title: 'Rename draft',
    initialValue: draftDisplayName(meta.name),
    confirmLabel: 'Save name',
    onConfirm: value => {
      const nextName = draftDisplayName(value);
      touchDraftMeta(id, { name: nextName });
      if (payload) {
        payload.name = nextName;
        saveDraftPayload(id, payload);
      }
      if (id === currentDraftId) {
        currentDraftName = nextName;
        updateDraftUI();
      }
      openDraftManager();
    }
  });
}

function renameCurrentDraft() {
  if (!currentDraftId) return;
  renameDraftById(currentDraftId);
}

function duplicateDraftById(id) {
  const payload = getDraftPayload(id);
  const meta = getDraftIndex().drafts.find(d => d.id === id);
  if (!payload || !meta) return;
  const clone = JSON.parse(JSON.stringify(payload));
  clone.name = suggestDraftName(meta.name);
  createDraftFromPayload(clone, clone.name, { activate: true });
  renderDraftManagerBody();
  setStatusModeMessage('Draft duplicated', { fade: true, autoClearMs: 1600 });
}

function duplicateCurrentDraft() {
  if (!currentDraftId) return;
  duplicateDraftById(currentDraftId);
}

function deleteDraftById(id) {
  const index = getDraftIndex();
  const meta = index.drafts.find(d => d.id === id);
  if (!meta) return;
  openBasicModal({
    title: 'Delete draft',
    body: `<div class="draft-modal-note">Delete <b>${escapeDraftText(draftDisplayName(meta.name))}</b> from local drafts? This removes only the local draft copy.</div>`,
    buttons: [
      { label: 'Cancel', className: 'tb-btn' },
      {
        label: 'Delete draft',
        className: 'tb-btn danger',
        onClick: () => {
          const nextIndex = getDraftIndex();
          nextIndex.drafts = nextIndex.drafts.filter(d => d.id !== id);
          saveDraftIndex(sortDrafts(nextIndex));
          localStorage.removeItem(getDraftStorageKey(id));
          if (id === currentDraftId) {
            if (nextIndex.drafts.length) {
              loadDraftIntoCanvas(nextIndex.drafts[0].id);
            } else {
              createDraftFromPayload(createBlankDiagramPayload(), 'Untitled draft', { activate: true });
            }
          } else {
            updateDraftUI();
          }
          setStatusModeMessage('Draft deleted', { fade: true, autoClearMs: 1600 });
        }
      }
    ]
  });
}

function deleteCurrentDraft() {
  if (!currentDraftId) return;
  deleteDraftById(currentDraftId);
}
// ══════════════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════════════
function exportJSON() {
  const data = {
    version: 1,
    title: document.getElementById('diagram-title-input').value,
    subtitle: document.getElementById('diagram-subtitle-input').value,
    state
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'conduit-diagram.json';
  a.click();
}

function importFile() {
  document.getElementById('file-input').click();
}

// Save title/subtitle changes to localStorage
['diagram-title-input', 'diagram-subtitle-input'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    updateDocumentPanelFromInputs();
    saveToLocalStorage();
  });
});

['doc-title-input', 'doc-subtitle-input'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const hiddenTitle = document.getElementById('diagram-title-input');
    const hiddenSubtitle = document.getElementById('diagram-subtitle-input');
    if (id === 'doc-title-input' && hiddenTitle) hiddenTitle.value = el.value;
    if (id === 'doc-subtitle-input' && hiddenSubtitle) hiddenSubtitle.value = el.value;
    updateDocumentPanelFromInputs();
    saveToLocalStorage();
  });
  el.addEventListener('focus', () => requestAnimationFrame(() => autosizeDocumentField(el)));
});
window.addEventListener('resize', updateDocumentPanelPosition);
document.getElementById('sidebar')?.addEventListener('transitionend', e => {
  if (e.propertyName === 'width') updateDocumentPanelPosition();
});

document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.state) {
        const nameFromFile = (file.name || '').replace(/\.[^.]+$/, '') || data.title || 'Imported draft';
        createDraftFromPayload({
          version: 1,
          title: data.title || '',
          subtitle: data.subtitle || '',
          state: data.state
        }, suggestDraftName(nameFromFile), { activate: true });
        saveToLocalStorage();
      }
    } catch(err) { alert('Invalid file: '+err.message); }
  };
  reader.readAsText(file);
  e.target.value='';
});

function buildExportHTML(opts) {
  const title = document.getElementById('diagram-title-input').value;
  const subtitle = document.getElementById('diagram-subtitle-input').value;
  const stateJson = JSON.stringify(state);

  // Capture live CSS variable values so the export is pixel-perfect
  const cs = getComputedStyle(document.documentElement);
  const cssVars = [
    '--bg','--surface','--surface2','--surface3',
    '--border','--border2',
    '--accent','--accent2','--accent3',
    '--text','--text2','--text3',
    '--node-internal','--node-internal-border','--node-internal-edge',
    '--node-external','--node-external-border','--node-external-edge',
    '--arrow-color','--label-bg',
    '--io-input-bg','--io-input-border','--io-input-text',
    '--io-output-bg','--io-output-border','--io-output-text',
    '--shadow','--radius'
  ].map(v => v + ':' + cs.getPropertyValue(v).trim()).join(';');

  // Build static SVG arrows and nodes for the export
  const nodes = state.nodes;
  const arrows = state.arrows;

  // Estimate exported node heights based on what content opts will actually render.
  // We can't use live DOM heights because opts may hide functions/IO, changing the height.
  // Instead we estimate from the node's stored data + opts, then add a generous pad.
  function estimateExportHeight(n) {
    if (n.type === 'boundary') return n.h;
    let h = 14 + 4;
    if (n.tag)      h += 16;
    h += 20;
    if (n.title && n.title.includes('\n')) h += 16 * (n.title.split('\n').length - 1);
    if (n.subtitle) h += 18;
    const fns = (n.functions||[]).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim() && !f.hidden);
    if (fns.length) {
      h += 14 + 8;
      fns.forEach(f => {
        h += 22;
        const hidIn  = f.hiddenInputs  || [];
        const hidOut = f.hiddenOutputs || [];
        const ins  = (Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : [])).filter((_,i) => !hidIn.includes(i));
        const outs = (Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : [])).filter((_,i) => !hidOut.includes(i));
        if (ins.length)  h += 22;
        if (outs.length) h += 22;
      });
    }
    h += 14;
    return Math.max(n.h, h);
  }

  const estimatedHeights = {};
  nodes.forEach(n => { estimatedHeights[n.id] = estimateExportHeight(n); });

  // Compute bounding box from estimated heights
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(n => {
    const h = estimatedHeights[n.id];
    minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
    maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+h);
  });
  const pad = 60;
  minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
  const W = maxX-minX, H = maxY-minY;

  // Build SVG
  function bezierPtE(p0,p1,p2,p3,t){const mt=1-t;return mt*mt*mt*p0+3*mt*mt*t*p1+3*mt*t*t*p2+t*t*t*p3;}
  function getPortXYE(n, pos, offset) {
    const h = estimatedHeights[n.id] || n.h;
    return getPortXY(n, pos, offset, h);
  }


  let svgArrows = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;overflow:visible;pointer-events:none;z-index:2;" width="${W}" height="${H}"><defs id="edefs"></defs>`;

  // Port stagger — mirrors canvas renderArrows logic exactly
  const ePortGroups = {};
  arrows.forEach(a => {
    const fk = a.from + ':' + (a.fromPos||'e');
    const tk = a.to   + ':' + (a.toPos  ||'w');
    if (!ePortGroups[fk]) ePortGroups[fk] = [];
    if (!ePortGroups[tk]) ePortGroups[tk] = [];
    if (getArrowEndOffset(a, 'from') === null) ePortGroups[fk].push(a.id + ':from');
    if (getArrowEndOffset(a, 'to') === null) ePortGroups[tk].push(a.id + ':to');
  });
  const ePortPerp = { n:{x:1,y:0}, s:{x:1,y:0}, e:{x:0,y:1}, w:{x:0,y:1} };
  const E_STAGGER = 8;
  function staggeredPortXYE(node, pos, arrowId, end, manualOffset) {
    if (manualOffset !== null) return getPortXYE(node, pos, manualOffset);
    const base = getPortXYE(node, pos);
    const key  = node.id + ':' + pos;
    const token = arrowId + ':' + end;
    const group = ePortGroups[key] || [];
    if (group.length <= 1) return base;
    const idx    = group.indexOf(token);
    if (idx === -1) return base;
    const total  = group.length;
    const offset = (idx - (total - 1) / 2) * E_STAGGER;
    const perp   = ePortPerp[pos] || {x:1,y:0};
    return { x: base.x + perp.x * offset, y: base.y + perp.y * offset };
  }

  // Build per-arrow marker defs string
  let eDefsHtml = '';
  function makeExportMarker(id, color, forStart) {
    return `<marker id="${id}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="${forStart?'auto-start-reverse':'auto'}"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker>`;
  }
  const exportArrowColor = cs.getPropertyValue('--arrow-color').trim() || '#ff8c42';

  arrows.forEach(a => {
    const fn = nodes.find(x=>x.id===a.from), tn = nodes.find(x=>x.id===a.to);
    if(!fn||!tn) return;
    const color = a.color || exportArrowColor;
    eDefsHtml += makeExportMarker('emf-'+a.id, color, false);
    eDefsHtml += makeExportMarker('emb-'+a.id, color, true);
  });
  svgArrows = svgArrows.replace('<defs id="edefs"></defs>', `<defs>${eDefsHtml}</defs>`);

  arrows.forEach(a => {
    const fn = nodes.find(x=>x.id===a.from), tn = nodes.find(x=>x.id===a.to);
    if(!fn||!tn) return;
    const p1=staggeredPortXYE(fn,a.fromPos||'e',a.id,'from',getArrowEndOffset(a, 'from')),
          p2=staggeredPortXYE(tn,a.toPos||'w',a.id,'to',getArrowEndOffset(a, 'to'));
    const {d:d2, lx:_elx, ly:_ely, cx1, cy1, cx2, cy2} =
      buildArrowPath(p1, p2, a.fromPos||'e', a.toPos||'w', a.bend||0, a.lineStyle||'curved', minX, minY, a.orthoY||0);
    const color = a.color || exportArrowColor;
    let mEnd='', mStart='';
    if(a.direction==='directed'){mEnd=`marker-end="url(#emf-${a.id})"`;}
    else if(a.direction==='bidirectional'){mEnd=`marker-end="url(#emf-${a.id})"`;mStart=`marker-start="url(#emb-${a.id})"`;}
    const dash=a.dash?'stroke-dasharray="6 3"':'';
    svgArrows+=`<path d="${d2}" fill="none" stroke="${color}" stroke-width="1.5" ${mEnd} ${mStart} ${dash}/>`;
    if(a.label){
      const lx=_elx+(a.labelOffsetX||0);
      const ly=_ely+(a.labelOffsetY||0);
      const eLines=a.label.split('\n');
      const eFontSize=11;
      const eLineH=eFontSize+4;
      const eTotalH=eLines.length*eLineH;
      const eMaxW=Math.max(...eLines.map(l=>l.length))*(a.labelBold?7:6.5);
      const eFill=a.labelColor||'#9aa0b8';
      const eFW=a.labelBold?'600':'400';
      const eFS=a.labelItalic?'italic':'normal';
      svgArrows+=`<rect x="${lx-eMaxW/2-5}" y="${ly-eTotalH/2-5}" width="${eMaxW+10}" height="${eTotalH+8}" rx="4" fill="var(--surface)" stroke="var(--border)" stroke-width="1"/>`;
      const tspans=eLines.map((l,i)=>`<tspan x="${lx}" dy="${i===0?0:eLineH}">${l}</tspan>`).join('');
      svgArrows+=`<text x="${lx}" y="${ly-(eLines.length-1)*eLineH/2}" fill="${eFill}" font-size="${eFontSize}" font-weight="${eFW}" font-style="${eFS}" font-family="IBM Plex Sans,sans-serif" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
    }
  });
  svgArrows += '</svg>';

  // Build per-node detail data for the exported panel (always captured regardless of opts)
  const nodeDetailData = {};
  nodes.filter(n => n.type !== 'boundary').forEach(n => {
    const fns = (n.functions||[]).filter(f => {
      const nm = typeof f === 'string' ? f : (f.name || ''); return nm.trim() && !f.hidden;
    });
    const hasFnDetail = fns.some(f => f.description||(f.inputs&&f.inputs.length)||(f.outputs&&f.outputs.length));
    const hasNotes    = n.notes && n.notes.trim();
    if (hasFnDetail || hasNotes) {
      nodeDetailData[n.id] = {
        tag:   n.tag   || '',
        title: n.title.replace(/\n/g,' '),
        type:  n.type,
        notes: n.notes || '',
        functions: fns.map(f => ({
          name:    f.name  || f || '',
          desc:    f.description || '',
          inputs:  Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : []),
          outputs: Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : []),
          owner:   f.owner   || '',
          trigger: f.trigger || '',
          system:  f.system  || '',
        }))
      };
    }
  });
  const nodeDetailJson = JSON.stringify(nodeDetailData).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');

  let nodeHtml = '';
  const sortedN = [...nodes].sort((a,b)=>(a.type==='boundary'?-1:1)-(b.type==='boundary'?-1:1));
  sortedN.forEach(n => {
    const hasDetail = !!nodeDetailData[n.id];
    const op = n.colorOpacity !== undefined ? n.colorOpacity : 51;
    const opHex = op.toString(16).padStart(2,'0');
    const colorStyle = n.color ? `background:${n.color}${opHex};` : '';
    const detailBtn = hasDetail && n.type !== 'boundary'
      ? `<span class="detail-btn">i</span>`
      : '';

    let innerHtml = '';
    if (n.type === 'boundary') {
      innerHtml = `<div class="node-inner">`
        + (n.title ? `<div class="node-title">${n.title}</div>` : '')
        + (n.subtitle ? `<div class="node-boundary-sub" style="${n.subtitleColor ? 'color:'+n.subtitleColor+';' : (n.textColor ? 'color:'+n.textColor+';' : '')}">${n.subtitle}</div>` : '')
        + `</div>`;
    } else {
      // Always render exactly what the canvas shows — visibility controlled in editor
      const tc = n.textColor ? `color:${n.textColor};` : '';
      const inSt = [n.ioInputBg&&`background:${n.ioInputBg}`, n.ioInputBorder&&`border-color:${n.ioInputBorder}`, n.ioInputText&&`color:${n.ioInputText}`].filter(Boolean).join(';');
      const outSt = [n.ioOutputBg&&`background:${n.ioOutputBg}`, n.ioOutputBorder&&`border-color:${n.ioOutputBorder}`, n.ioOutputText&&`color:${n.ioOutputText}`].filter(Boolean).join(';');
      const fnItems = (() => {
        const fns2 = (n.functions||[]).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim() && !f.hidden);
        if (!fns2.length) return '';
        const items = fns2.map(f => {
          const name = typeof f === 'string' ? f : (f.name || '');
          const hidIn  = f.hiddenInputs  || [];
          const hidOut = f.hiddenOutputs || [];
          const ins  = (Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : [])).filter((_,i) => !hidIn.includes(i));
          const outs = (Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : [])).filter((_,i) => !hidOut.includes(i));
          let ioHtml = '';
          if (ins.length)  ioHtml += `<div class="node-io-wrap">${ins.map(v=>`<span class="node-io-pill input" ${inSt?`style="${inSt}"`:''}><span class="io-pill-prefix">IN</span>${v}</span>`).join('')}</div>`;
          if (outs.length) ioHtml += `<div class="node-io-wrap">${outs.map(v=>`<span class="node-io-pill output" ${outSt?`style="${outSt}"`:''}><span class="io-pill-prefix">OUT</span>${v}</span>`).join('')}</div>`;
          return `<div class="node-fn-item" style="${n.fnTextColor ? 'color:'+n.fnTextColor+';' : tc}">${name}</div>${ioHtml}`;
        }).join('');
        return `<div class="node-functions"><div class="node-functions-label" style="${n.fnLabelColor ? 'color:'+n.fnLabelColor+';' : tc}">Functions</div>${items}</div>`;
      })();
      innerHtml = `<div class="node-inner" style="padding-right:${hasDetail?'26px':'14px'};">`
        + (n.tag ? `<div class="node-tag" style="${n.tagColor ? 'color:'+n.tagColor+';' : tc}">${n.tag}</div>` : '')
        + `<div class="node-title" style="${tc}">${n.title}</div>`
        + (n.subtitle ? `<div class="node-subtitle" style="${n.subtitleColor ? 'color:'+n.subtitleColor+';' : tc}">${n.subtitle}</div>` : '')
        + fnItems
        + `</div>`;
    }

    const clickAttr = (n.type !== 'boundary' && hasDetail) ? `onclick="openDetail('${n.id}')" style="position:absolute;left:${n.x-minX}px;top:${n.y-minY}px;width:${n.w}px;min-height:${n.h}px;${colorStyle}cursor:pointer;"` : `style="position:absolute;left:${n.x-minX}px;top:${n.y-minY}px;width:${n.w}px;min-height:${n.h}px;${colorStyle}"`;
    nodeHtml += `<div class="node ${n.type}" ${clickAttr}>${innerHtml}${detailBtn}</div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
:root{${cssVars}}
body{background:var(--bg);font-family:'Inter',sans-serif;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;}
/* ── Header bar ── */
#export-header{flex-shrink:0;height:44px;padding:0 14px;background:var(--surface);border-bottom:1px solid var(--border);border-top:2px solid var(--accent);display:flex;align-items:center;gap:12px;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.06);}
#export-header h1{font-size:13px;font-weight:600;color:var(--text);letter-spacing:-0.02em;}
#export-header p{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text3);margin-left:4px;}
/* ── Canvas viewport ── */
#viewport{flex:1;overflow:hidden;position:relative;cursor:grab;}
#viewport.panning{cursor:grabbing;}
#canvas-root{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;}
.diagram{position:relative;width:${W}px;height:${H}px;}
/* ── Grid ── */
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px;opacity:0.22;pointer-events:none;z-index:0;}
/* ── Nodes — exact replica of builder CSS ── */
.node{position:absolute;border-radius:var(--radius);cursor:default;min-width:120px;z-index:3;}
.node.internal{background:var(--node-internal);border:1px solid var(--node-internal-edge);border-left:3px solid var(--node-internal-border);box-shadow:var(--shadow);}
.node.external{background:var(--node-external);border:1px solid var(--node-external-edge);border-left:3px dashed var(--node-external-border);box-shadow:var(--shadow);}
.node.boundary{background:transparent;border:1px dashed #cccccc;box-shadow:none;z-index:1;}
.node-inner{padding:12px 14px;}
.node.boundary .node-inner{padding:10px 14px;}
.node-tag{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:5px;}
.node-title{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px;line-height:1.35;letter-spacing:-0.02em;white-space:pre-line;}
.node.boundary .node-title{font-size:11px;color:var(--text3);font-weight:600;font-family:'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;white-space:pre-line;}
.node-subtitle{font-family:'Inter',sans-serif;font-size:10px;color:var(--text2);line-height:1.45;font-weight:400;white-space:pre-line;}
.node-boundary-sub{font-size:10px;color:var(--text3);font-weight:400;font-family:'IBM Plex Sans',sans-serif;margin-top:2px;opacity:0.8;}
.node-functions{margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:7px;}
.node-functions-label{font-family:'IBM Plex Mono',monospace;font-size:7.5px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:5px;opacity:0.7;}
.node-fn-item{display:flex;align-items:center;gap:6px;padding:1.5px 0;font-family:'Inter',sans-serif;font-size:10px;color:var(--text2);line-height:1.4;}
.node-fn-item::before{content:'';width:3px;height:3px;border-radius:50%;background:var(--accent3);flex-shrink:0;opacity:0.6;}
.node.external .node-fn-item::before{background:var(--accent2);}
.node-io-wrap{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;margin-bottom:1px;}
.node-io-pill{padding:1px 6px;border-radius:10px;font-size:8.5px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.02em;}
.io-pill-prefix{font-family:'IBM Plex Mono',monospace;font-size:0.95em;font-weight:600;letter-spacing:0.08em;margin-right:0.45em;}
.node-io-pill.input{background:var(--io-input-bg);border:1px solid var(--io-input-border);color:var(--io-input-text);}
.node-io-pill.output{background:var(--io-output-bg);border:1px solid var(--io-output-border);color:var(--io-output-text);}
/* ── Detail trigger button ── */
.detail-btn{position:absolute;top:7px;right:8px;width:10px;height:10px;border-radius:50%;background:transparent;border:1px solid var(--accent3);color:var(--accent3);font-size:7px;font-style:italic;font-family:Georgia,serif;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;opacity:0.75;transition:opacity 0.15s;pointer-events:none;}
.node:hover .detail-btn{opacity:1;}
/* ── Zoom controls ── */
#zoom-hud{position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:4px;z-index:20;}
.zoom-hud-btn{width:28px;height:28px;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.12s;font-family:'IBM Plex Mono',monospace;}
.zoom-hud-btn:hover{border-color:var(--border2);color:var(--text);background:var(--surface2);}
#zoom-label{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text3);text-align:center;padding:3px 0;}
/* ── Legend ── */
#legend-wrap{position:fixed;bottom:16px;left:16px;z-index:20;}
.legend{display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;background:var(--surface);backdrop-filter:blur(8px);border:1px solid var(--border);border-radius:7px;}
.legend-item{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text2);font-family:'IBM Plex Mono',monospace;}
.legend-box{width:18px;height:12px;border-radius:2px;}
.legend-line{width:24px;height:2px;}
/* ── Help tip ── */
#help-hud{position:fixed;top:60px;left:16px;background:var(--surface);border:1px solid var(--border);backdrop-filter:blur(8px);border-radius:6px;padding:7px 11px;font-size:9.5px;color:var(--text3);z-index:20;line-height:1.75;font-family:'IBM Plex Mono',monospace;}
#help-hud b{color:var(--text2);font-weight:500;}
/* ── Detail panel ── */
#detail-overlay{position:fixed;inset:0;background:#00000060;z-index:1000;display:none;backdrop-filter:blur(2px);}
#detail-overlay.open{display:block;}
#detail-panel{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:96vw;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;z-index:1001;transform:translateX(100%);transition:transform 0.22s cubic-bezier(0.16,1,0.3,1);box-shadow:-12px 0 40px #00000080;}
#detail-panel.open{transform:translateX(0);}
#dp-header{padding:18px 18px 14px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:flex-start;gap:10px;}
#dp-header-text{flex:1;}
#dp-tag{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:4px;}
#dp-title{font-size:15px;font-weight:600;color:var(--text);line-height:1.3;}
#dp-close{width:26px;height:26px;border-radius:5px;background:transparent;border:1px solid transparent;color:var(--text3);cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
#dp-close:hover{background:var(--surface2);border-color:var(--border);color:var(--text);}
#dp-body{flex:1;overflow-y:auto;padding:16px 18px;}
.dp-section{margin-bottom:20px;}
.dp-section-label{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;}
.dp-notes{font-size:12px;color:var(--text2);line-height:1.65;white-space:pre-wrap;}
.dp-fn{border:1px solid var(--border);border-radius:7px;margin-bottom:8px;overflow:hidden;}
.dp-fn-header{padding:9px 12px;background:var(--surface2);cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;}
.dp-fn-header:hover{background:var(--surface3);}
.dp-fn-name{font-size:12px;font-weight:500;color:var(--text);flex:1;}
.dp-fn-chevron{font-size:10px;color:var(--text3);transition:transform 0.15s;flex-shrink:0;}
.dp-fn.open .dp-fn-chevron{transform:rotate(180deg);}
.dp-fn-body{display:none;padding:10px 12px;border-top:1px solid var(--border);}
.dp-fn.open .dp-fn-body{display:block;}
.dp-fn-desc{font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:8px;}
.dp-io-row{display:flex;gap:8px;margin-bottom:6px;}
.dp-io-label{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text3);width:52px;flex-shrink:0;padding-top:2px;}
.dp-pills{display:flex;flex-wrap:wrap;gap:4px;}
.dp-pill-in{padding:2px 8px;border-radius:10px;font-size:10px;background:var(--io-input-bg);border:1px solid var(--io-input-border);color:var(--io-input-text);}
.dp-pill-out{padding:2px 8px;border-radius:10px;font-size:10px;background:var(--io-output-bg);border:1px solid var(--io-output-border);color:var(--io-output-text);}
.dp-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.dp-meta-chip{padding:2px 8px;border-radius:4px;font-size:10px;background:var(--surface3);color:var(--text3);font-family:'IBM Plex Mono',monospace;}
.dp-empty{font-size:11px;color:var(--text3);font-style:italic;}
</style>
</head>
<body>
${opts.showGrid ? '<div class="grid-bg"></div>' : ''}
<div id="detail-overlay" onclick="closeDetail()"></div>
<div id="detail-panel">
  <div id="dp-header">
    <div id="dp-header-text">
      <div id="dp-tag"></div>
      <div id="dp-title"></div>
    </div>
    <button id="dp-close" onclick="closeDetail()">×</button>
  </div>
  <div id="dp-body"></div>
</div>
<div id="export-header">
  <div>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
</div>
<div id="viewport">
  <div id="canvas-root">
    <div class="diagram">
      ${nodeHtml}
      ${svgArrows}
    </div>
  </div>
</div>
<div id="zoom-hud">
  <button class="zoom-hud-btn" onclick="zoomBy(1.2)" title="Zoom in">+</button>
  <div id="zoom-label">100%</div>
  <button class="zoom-hud-btn" onclick="zoomBy(1/1.2)" title="Zoom out">−</button>
  <button class="zoom-hud-btn" onclick="resetView()" title="Fit to screen" style="font-size:11px;">⊡</button>
</div>
<div id="help-hud"><b>Scroll</b> to zoom · <b>Drag</b> to pan · <b>Click</b> node for detail</div>
  ${opts.showLegend ? `<div id="legend-wrap"><div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:var(--node-internal);border-left:3px solid var(--node-internal-border);border-top:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);"></div>Internal system</div>
    <div class="legend-item"><div class="legend-box" style="background:var(--node-external);border-left:3px dashed var(--node-external-border);border-top:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);"></div>External boundary</div>
    <div class="legend-item"><div class="legend-box" style="background:transparent;border:1.5px dashed var(--border2);"></div>Label / boundary</div>
    <div class="legend-item"><div class="legend-line" style="background:var(--accent);border-radius:1px;"></div>Connection</div>
    <div class="legend-item"><svg width="28" height="4" style="flex-shrink:0"><line x1="0" y1="2" x2="28" y2="2" stroke="var(--accent2)" stroke-width="2" stroke-dasharray="4 3"/></svg>Dashed connection</div>
  </div>` : ''}
<footer style="position:fixed;bottom:4px;right:16px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:#2a2f3e;z-index:5;">Conduit v1.2 · ${new Date().toLocaleDateString()}</footer>
</div>
<scr\u0069pt>
const _nodeData = ${nodeDetailJson};
function openDetail(id) {
  const d = _nodeData[id]; if (!d) return;
  document.getElementById('dp-tag').textContent   = d.tag || '';
  document.getElementById('dp-title').textContent = d.title || '';
  const body = document.getElementById('dp-body');
  body.innerHTML = '';
  // Notes section
  if (d.notes && d.notes.trim()) {
    const sec = document.createElement('div'); sec.className = 'dp-section';
    const lbl = document.createElement('div'); lbl.className = 'dp-section-label'; lbl.textContent = 'Notes';
    const txt = document.createElement('div'); txt.className = 'dp-notes'; txt.textContent = d.notes.trim();
    sec.appendChild(lbl); sec.appendChild(txt); body.appendChild(sec);
  }
  // Functions section
  const fns = (d.functions||[]).filter(f => f.desc || (f.inputs&&f.inputs.length) || (f.outputs&&f.outputs.length) || f.owner || f.trigger || f.system);
  if (fns.length) {
    const sec = document.createElement('div'); sec.className = 'dp-section';
    const lbl = document.createElement('div'); lbl.className = 'dp-section-label'; lbl.textContent = 'Functions';
    sec.appendChild(lbl);
    fns.forEach((f, i) => {
      const card = document.createElement('div'); card.className = 'dp-fn';
      const hdr  = document.createElement('div'); hdr.className  = 'dp-fn-header';
      const nm   = document.createElement('div'); nm.className   = 'dp-fn-name'; nm.textContent = f.name || 'Untitled';
      const chv  = document.createElement('div'); chv.className  = 'dp-fn-chevron'; chv.textContent = '▾';
      hdr.appendChild(nm); hdr.appendChild(chv);
      hdr.onclick = () => { card.classList.toggle('open'); };
      const bdy  = document.createElement('div'); bdy.className  = 'dp-fn-body';
      if (f.desc) {
        const p = document.createElement('div'); p.className = 'dp-fn-desc'; p.textContent = f.desc; bdy.appendChild(p);
      }
      if (f.inputs && f.inputs.length) {
        const row = document.createElement('div'); row.className = 'dp-io-row';
        const lbr = document.createElement('div'); lbr.className = 'dp-io-label'; lbr.textContent = 'Inputs';
        const pills = document.createElement('div'); pills.className = 'dp-pills';
f.inputs.forEach(v => { const s = document.createElement('span'); s.className='dp-pill-in'; s.innerHTML='<span class="io-pill-prefix">IN</span>'+escapeHtml(v); pills.appendChild(s); });
        row.appendChild(lbr); row.appendChild(pills); bdy.appendChild(row);
      }
      if (f.outputs && f.outputs.length) {
        const row = document.createElement('div'); row.className = 'dp-io-row';
        const lbr = document.createElement('div'); lbr.className = 'dp-io-label'; lbr.textContent = 'Outputs';
        const pills = document.createElement('div'); pills.className = 'dp-pills';
f.outputs.forEach(v => { const s = document.createElement('span'); s.className='dp-pill-out'; s.innerHTML='<span class="io-pill-prefix">OUT</span>'+escapeHtml(v); pills.appendChild(s); });
        row.appendChild(lbr); row.appendChild(pills); bdy.appendChild(row);
      }
      const metaItems = [f.owner&&('Owner: '+f.owner), f.trigger&&('Trigger: '+f.trigger), f.system&&('System: '+f.system)].filter(Boolean);
      if (metaItems.length) {
        const meta = document.createElement('div'); meta.className = 'dp-meta';
        metaItems.forEach(m => { const c = document.createElement('span'); c.className='dp-meta-chip'; c.textContent=m; meta.appendChild(c); });
        bdy.appendChild(meta);
      }
      card.appendChild(hdr); card.appendChild(bdy); sec.appendChild(card);
      if (i === 0) card.classList.add('open'); // first one open by default
    });
    body.appendChild(sec);
  }
  if (!body.children.length) {
    body.innerHTML = '<div class="dp-empty">No additional detail available.</div>';
  }
  document.getElementById('detail-overlay').classList.add('open');
  document.getElementById('detail-panel').classList.add('open');
}
function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
  document.getElementById('detail-panel').classList.remove('open');
}
document.addEventListener('keydown', e => { if (e.key==='Escape') closeDetail(); });

// ── Pan / Zoom ──
const _vp = document.getElementById('viewport');
const _cr = document.getElementById('canvas-root');
const _dW = ${W}, _dH = ${H};
let _sc = 1, _px = 0, _py = 0;

function _applyT() {
  _cr.style.transform = 'translate(' + _px + 'px,' + _py + 'px) scale(' + _sc + ')';
  const lbl = document.getElementById('zoom-label');
  if (lbl) lbl.textContent = Math.round(_sc * 100) + '%';
}
function zoomBy(factor, cx, cy) {
  cx = (cx !== undefined ? cx : _vp.clientWidth / 2);
  cy = (cy !== undefined ? cy : _vp.clientHeight / 2);
  const ns = Math.min(4, Math.max(0.1, _sc * factor));
  _px = cx - (cx - _px) * (ns / _sc);
  _py = cy - (cy - _py) * (ns / _sc);
  _sc = ns;
  _applyT();
}
function resetView() {
  const vw = _vp.clientWidth, vh = _vp.clientHeight, pad = 60;
  _sc = Math.min(1, (vw - pad * 2) / _dW, (vh - pad * 2) / _dH);
  _px = (vw - _dW * _sc) / 2;
  _py = (vh - _dH * _sc) / 2;
  _applyT();
}
_vp.addEventListener('wheel', e => {
  e.preventDefault();
  const r = _vp.getBoundingClientRect();
  zoomBy(e.deltaY < 0 ? 1.1 : 0.91, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
let _mp = false, _ms = {x:0,y:0}, _mps = {x:0,y:0}, _mMoved = false;
function _startPan(e) {
  _mp = true; _mMoved = false;
  _ms = {x:e.clientX, y:e.clientY}; _mps = {x:_px, y:_py};
  _vp.classList.add('panning');
}
_vp.addEventListener('mousedown', e => {
  if (e.button === 1) { e.preventDefault(); _startPan(e); }
  else if (e.button === 0) { _startPan(e); }
});
window.addEventListener('mousemove', e => {
  if (!_mp) return;
  const dx = e.clientX - _ms.x, dy = e.clientY - _ms.y;
  if (!_mMoved && Math.sqrt(dx*dx+dy*dy) > 4) _mMoved = true;
  if (!_mMoved) return;
  _px = _mps.x + dx; _py = _mps.y + dy;
  _applyT();
});
window.addEventListener('mouseup', e => {
  if (!_mp) return;
  _mp = false; _vp.classList.remove('panning');
  // If the mouse barely moved, it was a click — let it propagate to nodes
  // If it moved, prevent any click from firing on node children
  if (_mMoved) { e.stopPropagation(); }
});
// Suppress click-on-node when drag just ended
_vp.addEventListener('click', e => { if (_mMoved) { e.stopPropagation(); _mMoved = false; } }, true);
window.addEventListener('load', resetView);
<\/script>
</body>
</html>`;

  return { html, title, diagramW: W, diagramH: H };
}

function exportHTML() {
  openExportModal();
}

// Undo for drag/resize is pushed in startDrag/startResize (before the action).


// ══════════════════════════════════════════════
// NODE DETAIL MODAL
// ══════════════════════════════════════════════
let activeNodeModalId = null;
let nmSaveTimer = null;

function openNodeModal(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  activeNodeModalId = nodeId;
  if (!n.functions) n.functions = [];
  if (!n.notes) n.notes = '';
  // Ensure each function has io metadata
  n.functions = n.functions.map(f => {
    if (typeof f === 'string') f = { name: f, inputs: [], outputs: [], description: '' };
    if (!Array.isArray(f.inputs))  f.inputs  = f.inputs  ? [f.inputs]  : [];
    if (!Array.isArray(f.outputs)) f.outputs = f.outputs ? [f.outputs] : [];
    if (f.hidden === undefined) f.hidden = false;
    return f;
  });

  // Header
  const badge = document.getElementById('nm-type-badge');
  badge.className = 'nm-type-badge ' + n.type;
  badge.textContent = n.type === 'external' ? 'EXT' : 'INT';
  badge.style.cssText = n.type === 'internal'
    ? 'background:var(--node-internal);border-left:3px solid var(--node-internal-border);border:1px solid var(--border);color:var(--accent3);'
    : 'background:var(--node-external);border-left:3px dashed var(--node-external-border);border:1px solid var(--border);color:var(--accent2);';
  // Populate editable header inputs
  const nmTagInput      = document.getElementById('nm-tag-input');
  const nmTitleInput    = document.getElementById('nm-title-input');
  const nmSubtitleInput = document.getElementById('nm-subtitle-input');

  nmTagInput.value      = n.tag      || '';
  nmTitleInput.value    = n.title    || '';
  nmSubtitleInput.value = n.subtitle || '';

  function autosizeNMHeaderField(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    const styles = getComputedStyle(el);
    const maxH = parseFloat(styles.maxHeight) || Infinity;
    el.style.height = '0px';
    const nextH = Math.min(el.scrollHeight, maxH);
    el.style.height = nextH + 'px';
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }
  autosizeNMHeaderField(nmTitleInput);
  autosizeNMHeaderField(nmSubtitleInput);
  requestAnimationFrame(() => {
    autosizeNMHeaderField(nmTitleInput);
    autosizeNMHeaderField(nmSubtitleInput);
  });

  // Wire inputs directly — read from the live DOM elements that the user types into
  function nmFieldSave() {
    const tagEl   = document.getElementById('nm-tag-input');
    const titleEl = document.getElementById('nm-title-input');
    const subEl   = document.getElementById('nm-subtitle-input');
    pushUndoDebounced();
    n.tag      = (tagEl   ? tagEl.value.trim().toUpperCase()   : n.tag);
    n.title    = (titleEl ? titleEl.value                       : n.title);
    n.subtitle = (subEl   ? subEl.value                         : n.subtitle);
    if (tagEl) tagEl.value = n.tag; // reflect uppercase normalisation
    autosizeNMHeaderField(titleEl);
    autosizeNMHeaderField(subEl);
    renderNodes();
    renderArrows();
    renderSidebar();
    triggerNMSaved();
    saveToLocalStorage();
  }
  // Assign oninput directly — overwrites any previous handler from a prior open()
  nmTagInput.oninput = nmFieldSave;
  nmTitleInput.oninput = () => {
    nmFieldSave();
    requestAnimationFrame(() => autosizeNMHeaderField(nmTitleInput));
  };
  nmSubtitleInput.oninput = () => {
    nmFieldSave();
    requestAnimationFrame(() => autosizeNMHeaderField(nmSubtitleInput));
  };
  nmTitleInput.onfocus = () => requestAnimationFrame(() => autosizeNMHeaderField(nmTitleInput));
  nmSubtitleInput.onfocus = () => requestAnimationFrame(() => autosizeNMHeaderField(nmSubtitleInput));
  // Prevent Enter on the single-line tag field
  nmTagInput.onkeydown = e => { if (e.key === 'Enter') e.preventDefault(); };

  // Notes
  const notesArea = document.getElementById('nm-notes-area');
  notesArea.value = n.notes || '';
  notesArea.oninput = () => {
    pushUndoDebounced();
    n.notes = notesArea.value;
    triggerNMSaved();
    saveToLocalStorage();
  };

  // Reset to overview tab
  switchNMTab('overview');

  const _el_node_modal_overlay_add = document.getElementById('node-modal-overlay'); if (_el_node_modal_overlay_add) _el_node_modal_overlay_add.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNodeModal() {
  const _el_node_modal_overlay_remove = document.getElementById('node-modal-overlay'); if (_el_node_modal_overlay_remove) _el_node_modal_overlay_remove.classList.remove('open');
  document.body.style.overflow = '';
  activeNodeModalId = null;
  // Re-render node in case functions were renamed
  renderNodes();
  renderArrows();
}

function switchNMTab(tab) {
  document.querySelectorAll('.nm-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.nm-tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('nm-panel-' + tab);
  if (panel) {
    panel.classList.add('active');
    buildNMPanel(tab, panel);
  }
}

function buildNMPanel(tab, panel) {
  const n = state.nodes.find(x => x.id === activeNodeModalId);
  if (!n) return;

  if (tab === 'overview') {
    buildNMOverview(n, panel);
  } else if (tab === 'connections') {
    buildNMConnections(n, panel);
  } else if (tab === 'functions') {
    buildNMFunctions(n, panel);
  }
  // notes panel is static HTML
}

function buildNMOverview(n, panel) {
  const arrows = state.arrows;
  const outgoing = arrows.filter(a => a.from === n.id);
  const incoming = arrows.filter(a => a.to === n.id);
  const bidir = arrows.filter(a => a.direction === 'bidirectional' && (a.from === n.id || a.to === n.id));
  const fnCount = (n.functions || []).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim()).length;

  panel.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'nm-overview-grid';
  grid.innerHTML = `
    <div class="nm-stat-card">
      <div class="nm-stat-label">CONNECTIONS</div>
      <div class="nm-stat-value">${outgoing.length + incoming.length}</div>
      <div class="nm-stat-sub">${outgoing.length} out · ${incoming.length} in</div>
    </div>
    <div class="nm-stat-card">
      <div class="nm-stat-label">FUNCTIONS</div>
      <div class="nm-stat-value">${fnCount}</div>
      <div class="nm-stat-sub">${fnCount ? 'defined' : 'none yet'}</div>
    </div>
    <div class="nm-stat-card">
      <div class="nm-stat-label">NODE TYPE</div>
      <div class="nm-stat-value" style="font-size:14px;margin-top:4px;">
        <span class="nm-badge ${n.type}">${n.type.charAt(0).toUpperCase()+n.type.slice(1)}</span>
      </div>
      <div class="nm-stat-sub">${n.tag || 'no tag'}</div>
    </div>
    <div class="nm-stat-card">
      <div class="nm-stat-label">NOTES</div>
      <div class="nm-stat-value" style="font-size:13px;font-weight:400;color:var(--text2);margin-top:4px;">${(n.notes||'').length ? (n.notes||'').slice(0,60)+'…' : '—'}</div>
    </div>
  `;
  panel.appendChild(grid);

  // Quick connections summary
  if (outgoing.length + incoming.length > 0) {
    const connHead = document.createElement('div');
    connHead.className = 'nm-fn-field-label';
    connHead.style.marginBottom = '8px';
    connHead.textContent = 'Quick connection map';
    panel.appendChild(connHead);

    const allConn = [
      ...outgoing.map(a => ({ arrow: a, dir: 'out', otherId: a.to })),
      ...incoming.filter(a => a.direction !== 'bidirectional' || !outgoing.find(o => o.id===a.id)).map(a => ({ arrow: a, dir: a.direction==='bidirectional'?'both':'in', otherId: a.from }))
    ];
    // deduplicate bidirectional
    const seen = new Set();
    const deduped = [];
    allConn.forEach(c => {
      const key = c.arrow.id;
      if (!seen.has(key)) { seen.add(key); deduped.push(c); }
    });

    deduped.forEach(({ arrow, dir, otherId }) => {
      const other = state.nodes.find(x => x.id === otherId);
      if (!other) return;
      const item = document.createElement('div');
      item.className = 'nm-quick-conn-item';
      const dirEmoji = dir === 'out' ? '→' : dir === 'in' ? '←' : '↔';
      item.innerHTML = `<span style="color:var(--text3);font-family:'IBM Plex Mono',monospace;">${dirEmoji}</span>
        <span class="nm-badge ${other.type}">${other.tag||other.type.toUpperCase()}</span>
        <span>${other.title.replace(/\n/g,' ')}</span>
        ${arrow.label ? `<span style="color:var(--text3);font-size:10px;font-family:'IBM Plex Mono',monospace;">· ${arrow.label}</span>` : ''}`;
      panel.appendChild(item);
    });
  }
}

function buildNMConnections(n, panel) {
  panel.innerHTML = '';
  const arrows = state.arrows;
  const outgoing = arrows.filter(a => a.from === n.id && a.direction === 'directed');
  const incoming = arrows.filter(a => a.to === n.id && a.direction === 'directed');
  const bidir = arrows.filter(a => a.direction === 'bidirectional' && (a.from === n.id || a.to === n.id));

  function connGroup(label, list, dirClass, dirText, getOtherId) {
    if (!list.length) return;
    const g = document.createElement('div');
    g.className = 'nm-conn-group';
    const gl = document.createElement('div');
    gl.className = 'nm-conn-group-label';
    gl.textContent = label;
    g.appendChild(gl);
    list.forEach(a => {
      const otherId = getOtherId(a);
      const other = state.nodes.find(x => x.id === otherId);
      if (!other) return;
      const item = document.createElement('div');
      item.className = 'nm-conn-item';
      const arrow = document.createElement('span');
      arrow.className = 'nm-conn-arrow';
      arrow.textContent = dirClass === 'both' ? '↔' : dirClass === 'out' ? '→' : '←';
      arrow.style.color = dirClass==='out'?'var(--accent)':dirClass==='in'?'var(--accent2)':'var(--accent3)';
      const info = document.createElement('div');
      info.className = 'nm-conn-info';
      info.innerHTML = `<div class="nm-conn-node">${other.title.replace(/\n/g,' ')} ${other.tag ? '<span style="color:var(--text3);font-size:10px;">('+other.tag+')</span>':''}</div>
        ${a.label ? '<div class="nm-conn-label">'+a.label+'</div>' : ''}`;
      const badge = document.createElement('span');
      badge.className = 'nm-conn-dir-badge ' + dirClass;
      badge.textContent = dirText;
      item.appendChild(arrow);
      item.appendChild(info);
      item.appendChild(badge);
      item.addEventListener('click', () => {
        closeNodeModal();
        selectNode(other.id);
      });
      item.style.cursor = 'pointer';
      item.title = 'Click to select ' + other.title.replace(/\n/g,' ');
      g.appendChild(item);
    });
    panel.appendChild(g);
  }

  connGroup('Outgoing (this → other)', outgoing, 'out', 'OUTPUT', a => a.to);
  connGroup('Incoming (other → this)', incoming, 'in', 'INPUT', a => a.from);
  connGroup('Bidirectional', bidir, 'both', 'BOTH', a => a.from === n.id ? a.to : a.from);

  if (outgoing.length + incoming.length + bidir.length > 0) {
    const addConnBtn2 = document.createElement('button');
    addConnBtn2.className = 'nm-fn-add-btn';
    addConnBtn2.style.marginTop = '8px';
    addConnBtn2.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Add connection from this node';
    addConnBtn2.addEventListener('click', () => openConnectFromNode(n.id));
    panel.appendChild(addConnBtn2);
  }

  if (!outgoing.length && !incoming.length && !bidir.length) {
    const noConnWrap = document.createElement('div');
    noConnWrap.innerHTML = '<div class="nm-empty" style="margin-bottom:12px;">No connections yet.</div>';
    panel.appendChild(noConnWrap);
    const addConnBtn = document.createElement('button');
    addConnBtn.className = 'nm-fn-add-btn';
    addConnBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Add connection from this node';
    addConnBtn.addEventListener('click', () => openConnectFromNode(n.id));
    panel.appendChild(addConnBtn);
  }
}

function buildNMFunctions(n, panel) {
  panel.innerHTML = '';
  if (!n.functions) n.functions = [];

  // Normalise all functions to objects with arrays
  n.functions = n.functions.map(f => {
    if (typeof f === 'string') f = { name: f, inputs: [], outputs: [], description: '' };
    if (!Array.isArray(f.inputs))  f.inputs  = f.inputs  ? [f.inputs]  : [];
    if (!Array.isArray(f.outputs)) f.outputs = f.outputs ? [f.outputs] : [];
    if (f.hidden === undefined) f.hidden = false;
    return f;
  });

  function renderCards() {
    panel.innerHTML = '';

    if (n.functions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'nm-fn-none';
      empty.textContent = 'No functions defined yet.';
      panel.appendChild(empty);
    }

    n.functions.forEach((fn, i) => {
      const card = document.createElement('div');
      card.className = 'nm-fn-card';

      // ── Card header ──
      const header = document.createElement('div');
      header.className = 'nm-fn-card-header';

      const dot = document.createElement('div');
      dot.className = 'nm-fn-card-dot' + (fn.hidden ? ' hidden-dot' : '');
      if (!fn.hidden && n.type === 'external') dot.style.background = 'var(--accent2)';

      const nameEl = document.createElement('div');
      nameEl.className = 'nm-fn-card-name' + (fn.hidden ? ' hidden-name' : '');
      nameEl.textContent = (fn.name || '').trim() || 'Untitled function';

      header.appendChild(dot);
      header.appendChild(nameEl);

      if (fn.hidden) {
        const hpill = document.createElement('span');
        hpill.className = 'nm-fn-hidden-pill';
        hpill.textContent = 'hidden';
        header.appendChild(hpill);
      }

      // Edit button — opens fn editor modal at this function
      const editBtn = document.createElement('button');
      editBtn.className = 'nm-fn-edit-btn';
      editBtn.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10" fill="none">' +
        '<path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
        '</svg> Edit';
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        // Close node modal, open fn modal at this function index
        closeNodeModal();
        openFnModal(n.id);
        // Wait a tick for modal to render, then select the right function
        setTimeout(() => selectFn(i), 30);
      });
      header.appendChild(editBtn);
      card.appendChild(header);

      // ── Card body: IO + description + metadata ──
      const hasInputs  = fn.inputs.length > 0;
      const hasOutputs = fn.outputs.length > 0;
      const hasDesc    = (fn.description || '').trim();
      const hasMeta    = (fn.owner || fn.trigger || fn.system);

      if (hasInputs || hasOutputs || hasDesc || hasMeta) {
        const body = document.createElement('div');
        body.className = 'nm-fn-card-body';

        // IO columns
        if (hasInputs || hasOutputs) {
          const ioRow = document.createElement('div');
          ioRow.className = 'nm-fn-io-row';

          ['inputs', 'outputs'].forEach(key => {
            const col = document.createElement('div');
            col.className = 'nm-fn-io-col';
            const lbl = document.createElement('div');
            lbl.className = 'nm-fn-io-label ' + (key === 'inputs' ? 'in' : 'out');
            lbl.innerHTML = (key === 'inputs'
              ? '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4h6M4.5 1.5L7 4l-2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Inputs'
              : '<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M7 4H1M3.5 1.5L1 4l2.5 2.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg> Outputs');
            col.appendChild(lbl);
            const arr = fn[key];
            if (arr.length === 0) {
              const none = document.createElement('div');
              none.className = 'nm-fn-io-none';
              none.textContent = '—';
              col.appendChild(none);
            } else {
              const pillWrap = document.createElement('div');
              pillWrap.className = 'nm-fn-pills';
              arr.forEach(v => {
                const p = document.createElement('span');
                p.className = 'nm-fn-pill ' + (key === 'inputs' ? 'in' : 'out');
                setIOPillLabel(p, key === 'inputs' ? 'IN' : 'OUT', v);
                pillWrap.appendChild(p);
              });
              col.appendChild(pillWrap);
            }
            ioRow.appendChild(col);
          });

          body.appendChild(ioRow);
        }

        // Description
        if (hasDesc) {
          const desc = document.createElement('div');
          desc.className = 'nm-fn-desc';
          desc.textContent = fn.description;
          body.appendChild(desc);
        }

        // Metadata chips
        if (hasMeta) {
          const metaRow = document.createElement('div');
          metaRow.className = 'nm-fn-meta-row';
          const metaItems = [
            { label: 'Owner', val: fn.owner },
            { label: 'Trigger', val: fn.trigger },
            { label: 'System', val: fn.system },
          ];
          metaItems.forEach(({ label, val }) => {
            if (!val) return;
            const chip = document.createElement('div');
            chip.className = 'nm-fn-meta-chip';
            chip.innerHTML = label + ': <b>' + val + '</b>';
            metaRow.appendChild(chip);
          });
          if (metaRow.childNodes.length) body.appendChild(metaRow);
        }

        card.appendChild(body);
      }

      panel.appendChild(card);
    });

    // Add function button — opens fn modal directly
    const addBtn = document.createElement('button');
    addBtn.className = 'nm-fn-add-btn';
    addBtn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none">' +
      '<line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '<line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg> Add function';
    addBtn.addEventListener('click', () => {
      closeNodeModal();
      openFnModal(n.id);
      setTimeout(() => addFnAndSelect(), 30);
    });
    panel.appendChild(addBtn);
  }

  renderCards();
}

function triggerNMSaved() {
  const badge = document.getElementById('nm-saved-badge');
  badge.style.opacity = '1';
  clearTimeout(nmSaveTimer);
  nmSaveTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1800);
  // also keep canvas node list in sync
  renderSidebar();
}

// Close on overlay click
document.getElementById('node-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('node-modal-overlay')) closeNodeModal();
});
// Close on Escape
document.addEventListener('keydown', e => {
  const _nmOverlay = document.getElementById('node-modal-overlay'); if (e.key === 'Escape' && _nmOverlay && _nmOverlay.classList.contains('open')) {
    closeNodeModal();
  }
});



// ══════════════════════════════════════════════
// FUNCTION EDITOR MODAL
// ══════════════════════════════════════════════
let fnModalNodeId = null;
let activeFnIdx = null;
let fnAutoSaveTimer = null;

function openFnModal(nodeId) {
  const n = state.nodes.find(x => x.id === nodeId);
  if (!n) return;
  fnModalNodeId = nodeId;
  activeFnIdx = null;

  // Normalise functions to objects
  n.functions = (n.functions || []).map(f =>
    typeof f === 'string' ? { name: f, inputs: '', outputs: '', description: '' } : f
  );

  // Header
  document.getElementById('fn-modal-title').textContent = (n.title || '').replace(/\n/g, ' ');
  document.getElementById('fn-modal-sub').textContent = n.tag ? n.tag + ' · ' + (n.type || '') : n.type || '';

  renderFnList();
  showFnDetail(null);

  const _el_fn_modal_overlay_add = document.getElementById('fn-modal-overlay'); if (_el_fn_modal_overlay_add) _el_fn_modal_overlay_add.classList.add('open');
  document.body.style.overflow = 'hidden';

  // If functions exist, auto-select first
  if (n.functions.length > 0) selectFn(0);
}

function closeFnModal() {
  const _el_fn_modal_overlay_remove = document.getElementById('fn-modal-overlay'); if (_el_fn_modal_overlay_remove) _el_fn_modal_overlay_remove.classList.remove('open');
  document.body.style.overflow = '';
  fnModalNodeId = null;
  activeFnIdx = null;
  // Sync canvas and sidebar
  renderNodes();
  renderSidebar();
}

function buildFnListItem(fn, i, n) {
  const item = document.createElement('div');
  item.className = 'fn-list-item' + (activeFnIdx === i ? ' active' : '');
  item.dataset.idx = i;

  const grip = document.createElement('span');
  grip.className = 'fn-list-grip';
  grip.textContent = '⠿';
  grip.title = 'Drag to reorder';

  const dot = document.createElement('div');
  dot.className = 'fn-list-dot';

  const name = document.createElement('div');
  name.className = 'fn-list-name';
  name.textContent = (fn.name || '').trim() || 'Untitled function';
  if (!(fn.name || '').trim()) name.style.fontStyle = 'italic';

  item.appendChild(grip);
  item.appendChild(dot);
  item.appendChild(name);
  if (fn.hidden) {
    const hb = document.createElement('span');
    hb.className = 'fn-hidden-badge';
    hb.textContent = 'hidden';
    item.appendChild(hb);
  }

  item.addEventListener('click', () => selectFn(i));

  // Drag-to-reorder — never re-renders DOM mid-drag, only swaps nodes visually
  grip.addEventListener('mousedown', e2 => {
    e2.preventDefault();
    e2.stopPropagation();

    const container = document.getElementById('fn-list-items');
    let dragIdx = i;           // current logical position of the dragged item
    let lastY = e2.clientY;
    let accumulated = 0;

    // Mark item as dragging
    item.style.opacity = '0.5';
    item.style.outline = '1px dashed var(--accent3)';

    const onMove = ev => {
      const dy = ev.clientY - lastY;
      lastY = ev.clientY;
      accumulated += dy;

      // Use the actual rendered row height each tick
      const rows = Array.from(container.querySelectorAll('.fn-list-item'));
      const rowH = rows[0] ? rows[0].offsetHeight + 2 : 36;

      const steps = Math.trunc(accumulated / rowH);
      if (steps === 0) return;
      accumulated -= steps * rowH;

      const targetIdx = Math.max(0, Math.min(n.functions.length - 1, dragIdx + steps));
      if (targetIdx === dragIdx) return;

      // 1. Mutate the data array
      pushUndo();
      const [removed] = n.functions.splice(dragIdx, 1);
      n.functions.splice(targetIdx, 0, removed);

      // 2. Move the DOM node without rebuilding
      const currentRows = Array.from(container.querySelectorAll('.fn-list-item'));
      const dragEl = currentRows[dragIdx];
      if (dragEl) {
        if (targetIdx < dragIdx) {
          container.insertBefore(dragEl, currentRows[targetIdx]);
        } else {
          const after = currentRows[targetIdx];
          if (after && after.nextSibling) {
            container.insertBefore(dragEl, after.nextSibling);
          } else {
            container.appendChild(dragEl);
          }
        }
      }

      // 3. Track active fn index
      if (activeFnIdx === dragIdx) activeFnIdx = targetIdx;
      else if (activeFnIdx > dragIdx && activeFnIdx <= targetIdx) activeFnIdx--;
      else if (activeFnIdx < dragIdx && activeFnIdx >= targetIdx) activeFnIdx++;

      dragIdx = targetIdx;
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      item.style.opacity = '';
      item.style.outline = '';
      // Full re-render now drag is done — safe because mouse is up
      renderFnList();
      if (activeFnIdx !== null) selectFn(activeFnIdx);
      triggerFnAutoSave();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  return item;
}

function renderFnList() {
  const n = state.nodes.find(x => x.id === fnModalNodeId);
  if (!n) return;
  updateStatusBar();
  const container = document.getElementById('fn-list-items');
  container.innerHTML = '';

  if (n.functions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fn-list-empty';
    empty.textContent = 'No functions yet';
    container.appendChild(empty);
    return;
  }

  n.functions.forEach((fn, i) => {
    container.appendChild(buildFnListItem(fn, i, n));
  });
}

function selectFn(idx) {
  activeFnIdx = idx;
  // Update active state in list
  document.querySelectorAll('.fn-list-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
  const n = state.nodes.find(x => x.id === fnModalNodeId);
  if (!n) return;
  showFnDetail(n.functions[idx], idx);
}

function showFnDetail(fn, idx) {
  const pane = document.getElementById('fn-detail-pane');
  pane.innerHTML = '';

  if (!fn) {
    pane.className = 'empty-state';
    pane.style.cssText = '';
    pane.innerHTML = '<div class="fn-empty-hint"><div class="fn-empty-icon">⚙</div>Select a function to edit,<br>or add a new one.</div>';
    return;
  }

  // Normalise: migrate old string inputs/outputs to arrays
  if (!Array.isArray(fn.inputs))  fn.inputs  = fn.inputs  ? [fn.inputs]  : [];
  if (!Array.isArray(fn.outputs)) fn.outputs = fn.outputs ? [fn.outputs] : [];
  if (fn.hidden === undefined) fn.hidden = false;

  pane.className = '';
  pane.style.cssText = '';

  // All content goes into a scrollable inner div — keeps padding inside the scroll area
  const inner = document.createElement('div');
  inner.className = 'fn-detail-inner';

  // ── helper: simple text field ──
  function makeField(labelText, hint, key, isTextarea, placeholder) {
    const wrap = document.createElement('div');
    wrap.className = 'fn-form-field';
    const lbl = document.createElement('div');
    lbl.className = 'fn-form-label';
    lbl.innerHTML = labelText + (hint ? ' <span class="fn-form-hint">— ' + hint + '</span>' : '');
    wrap.appendChild(lbl);
    const ctrl = document.createElement(isTextarea ? 'textarea' : 'input');
    ctrl.className = 'fn-form-input' + (isTextarea ? ' large' : '');
    if (!isTextarea) ctrl.type = 'text';
    ctrl.value = fn[key] || '';
    ctrl.placeholder = placeholder || '';
    ctrl.addEventListener('input', () => {
      pushUndoDebounced();
      fn[key] = ctrl.value;
      saveToLocalStorage();
      if (key === 'name') {
        updateStatusBar();
        const listItems = document.querySelectorAll('.fn-list-item');
        if (listItems[idx]) {
          const nameEl = listItems[idx].querySelector('.fn-list-name');
          if (nameEl) {
            nameEl.textContent = ctrl.value.trim() || 'Untitled function';
            nameEl.style.fontStyle = ctrl.value.trim() ? '' : 'italic';
          }
        }
      }
      triggerFnAutoSave();
    });
    wrap.appendChild(ctrl);
    return wrap;
  }

  // ── helper: tag-pill list for inputs or outputs ──
  function makeIOSection(key, colorClass, labelText, placeholder) {
    const col = document.createElement('div');
    col.className = 'io-section-col';

    const colLbl = document.createElement('div');
    colLbl.className = 'io-col-label ' + (key === 'inputs' ? 'input-label' : 'output-label');
    colLbl.innerHTML = (key === 'inputs'
      ? '<svg width="9" height="9" viewBox="0 0 9 9"><path d="M1 4.5h7M5 1.5l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="9" height="9" viewBox="0 0 9 9"><path d="M8 4.5H1M4 1.5L1 4.5l3 3" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>')
      + ' ' + labelText;
    col.appendChild(colLbl);

    const tagList = document.createElement('div');
    tagList.className = 'io-tag-list';

    // Ensure hidden arrays exist
    const hidKey = key === 'inputs' ? 'hiddenInputs' : 'hiddenOutputs';
    if (!Array.isArray(fn[hidKey])) fn[hidKey] = [];

    function rebuildTags() {
      tagList.innerHTML = '';
      if (fn[key].length === 0) {
        const empty = document.createElement('div');
        empty.className = 'io-empty';
        empty.textContent = 'None added';
        tagList.appendChild(empty);
      } else {
        fn[key].forEach((val, ti) => {
          const isHidden = fn[hidKey].includes(ti);
          const tag = document.createElement('div');
          tag.className = 'io-tag ' + (key === 'inputs' ? 'input-tag' : 'output-tag') + (isHidden ? ' io-tag-hidden' : '');
          const span = document.createElement('span');
          setIOPillLabel(span, key === 'inputs' ? 'IN' : 'OUT', val);
          // Visibility toggle
          const vis = document.createElement('button');
          vis.className = 'io-tag-vis';
          vis.title = isHidden ? 'Show on canvas' : 'Hide from canvas';
          vis.innerHTML = isHidden ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2" opacity="0.5"/><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><ellipse cx="6" cy="6" rx="5" ry="3.2" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.5" fill="currentColor"/></svg>';
          vis.style.cssText = 'flex-shrink:0;display:inline-flex;align-items:center;background:none;border:none;cursor:pointer;padding:0 3px 0 0;opacity:' + (isHidden ? '0.35' : '0.75') + ';color:inherit;transition:opacity 0.12s;';
          vis.addEventListener('click', e => {
            e.stopPropagation();
            pushUndo();
            const idx = fn[hidKey].indexOf(ti);
            if (idx === -1) fn[hidKey].push(ti);
            else fn[hidKey].splice(idx, 1);
            rebuildTags();
            renderNodes();
            updateStatusBar();
            saveToLocalStorage();
          });
          const rm = document.createElement('button');
          rm.className = 'io-tag-remove';
          rm.innerHTML = '×';
          rm.title = 'Remove';
          rm.addEventListener('click', e => {
            e.stopPropagation();
            pushUndo();
            fn[key].splice(ti, 1);
            // Fix up hidden indices after removal
            fn[hidKey] = fn[hidKey].filter(i => i !== ti).map(i => i > ti ? i - 1 : i);
            rebuildTags();
            renderNodes();
            triggerFnAutoSave();
          });
          tag.appendChild(vis);
          tag.appendChild(span);
          tag.appendChild(rm);
          tagList.appendChild(tag);
        });
      }
    }
    rebuildTags();
    col.appendChild(tagList);

    // Add row
    const addRow = document.createElement('div');
    addRow.className = 'io-add-row';
    const addInp = document.createElement('input');
    addInp.type = 'text';
    addInp.className = 'io-add-input ' + (key === 'inputs' ? 'input-focus' : 'output-focus');
    addInp.placeholder = placeholder;
    const addBtn = document.createElement('button');
    addBtn.className = 'io-add-btn';
    addBtn.textContent = '+ Add';
    const doAdd = () => {
      const v = addInp.value.trim();
      if (!v) return;
      pushUndo();
      fn[key].push(v);
      addInp.value = '';
      rebuildTags();
      triggerFnAutoSave();
      addInp.focus();
    };
    addBtn.addEventListener('click', doAdd);
    addInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
    addRow.appendChild(addInp);
    addRow.appendChild(addBtn);
    col.appendChild(addRow);

    return col;
  }

  // ── NAME ──
  inner.appendChild(makeField('Function name', '', 'name', false, 'e.g. Work order dispatch'));

  // ── VISIBILITY TOGGLE ──
  const visRow = document.createElement('div');
  visRow.className = 'fn-form-field';
  const visToggleWrap = document.createElement('div');
  visToggleWrap.className = 'fn-visibility-row';
  const visToggle = document.createElement('button');
  visToggle.className = 'fn-visibility-toggle' + (fn.hidden ? '' : ' visible');
  visToggle.setAttribute('aria-label', 'Toggle visibility');
  const visLabelWrap = document.createElement('div');
  visLabelWrap.style.flex = '1';
  const visLabel = document.createElement('div');
  visLabel.className = 'fn-visibility-label';
  visLabel.textContent = fn.hidden ? 'Hidden from diagram' : 'Visible on diagram';
  const visSub = document.createElement('div');
  visSub.className = 'fn-visibility-sub';
  visSub.textContent = fn.hidden ? 'Function is in the data but not shown on the canvas node' : 'Function name appears in the node on the canvas';
  visLabelWrap.appendChild(visLabel);
  visLabelWrap.appendChild(visSub);
  visToggleWrap.appendChild(visToggle);
  visToggleWrap.appendChild(visLabelWrap);
  visToggle.addEventListener('click', e => {
    e.stopPropagation();
    pushUndo();
    fn.hidden = !fn.hidden;
    visToggle.classList.toggle('visible', !fn.hidden);
    visLabel.textContent = fn.hidden ? 'Hidden from diagram' : 'Visible on diagram';
    visSub.textContent = fn.hidden ? 'Function is in the data but not shown on the canvas node' : 'Function name appears in the node on the canvas';
    // Update hidden badge in fn list
    const listItem = document.querySelectorAll('.fn-list-item')[idx];
    if (listItem) {
      let badge = listItem.querySelector('.fn-hidden-badge');
      if (fn.hidden && !badge) {
        badge = document.createElement('span');
        badge.className = 'fn-hidden-badge';
        badge.textContent = 'hidden';
        listItem.appendChild(badge);
      } else if (!fn.hidden && badge) {
        badge.remove();
      }
    }
    triggerFnAutoSave();
    updateStatusBar();
    saveToLocalStorage();
    // Re-render canvas node then re-draw arrows after layout settles
    const n = state.nodes.find(x => x.id === fnModalNodeId);
    if (n) {
      const el = createNodeEl(n);
      const old = document.getElementById('node-' + n.id);
      if (old) old.replaceWith(el);
      requestAnimationFrame(() => renderArrows());
    }
  });
  visToggleWrap.addEventListener('click', () => visToggle.click());
  visRow.appendChild(visToggleWrap);
  inner.appendChild(visRow);

  const divider = document.createElement('div');
  divider.className = 'fn-form-divider';
  inner.appendChild(divider);

  // ── INPUTS & OUTPUTS ──
  const ioSectionLabel = document.createElement('div');
  ioSectionLabel.className = 'fn-form-section-label';
  ioSectionLabel.textContent = 'Inputs & Outputs';
  inner.appendChild(ioSectionLabel);

  const ioRow = document.createElement('div');
  ioRow.className = 'io-section-row';
  ioRow.appendChild(makeIOSection('inputs',  'input-tag',  'Inputs',  'e.g. Sales order'));
  ioRow.appendChild(makeIOSection('outputs', 'output-tag', 'Outputs', 'e.g. Work order'));
  inner.appendChild(ioRow);

  const divider2 = document.createElement('div');
  divider2.className = 'fn-form-divider';
  inner.appendChild(divider2);

  // ── DESCRIPTION ──
  const descLabel = document.createElement('div');
  descLabel.className = 'fn-form-section-label';
  descLabel.textContent = 'Description & Rules';
  inner.appendChild(descLabel);

  inner.appendChild(makeField('Description', 'logic, triggers, ownership, SLAs', 'description', true,
    'Describe what this function does, who owns it, key business rules, trigger conditions, SLAs or constraints…'));

  const divider3 = document.createElement('div');
  divider3.className = 'fn-form-divider';
  inner.appendChild(divider3);

  // ── METADATA ──
  const metaLabel = document.createElement('div');
  metaLabel.className = 'fn-form-section-label';
  metaLabel.textContent = 'Metadata';
  inner.appendChild(metaLabel);

  const metaRow = document.createElement('div');
  metaRow.className = 'fn-form-row';
  metaRow.appendChild(makeField('Owner / Role', '', 'owner', false, 'e.g. Production Planner'));
  metaRow.appendChild(makeField('Trigger', '', 'trigger', false, 'e.g. On MRP run, daily at 06:00'));
  inner.appendChild(metaRow);

  inner.appendChild(makeField('System / Tool', 'specific system or module used', 'system', false, 'e.g. SAP PP module, custom MES screen'));

  // ── DELETE ──
  const actions = document.createElement('div');
  actions.id = 'fn-detail-actions';
  const delBtn = document.createElement('button');
  delBtn.className = 'fn-del-action';
  delBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> Remove function';
  delBtn.addEventListener('click', () => {
    const n = state.nodes.find(x => x.id === fnModalNodeId);
    if (!n) return;
    pushUndo();
    n.functions.splice(idx, 1);
    activeFnIdx = Math.min(activeFnIdx, n.functions.length - 1);
    if (activeFnIdx < 0) activeFnIdx = null;
    renderFnList();
    showFnDetail(activeFnIdx !== null ? n.functions[activeFnIdx] : null, activeFnIdx);
    triggerFnAutoSave();
  });
  actions.appendChild(delBtn);
  inner.appendChild(actions);
  pane.appendChild(inner);
}

function addFnAndSelect() {
  const n = state.nodes.find(x => x.id === fnModalNodeId);
  if (!n) return;
  const newFn = { name: '', inputs: [], outputs: [], description: '', owner: '', trigger: '', system: '', hidden: false };
  pushUndo();
  n.functions.push(newFn);
  renderFnList();
  selectFn(n.functions.length - 1);
  // Focus the name input
  const inp = document.querySelector('#fn-detail-pane .fn-form-input');
  if (inp) { inp.focus(); inp.select(); }
}

function triggerFnAutoSave() {
  const badge = document.getElementById('fn-autosave');
  if (badge) { badge.style.opacity = '1'; clearTimeout(fnAutoSaveTimer); fnAutoSaveTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1800); }
}

// Close on overlay click / Escape
document.getElementById('fn-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('fn-modal-overlay')) closeFnModal();
});
document.addEventListener('keydown', e => {
  const _fnOverlay = document.getElementById('fn-modal-overlay'); if (e.key === 'Escape' && _fnOverlay && _fnOverlay.classList.contains('open')) {
    closeFnModal();
  }
});


// ══════════════════════════════════════════════
// CONNECTION MODAL
// ══════════════════════════════════════════════
let connState = {
  fromId: null,
  toId: null,
  dir: 'directed',
  fromPort: 'auto',
  toPort: 'auto',
  activePicker: null   // 'from' | 'to'
};

function openConnectModal(presetFromId) {
  connState = { fromId: presetFromId || null, toId: null, dir: 'directed', fromPort: 'auto', toPort: 'auto', activePicker: null };
  document.getElementById('conn-label-input').value = '';
  document.getElementById('conn-error').textContent = '';
  document.getElementById('conn-picker-wrap').style.display = 'none';
  setConnDir('directed');
  setConnPort('from', 'auto');
  setConnPort('to', 'auto');
  renderConnNodeDisplay('from');
  renderConnNodeDisplay('to');
  renderConnPreview();
  renderConnExisting();
  const _el_conn_modal_overlay_add = document.getElementById('conn-modal-overlay'); if (_el_conn_modal_overlay_add) _el_conn_modal_overlay_add.classList.add('open');
  document.body.style.overflow = 'hidden';
  // If preset from, open the 'to' picker immediately
  if (presetFromId) {
    setTimeout(() => openNodePicker('to'), 80);
  }
}

function closeConnectModal() {
  closeAllNodePickers();
  const _el_conn_modal_overlay_remove = document.getElementById('conn-modal-overlay'); if (_el_conn_modal_overlay_remove) _el_conn_modal_overlay_remove.classList.remove('open');
  document.body.style.overflow = '';
  connState.activePicker = null;
}

// ── Inline dropdown node pickers ──
function renderConnNodeDisplay(side) {
  const id = side === 'from' ? connState.fromId : connState.toId;
  const el = document.getElementById('conn-' + side + '-display');
  const content = el.querySelector('.conn-node-picker-content');
  if (!id) {
    el.className = 'conn-node-picker';
    content.innerHTML = '<div class="conn-node-picker-hint">Click to select…</div>';
    return;
  }
  const n = state.nodes.find(x => x.id === id);
  if (!n) return;
  el.className = 'conn-node-picker selected' + (n.type === 'external' ? ' external' : '');
  content.innerHTML =
    (n.tag ? '<div class="conn-node-picker-tag">' + n.tag + '</div>' : '') +
    '<div class="conn-node-picker-name">' + (n.title || '').replace(/\n/g, ' ') + '</div>';
}

function openNodePicker(side) {
  const el = document.getElementById('conn-' + side + '-display');
  const isOpen = el.classList.contains('open');
  // Close any open picker first
  closeAllNodePickers();
  if (isOpen) return; // toggle off
  connState.activePicker = side;
  el.classList.add('open');
  const inp = document.getElementById('conn-' + side + '-search');
  if (inp) { inp.value = ''; inp.focus(); }
  renderInlinePickerList(side, '');
}

function closeAllNodePickers() {
  ['from', 'to'].forEach(side => {
    const el = document.getElementById('conn-' + side + '-display');
    if (el) el.classList.remove('open');
  });
  connState.activePicker = null;
}

function renderInlinePickerList(side, query) {
  const list = document.getElementById('conn-' + side + '-list');
  if (!list) return;
  list.innerHTML = '';
  const nodes = state.nodes; // all types including boundary
  const q = (query || '').toLowerCase();
  const filtered = nodes.filter(n => {
    if (!q) return true;
    return (n.title || '').toLowerCase().includes(q) ||
           (n.tag   || '').toLowerCase().includes(q) ||
           (n.subtitle || '').toLowerCase().includes(q);
  });
  if (filtered.length === 0) {
    list.innerHTML = '<div style="padding:10px 12px;font-size:11px;color:var(--text3);font-style:italic;">No nodes found</div>';
    return;
  }
  const currentSel = side === 'from' ? connState.fromId : connState.toId;
  filtered.forEach(n => {
    const opt = document.createElement('div');
    opt.className = 'conn-node-option' + (n.id === currentSel ? ' active' : '');
    opt.innerHTML =
      '<span class="conn-node-opt-badge ' + n.type + '">' + (n.tag || n.type.slice(0,3).toUpperCase()) + '</span>' +
      '<div class="conn-node-opt-text"><div class="conn-node-opt-name">' + (n.title || '').replace(/\n/g, ' ') + '</div>' +
      (n.subtitle ? '<div class="conn-node-opt-sub">' + (n.subtitle || '').replace(/\n/g,' ').slice(0,60) + '</div>' : '') +
      '</div>';
    opt.addEventListener('click', e => {
      e.stopPropagation();
      if (side === 'from') connState.fromId = n.id;
      else                 connState.toId   = n.id;
      closeAllNodePickers();
      renderConnNodeDisplay(side);
      renderConnPreview();
      renderConnExisting();
      const err = document.getElementById('conn-error');
      if (err) err.textContent = '';
    });
    list.appendChild(opt);
  });
}

// Wire up search inputs
document.getElementById('conn-from-search').addEventListener('input', e => {
  renderInlinePickerList('from', e.target.value);
});
document.getElementById('conn-to-search').addEventListener('input', e => {
  renderInlinePickerList('to', e.target.value);
});

// Legacy — kept so any external calls don't break
function renderNodePickerList(query) {
  if (connState.activePicker) renderInlinePickerList(connState.activePicker, query);
}

// Close pickers when clicking outside the modal node row
document.getElementById('conn-modal').addEventListener('click', e => {
  if (!e.target.closest('.conn-node-picker')) closeAllNodePickers();
});

function swapConnNodes() {
  [connState.fromId, connState.toId] = [connState.toId, connState.fromId];
  [connState.fromPort, connState.toPort] = [connState.toPort, connState.fromPort];
  renderConnNodeDisplay('from');
  renderConnNodeDisplay('to');
  renderConnPreview();
  renderConnExisting();
}

function setConnDir(dir) {
  connState.dir = dir;
  document.querySelectorAll('.conn-dir-btn').forEach(b => b.classList.toggle('active', b.dataset.dir === dir));
  renderConnPreview();
}

function setConnPort(side, port) {
  if (side === 'from') connState.fromPort = port;
  else                 connState.toPort   = port;
  const grid = document.getElementById('conn-' + side + '-ports');
  grid.querySelectorAll('.conn-port-btn').forEach(b => b.classList.toggle('active', b.dataset.port === port));
  renderConnPreview();
}

function renderConnPreview() {
  const fromNode = connState.fromId ? state.nodes.find(x => x.id === connState.fromId) : null;
  const toNode   = connState.toId   ? state.nodes.find(x => x.id === connState.toId)   : null;
  const label    = document.getElementById('conn-label-input').value;

  const fromEl = document.getElementById('conn-preview-from');
  const toEl   = document.getElementById('conn-preview-to');
  const lineEl = document.getElementById('conn-preview-line');
  const lblEl  = document.getElementById('conn-preview-lbl');

  fromEl.textContent = fromNode ? (fromNode.title || '').replace(/\n/g,' ') : 'From';
  fromEl.style.opacity = fromNode ? '1' : '0.35';
  fromEl.className = 'conn-preview-from' + (fromNode && fromNode.type === 'external' ? ' ext' : '');

  toEl.textContent = toNode ? (toNode.title || '').replace(/\n/g,' ') : 'To';
  toEl.style.opacity = toNode ? '1' : '0.35';
  toEl.className = 'conn-preview-to' + (toNode && toNode.type === 'external' ? ' ext' : '');

  const arrows = { directed: '──→', bidirectional: '←──→', undirected: '────' };
  lineEl.textContent = arrows[connState.dir] || '──→';
  lblEl.textContent = label || '';
}

document.getElementById('conn-label-input').addEventListener('input', renderConnPreview);

function renderConnExisting() {
  const wrap = document.getElementById('conn-existing-wrap');
  const list = document.getElementById('conn-existing-list');
  if (!connState.fromId) { wrap.style.display = 'none'; return; }
  const related = state.arrows.filter(a => a.from === connState.fromId || a.to === connState.fromId);
  if (related.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  list.innerHTML = '';
  related.forEach(a => {
    const otherId = a.from === connState.fromId ? a.to : a.from;
    const other = state.nodes.find(x => x.id === otherId);
    if (!other) return;
    const isOut = a.from === connState.fromId;
    const item = document.createElement('div');
    item.className = 'conn-existing-item';
    const dirIcon = a.direction === 'bidirectional' ? '↔' : isOut ? '→' : '←';
    item.innerHTML =
      '<span class="conn-existing-dir">' + dirIcon + '</span>' +
      '<div class="conn-existing-info">' +
        '<span style="font-weight:600;color:var(--text);">' + (other.title||'').replace(/\n/g,' ') + '</span>' +
        (a.label ? ' <span class="conn-existing-label">· ' + a.label + '</span>' : '') +
      '</div>' +
      '<button class="conn-existing-del" title="Delete this connection">×</button>';
    item.querySelector('.conn-existing-del').addEventListener('click', () => {
      pushUndo();
    state.arrows = state.arrows.filter(x => x.id !== a.id);
      renderArrows();
      renderConnExisting();
      updateStatusBar();
    });
    list.appendChild(item);
  });
}

function createConnection() {
  const errEl = document.getElementById('conn-error');
  if (!connState.fromId) { errEl.textContent = 'Please select a From node.'; return; }
  if (!connState.toId)   { errEl.textContent = 'Please select a To node.';   return; }
  if (connState.fromId === connState.toId) { errEl.textContent = 'From and To must be different nodes.'; return; }

  // Resolve 'auto' ports
  const best = getBestPos(connState.fromId, connState.toId);
  const fromPort = connState.fromPort === 'auto' ? best.fromPos : connState.fromPort;
  const toPort   = connState.toPort   === 'auto' ? best.toPos   : connState.toPort;

  const id = nextArrowId();
  state.arrows.push({
    id,
    from: connState.fromId,
    to:   connState.toId,
    fromPos: fromPort,
    toPos:   toPort,
    direction: connState.dir,
    label: document.getElementById('conn-label-input').value.trim(),
    labelOffsetX: 0, labelOffsetY: 0,
    color: '', dash: false, bend: 0
  });
  renderArrows();
  updateStatusBar();

  // Reset for another connection, keep from node
  const prevFrom = connState.fromId;
  connState.toId = null;
  connState.fromPort = 'auto';
  connState.toPort = 'auto';
  document.getElementById('conn-label-input').value = '';
  errEl.textContent = '';
  renderConnNodeDisplay('to');
  renderConnPreview();
  renderConnExisting();

  // Flash the button green briefly
  const btn = document.getElementById('conn-create-btn');
  btn.textContent = '✓ Created!';
  btn.style.background = 'var(--accent3)';
  setTimeout(() => { btn.textContent = 'Create Connection'; btn.style.background = ''; }, 1200);
}

// Close on overlay click
document.getElementById('conn-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('conn-modal-overlay')) closeConnectModal();
});

// Also wire up the node detail modal connections tab "Add connection" button
function openConnectFromNode(nodeId) {
  closeNodeModal();
  openConnectModal(nodeId);
}


// ══════════════════════════════════════════════
// THEME SYSTEM
// ══════════════════════════════════════════════
const THEME_DEFAULTS = {
  '--bg':                   '#f5f5f5',
  '--surface':              '#ffffff',
  '--surface2':             '#f0f0f0',
  '--surface3':             '#e8e8e8',
  '--border':               '#e0e0e0',
  '--border2':              '#cccccc',
  '--text':                 '#111111',
  '--text2':                '#555555',
  '--text3':                '#999999',
  '--accent':               '#ff8c42',
  '--accent2':              '#6c8ead',
  '--accent3':              '#e85e00',
  '--danger':               '#d93030',
  '--node-internal':        '#ffffff',
  '--node-internal-border': '#c89000',
  '--node-external':        '#ffffff',
  '--node-external-border': '#6c8ead',
  '--arrow-color':          '#ff8c42',
  '--io-input-bg':          '#e8f2fa',
  '--io-input-border':      '#a8c8e8',
  '--io-input-text':        '#2a5880',
  '--io-output-bg':         '#fff4e0',
  '--io-output-border':     '#e8c870',
  '--io-output-text':       '#804800',
};

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


// ══════════════════════════════════════════════
// EXPORT MODAL
// ══════════════════════════════════════════════
const exportOpts = {
  showLegend: true,
  showGrid: true,
};
let exportPreviewTimer = null;

function openExportModal() {
  // Sync toggles to current state
  Object.keys(exportOpts).forEach(k => {
    const btn = document.getElementById('opt-' + k);
    if (btn) btn.className = 'export-toggle' + (exportOpts[k] ? ' on' : '');
  });
  document.getElementById('export-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Use ResizeObserver to fire only once the preview wrap has real dimensions.
  // This is more reliable than rAF/setTimeout which can fire before flex layout settles.
  const wrap = document.getElementById('export-preview-frame-wrap');
  const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
      const h = entry.contentRect.height;
      if (h > 10) {
        ro.disconnect();
        schedulePreviewUpdate();
        return;
      }
    }
  });
  ro.observe(wrap);

  // Fallback: if ResizeObserver never fires (e.g. wrap already has size), use rAF
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (w > 10 && h > 10) { ro.disconnect(); schedulePreviewUpdate(); }
  }));
}

function closeExportModal() {
  document.getElementById('export-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  clearTimeout(exportPreviewTimer);
}

function toggleExportOpt(key) {
  exportOpts[key] = !exportOpts[key];
  const btn = document.getElementById('opt-' + key);
  if (btn) btn.className = 'export-toggle' + (exportOpts[key] ? ' on' : '');
  schedulePreviewUpdate();
}

function schedulePreviewUpdate() {
  clearTimeout(exportPreviewTimer);
  document.getElementById('export-preview-loading').style.display = 'flex';
  document.getElementById('export-preview-frame').style.opacity = '0';
  exportPreviewTimer = setTimeout(updateExportPreview, 200);
}

function updateExportPreview() {
  const { html, title, diagramW, diagramH } = buildExportHTML(exportOpts);
  const frame = document.getElementById('export-preview-frame');
  const wrap  = document.getElementById('export-preview-frame-wrap');
  const loading = document.getElementById('export-preview-loading');

  // Snapshot wrap dimensions BEFORE touching the iframe so they are stable
  const wrapW = wrap.clientWidth  || wrap.offsetWidth  || 600;
  const wrapH = wrap.clientHeight || wrap.offsetHeight || 400;

  // The exported page has 40px top/bottom padding and centres content at max 1100px.
  // Use the actual diagram width (from buildExportHTML) plus padding to get real content size.
  const exportPageW = Math.min(diagramW + 80, 1100 + 80);
  const exportPageH = diagramH + 160; // header + diagram + legend + footer ≈ 160px overhead

  // Scale to fill the wrap in both dimensions, never exceed 1:1
  const scaleX = wrapW / exportPageW;
  const scaleY = wrapH / exportPageH;
  const sc = Math.min(scaleX, scaleY, 1);

  // Set iframe to the exact logical size of the export page, then scale it down
  frame.style.width  = (wrapW / sc) + 'px';
  frame.style.height = (wrapH / sc) + 'px';
  frame.style.transform = `scale(${sc})`;
  frame.style.transformOrigin = 'top left';
  frame.style.opacity = '0';

  frame.srcdoc = html;
  frame.onload = () => {
    loading.style.display = 'none';
    frame.style.opacity = '1';
    const sizeKb = Math.round(html.length / 1024);
    document.getElementById('export-preview-size').textContent = `~${sizeKb} KB`;
  };
}

function downloadExport() {
  const { html, title } = buildExportHTML(exportOpts);
  const blob = new Blob([html], {type: 'text/html'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = (title || 'conduit-diagram').replace(/\s+/g, '-').toLowerCase() + '.html';
  link.click();
  closeExportModal();
}

// Close on overlay click / Escape
document.getElementById('export-modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('export-modal-overlay')) closeExportModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('export-modal-overlay')?.classList.contains('open')) {
    closeExportModal();
  }
});
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeBasicModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('modal-overlay')?.classList.contains('open')) {
    closeBasicModal();
  }
  if (e.key === 'Escape' && document.getElementById('document-panel')?.classList.contains('open')) {
    toggleDocumentPanel(false);
  }
});
document.addEventListener('mousedown', e => {
  const panel = document.getElementById('document-panel');
  if (!panel || !panel.classList.contains('open')) return;
  if (panel.contains(e.target)) return;
  toggleDocumentPanel(false);
});


// ── Arrow tooltip ──
const _arrowTooltip = document.getElementById('arrow-tooltip');
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


// ══════════════════════════════════════════════
// AUTO-SAVE TO LOCALSTORAGE
// Extracted to src/services/storage.js


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

// ══════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════
// Ensure DOM is ready before init
function bootApp() {
  panX = 60; panY = 40;
  applyTransform();
  loadTheme();
  try {
    // Attempt to restore last draft; fall back to a fresh blank draft
    if (loadFromLocalStorage()) {
    } else {
      init();
      saveToLocalStorage();
    }
  } catch(e) {
    console.error('Conduit boot error:', e);
    try { init(); saveToLocalStorage(); } catch(e2) {}
  }
  updateDocumentPanelFromInputs();
  updateDocumentPanelPosition();
  restoreSectionState();
  updatePaletteHighlight();
  // Re-run empty state check after DOM settles
  setTimeout(updateEmptyState, 50);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
