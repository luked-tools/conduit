let _activeArrowDrag = null;

function startArrowLabelDrag(arrowId, event) {
  event.stopPropagation();
  pushUndo();
  if (selectedArrow !== arrowId) selectArrow(arrowId);
  _activeArrowDrag = {
    type: 'label',
    arrowId,
    lastX: event.clientX,
    lastY: event.clientY,
  };
}

function startOrthogonalHandleDrag(arrowId, prop, info, isXDrag, event) {
  event.stopPropagation();
  const arrow = state.arrows.find(x => x.id === arrowId);
  if (!arrow) return;
  pushUndo();
  if (selectedArrow !== arrowId) selectArrow(arrowId);
  _activeArrowDrag = {
    type: 'orthogonal',
    arrowId,
    prop,
    isXDrag,
    startPos: isXDrag ? event.clientX : event.clientY,
    startVal: arrow[prop] || 0,
    snapBase: info.snapBase,
    snapTargets: info.snapTargets || [],
  };
}

window.addEventListener('mousemove', event => {
  if (!_activeArrowDrag) return;
  const arrow = state.arrows.find(x => x.id === _activeArrowDrag.arrowId);
  if (!arrow) return;

  if (_activeArrowDrag.type === 'label') {
    arrow.labelOffsetX = (arrow.labelOffsetX || 0) + (event.clientX - _activeArrowDrag.lastX) / scale;
    arrow.labelOffsetY = (arrow.labelOffsetY || 0) + (event.clientY - _activeArrowDrag.lastY) / scale;
    _activeArrowDrag.lastX = event.clientX;
    _activeArrowDrag.lastY = event.clientY;
    scheduleRenderArrows();
    return;
  }

  const delta = ((_activeArrowDrag.isXDrag ? event.clientX : event.clientY) - _activeArrowDrag.startPos) / scale;
  let nextVal = _activeArrowDrag.startVal + delta;
  const SNAP_THRESHOLD = 12;

  if (_activeArrowDrag.snapTargets && _activeArrowDrag.snapBase !== undefined) {
    for (const target of _activeArrowDrag.snapTargets) {
      const offset = target - _activeArrowDrag.snapBase;
      if (Math.abs(nextVal - offset) < SNAP_THRESHOLD) {
        nextVal = offset;
        break;
      }
    }
  }

  arrow[_activeArrowDrag.prop] = nextVal;
  scheduleRenderArrows();

  const bendSlider = document.getElementById('ortho-slider-bend');
  const orthoSlider = document.getElementById('ortho-slider-orthoY');
  if (bendSlider) {
    bendSlider.value = Math.round(arrow.bend || 0);
    updateSliderPct(bendSlider);
  }
  if (orthoSlider) {
    orthoSlider.value = Math.round(arrow.orthoY || 0);
    updateSliderPct(orthoSlider);
  }
});

window.addEventListener('mouseup', () => {
  if (!_activeArrowDrag) return;
  const activeArrowId = _activeArrowDrag.arrowId;
  _activeArrowDrag = null;
  saveToLocalStorage();
  if (selectedArrow === activeArrowId) renderSidebar();
});
