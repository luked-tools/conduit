function getCurrentDiagramPayload() {
  return getDiagramDocumentPayload();
}

function createBlankDiagramPayload() {
  return createDiagramDocumentFromPayload({
    title: 'System Map',
    subtitle: 'Processes, platforms, and data flows',
    state: createBlankDiagramState()
  });
}

function applyDiagramPayload(data) {
  setDiagramDocumentFromPayload(data);
}
