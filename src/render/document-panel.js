// Document panel helpers extracted from main.js

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
  const nav = document.getElementById('diagram-nav');
  const sb = document.getElementById('sidebar');
  if (!panel || !sb) return;
  const sidebarWidth = sb.getBoundingClientRect().width;
  const left = sb.classList.contains('collapsed') ? 14 : (Math.round(sidebarWidth) + 14);
  panel.style.left = left + 'px';
  if (nav) {
    const panelWidth = panel.getBoundingClientRect().width || 300;
    nav.style.left = (left + Math.round(panelWidth) + 10) + 'px';
  }
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
