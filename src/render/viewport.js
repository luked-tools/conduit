// VIEWPORT TRANSFORM / ZOOM
function applyTransform() {
  if (canvas) canvas.style.transform = `translate(${panX}px,${panY}px) scale(${scale})`;
  const zl = document.getElementById('zoom-label');
  const sz = document.getElementById('sb-zoom');
  if (zl) zl.textContent = Math.round(scale * 100) + '%';
  if (sz) sz.textContent = '⊕ ' + Math.round(scale * 100) + '%';
}

function zoom(factor, cx, cy) {
  const oldScale = scale;
  scale = Math.min(3, Math.max(0.2, scale * factor));
  const rect = canvasWrap.getBoundingClientRect();
  cx = cx ?? rect.width / 2;
  cy = cy ?? rect.height / 2;
  panX = cx - (cx - panX) * (scale / oldScale);
  panY = cy - (cy - panY) * (scale / oldScale);
  applyTransform();
}

function resetZoom() {
  scale = 1;
  panX = 60;
  panY = 40;
  applyTransform();
}

function fitDiagram() {
  const nonBoundary = state.nodes.filter(n => n.type !== 'boundary');
  if (nonBoundary.length === 0) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nonBoundary.forEach(n => {
    const h = getNodeActualH(n);
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + h);
  });
  const pad = 80;
  const dw = maxX - minX;
  const dh = maxY - minY;
  const vw = canvasWrap.clientWidth;
  const vh = canvasWrap.clientHeight;
  if (dw <= 0 || dh <= 0 || vw <= 0 || vh <= 0) return;
  scale = Math.min(1.2, Math.max(0.15, Math.min((vw - pad * 2) / dw, (vh - pad * 2) / dh)));
  panX = (vw - dw * scale) / 2 - minX * scale;
  panY = (vh - dh * scale) / 2 - minY * scale;
  applyTransform();
}

document.getElementById('canvas-wrap')?.addEventListener('wheel', e => {
  e.preventDefault();
  const wrap = document.getElementById('canvas-wrap');
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const factor = e.deltaY < 0 ? 1.1 : 0.91;
  zoom(factor, cx, cy);
}, { passive: false });
