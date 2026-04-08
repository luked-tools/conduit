// Draft UI helpers extracted from main.js

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
  const diagrams = Array.isArray(payload.diagrams) && payload.diagrams.length
    ? payload.diagrams
    : (payload.state ? [{ state: payload.state }] : []);
  const nodeCount = diagrams.reduce((sum, diagram) => sum + (Array.isArray(diagram.state?.nodes) ? diagram.state.nodes.length : 0), 0);
  const arrowCount = diagrams.reduce((sum, diagram) => sum + (Array.isArray(diagram.state?.arrows) ? diagram.state.arrows.length : 0), 0);
  return { payload, nodeCount, arrowCount, diagramCount: diagrams.length };
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
            ${summary.diagramCount} diagram${summary.diagramCount === 1 ? '' : 's'} · ${summary.nodeCount} items · ${summary.arrowCount} connections
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
