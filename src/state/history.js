let undoStack = [];
let redoStack = [];
let _undoDebounceTimer = null;

function clearRedoStack() {
  redoStack = [];
}

function clearHistoryStacks() {
  undoStack = [];
  redoStack = [];
  if (_undoDebounceTimer) { clearTimeout(_undoDebounceTimer); _undoDebounceTimer = null; }
  updateHistoryBtns();
}

function pushUndo() {
  if (_undoDebounceTimer) { clearTimeout(_undoDebounceTimer); _undoDebounceTimer = null; }
  clearRedoStack();
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 60) undoStack.shift();
  updateHistoryBtns();
}

function pushUndoDebounced() {
  if (_undoDebounceTimer) clearTimeout(_undoDebounceTimer);
  clearRedoStack();
  updateHistoryBtns();
  _undoDebounceTimer = setTimeout(() => {
    _undoDebounceTimer = null;
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 60) undoStack.shift();
    updateHistoryBtns();
  }, 800);
}

function undo() {
  if (_undoDebounceTimer) { clearTimeout(_undoDebounceTimer); _undoDebounceTimer = null; }
  if (undoStack.length === 0) return;
  redoStack.push(JSON.stringify(state));
  if (redoStack.length > 60) redoStack.shift();
  state = JSON.parse(undoStack.pop());
  selectedNode = null;
  selectedArrow = null;
  selectedLabel = null;
  selectedIcon = null;
  selectedCanvasObjects = [];
  primarySelectedCanvasObject = null;
  updateHistoryBtns();
  render();
  saveToLocalStorage();
}

function redo() {
  if (_undoDebounceTimer) { clearTimeout(_undoDebounceTimer); _undoDebounceTimer = null; }
  if (redoStack.length === 0) return;
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 60) undoStack.shift();
  state = JSON.parse(redoStack.pop());
  selectedNode = null;
  selectedArrow = null;
  selectedLabel = null;
  selectedIcon = null;
  selectedCanvasObjects = [];
  primarySelectedCanvasObject = null;
  updateHistoryBtns();
  render();
  saveToLocalStorage();
}

function updateHistoryBtns() {
  const btn = document.getElementById('undo-btn');
  if (btn) btn.disabled = undoStack.length === 0;
  const redoBtn = document.getElementById('redo-btn');
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}
