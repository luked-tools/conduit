
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

      bg.style.cursor = txt.style.cursor = 'move';
      bg.style.pointerEvents = txt.style.pointerEvents = 'all';
      const onDown = e2 => {
        if (e2.detail === 2) return; // dblclick handled separately
        startArrowLabelDrag(a.id, e2);
      };
      bg.addEventListener('mousedown', onDown);
      txt.addEventListener('mousedown', onDown);

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

        pill.addEventListener('mousedown', e2 => {
          startOrthogonalHandleDrag(a.id, prop, info, isXDrag, e2);
        });
      });
    }

  });
}


function bezierPt(p0,p1,p2,p3,t) {
  const mt = 1-t;
  return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
// ── ARROWS ──
}

// ── SIDEBAR ──

// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// INTERACTIONS
// ══════════════════════════════════════════════


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

connectMode = false;

// ── Add node ──
let lastNodeType = 'internal'; // tracks most recently added type for dblclick


// ══════════════════════════════════════════════
// MOUSE EVENTS
// ══════════════════════════════════════════════

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



// Undo for drag/resize is pushed in startDrag/startResize (before the action).



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





// ══════════════════════════════════════════════
// EXPORT MODAL
// ══════════════════════════════════════════════
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




// ══════════════════════════════════════════════
// AUTO-SAVE TO LOCALSTORAGE
// Extracted to src/services/storage.js



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
