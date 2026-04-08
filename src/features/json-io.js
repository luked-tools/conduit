// JSON IMPORT / EXPORT
function downloadDiagramJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportJSON() {
  downloadDiagramJSON(getDiagramDocumentPayload(), 'conduit-diagram.json');
}

function exportCurrentDiagramJSON() {
  downloadDiagramJSON(getDiagramDocumentPayload({ currentOnly: true }), 'conduit-current-diagram.json');
}

function importFile() {
  document.getElementById('file-input').click();
}

document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.state || (Array.isArray(data.diagrams) && data.diagrams.length)) {
        const nameFromFile = (file.name || '').replace(/\.[^.]+$/, '') || data.title || 'Imported draft';
        createDraftFromPayload(createDiagramDocumentFromPayload(data), suggestDraftName(nameFromFile), { activate: true });
        saveToLocalStorage();
      } else {
        showCanvasNotice('Import failed', {
          tone: 'danger',
          autoHideMs: 2600
        });
      }
    } catch (err) {
      showCanvasNotice('Import failed', {
        tone: 'danger',
        autoHideMs: 2600
      });
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
