// JSON IMPORT / EXPORT
function exportJSON() {
  const data = {
    version: 1,
    title: document.getElementById('diagram-title-input').value,
    subtitle: document.getElementById('diagram-subtitle-input').value,
    state
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'conduit-diagram.json';
  a.click();
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
    } catch (err) {
      alert('Invalid file: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
