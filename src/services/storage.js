const LEGACY_LS_KEY = 'simbuilder_autosave';
const DRAFT_INDEX_KEY = 'conduit_drafts_index';
const ACTIVE_DRAFT_KEY = 'conduit_active_draft';
const DRAFT_PREFIX = 'conduit_draft_';

function getDraftStorageKey(id) {
  return DRAFT_PREFIX + id;
}

function readStoredJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function getDraftIndex() {
  const data = readStoredJSON(DRAFT_INDEX_KEY, null);
  if (!data || !Array.isArray(data.drafts)) return { version: 1, drafts: [] };
  return data;
}

function saveDraftIndex(index) {
  localStorage.setItem(DRAFT_INDEX_KEY, JSON.stringify(index));
}

function draftDisplayName(name) {
  return (name || '').trim() || 'Untitled draft';
}

function makeDraftId() {
  return 'draft_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function getDraftPayload(id) {
  return readStoredJSON(getDraftStorageKey(id), null);
}

function saveDraftPayload(id, payload) {
  localStorage.setItem(getDraftStorageKey(id), JSON.stringify(payload));
}

function sortDrafts(index) {
  index.drafts.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return index;
}

function updateDraftUI() {
  const draftName = draftDisplayName(currentDraftName);
  const label = document.getElementById('file-draft-label');
  if (label) {
    label.textContent = draftName;
    label.title = draftName;
  }
  const chip = document.getElementById('active-draft-chip');
  if (chip) {
    chip.textContent = draftName;
    chip.title = draftName;
  }
}

function setActiveDraft(id) {
  currentDraftId = id;
  localStorage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify({ id }));
  const meta = getDraftIndex().drafts.find(d => d.id === id);
  currentDraftName = meta ? draftDisplayName(meta.name) : draftDisplayName(currentDraftName);
  updateDraftUI();
}

function touchDraftMeta(id, patch = {}) {
  const index = getDraftIndex();
  const meta = index.drafts.find(d => d.id === id);
  if (!meta) return null;
  Object.assign(meta, patch, { updatedAt: patch.updatedAt || new Date().toISOString() });
  saveDraftIndex(sortDrafts(index));
  return meta;
}

function ensureDraftRecord({ id = makeDraftId(), name = '', payload = null, activate = false } = {}) {
  const index = getDraftIndex();
  const now = new Date().toISOString();
  let meta = index.drafts.find(d => d.id === id);
  if (!meta) {
    meta = {
      id,
      name: draftDisplayName(name),
      createdAt: now,
      updatedAt: now
    };
    index.drafts.push(meta);
  } else {
    meta.name = draftDisplayName(name || meta.name);
    meta.updatedAt = now;
  }
  saveDraftIndex(sortDrafts(index));
  if (payload) {
    saveDraftPayload(id, {
      version: 1,
      ...payload,
      id,
      name: draftDisplayName(meta.name)
    });
  }
  if (activate) setActiveDraft(id);
  return meta;
}

function flashSavedIndicator() {
  const ind = document.getElementById('sb-autosave');
  if (ind) {
    ind.style.opacity = '1';
    clearTimeout(ind._fadeTimer);
    ind._fadeTimer = setTimeout(() => { ind.style.opacity = '0'; }, 1800);
  }
}

function saveToLocalStorage() {
  try {
    if (!currentDraftId) {
      ensureDraftRecord({
        name: currentDraftName || 'Untitled draft',
        payload: getCurrentDiagramPayload(),
        activate: true
      });
    }
    const payload = getCurrentDiagramPayload();
    saveDraftPayload(currentDraftId, {
      version: 1,
      id: currentDraftId,
      name: draftDisplayName(currentDraftName),
      ...payload
    });
    const meta = touchDraftMeta(currentDraftId, { name: draftDisplayName(currentDraftName) });
    currentDraftName = meta ? draftDisplayName(meta.name) : draftDisplayName(currentDraftName);
    updateDraftUI();
    flashSavedIndicator();
  } catch(e) {
    console.warn('Auto-save failed:', e);
    if (isQuotaExceededError(e)) warnDraftStorageFull();
  }
}

function loadDraftIntoCanvas(id) {
  const payload = getDraftPayload(id);
  if (!payload || !payload.state || !Array.isArray(payload.state.nodes)) return false;
  setActiveDraft(id);
  applyDiagramPayload(payload);
  clearHistoryStacks();
  render();
  return true;
}

function migrateLegacyAutosave() {
  const legacy = readStoredJSON(LEGACY_LS_KEY, null);
  if (!legacy || !legacy.state || !Array.isArray(legacy.state.nodes)) return;
  const index = getDraftIndex();
  if (index.drafts.length) return;
  ensureDraftRecord({
    name: (legacy.title || '').trim() || 'Recovered draft',
    payload: {
      version: 1,
      title: legacy.title || '',
      subtitle: legacy.subtitle || '',
      state: legacy.state
    },
    activate: true
  });
  try { localStorage.removeItem(LEGACY_LS_KEY); } catch (e) {}
}

function loadFromLocalStorage() {
  try {
    migrateLegacyAutosave();
    const active = readStoredJSON(ACTIVE_DRAFT_KEY, null)?.id;
    const index = getDraftIndex();
    if (!index.drafts.length) {
      const meta = ensureDraftRecord({
        name: 'Untitled draft',
        payload: createBlankDiagramPayload(),
        activate: true
      });
      return loadDraftIntoCanvas(meta.id);
    }
    const targetId = active && index.drafts.some(d => d.id === active) ? active : index.drafts[0].id;
    return loadDraftIntoCanvas(targetId);
  } catch(e) {
    console.warn('Draft restore failed:', e);
    return false;
  }
}

function clearAutoSave() {
  try {
    const index = getDraftIndex();
    index.drafts.forEach(d => localStorage.removeItem(getDraftStorageKey(d.id)));
    localStorage.removeItem(DRAFT_INDEX_KEY);
    localStorage.removeItem(ACTIVE_DRAFT_KEY);
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch(e) {}
}
