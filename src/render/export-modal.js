// Export modal helpers extracted from main.js

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
  setStatusModeMessage('Exported full draft HTML', { fade: true, autoClearMs: 1600 });
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
