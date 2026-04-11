let _inlineAnnotationEditor = null;

function getLabelById(labelId) {
  return state.labels.find(item => item.id === labelId) || null;
}

function getIconById(iconId) {
  return state.icons.find(item => item.id === iconId) || null;
}

function getRenderedLabelLayerValue(label) {
  return getCanvasRenderLayerValue('label', label?.id);
}

function getRenderedIconLayerValue(icon) {
  return getCanvasRenderLayerValue('icon', icon?.id);
}

function renderAnnotations() {
  document.querySelectorAll('.canvas-annotation').forEach(el => el.remove());
  const orderedEntries = getCanvasLayerEntries()
    .filter(entry => entry.kind === 'label' || entry.kind === 'icon');
  orderedEntries.forEach(entry => {
    const annotationEl = entry.kind === 'label'
      ? createLabelAnnotationEl(entry.object)
      : createIconAnnotationEl(entry.object);
    annotationEl.style.zIndex = String(entry.kind === 'label'
      ? getRenderedLabelLayerValue(entry.object)
      : getRenderedIconLayerValue(entry.object));
    canvas.appendChild(annotationEl);
  });
}

function refreshRenderedAnnotationLayers() {
  state.labels.forEach(label => {
    const el = document.getElementById(`label-${label.id}`);
    if (el) el.style.zIndex = String(getRenderedLabelLayerValue(label));
  });
  state.icons.forEach(icon => {
    const el = document.getElementById(`icon-${icon.id}`);
    if (el) el.style.zIndex = String(getRenderedIconLayerValue(icon));
  });
}

function getLabelTextCss(label) {
  const styles = [];
  if (label.textColor) styles.push(`color:${label.textColor}`);
  if (label.fontSize) styles.push(`font-size:${label.fontSize}px`);
  styles.push(`font-weight:${label.fontWeight || 600}`);
  styles.push(`font-style:${label.fontStyle || 'normal'}`);
  return styles.join(';');
}

function getNormalizedLabelBackgroundStyle(label) {
  return label?.backgroundStyle === 'soft' ? 'fill' : (label?.backgroundStyle || 'none');
}

function getLabelFillValue(label) {
  return label?.fillColor || 'var(--surface)';
}

function applyLabelAppearance(label, el) {
  el.style.left = `${label.x}px`;
  el.style.top = `${label.y}px`;
  el.style.opacity = String(label.opacity ?? 1);
  const backgroundStyle = getNormalizedLabelBackgroundStyle(label);
  el.style.background = backgroundStyle === 'fill' ? getLabelFillValue(label) : 'transparent';
  el.style.borderColor = backgroundStyle === 'fill' ? 'var(--border)' : 'transparent';
  const textEl = el.querySelector('.annotation-label-text');
  if (textEl) textEl.style.cssText = getLabelTextCss(label);
}

function createLabelAnnotationEl(label) {
  const el = document.createElement('div');
  el.className = 'canvas-annotation annotation-label';
  if (isCanvasObjectSelected('label', label.id)) el.classList.add('selected');
  el.id = `label-${label.id}`;
  el.dataset.labelId = label.id;
  el.innerHTML = `<div class="annotation-label-text"></div>`;
  el.querySelector('.annotation-label-text').textContent = label.text || 'Label';
  applyLabelAppearance(label, el);
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (_brushActive) {
      e.stopPropagation();
      applyStyleBrush('label', label.id);
      return;
    }
    if (_nodeLayerTargetMode) {
      e.stopPropagation();
      if (!(_nodeLayerTargetMode.sourceKind === 'label' && _nodeLayerTargetMode.sourceId === label.id)) applyCanvasLayerTarget('label', label.id);
      return;
    }
    if (_quickConnectMode || wireActive) return;
    e.stopPropagation();
    if (e.shiftKey) {
      selectLabel(label.id, { additive: true });
      return;
    }
    selectLabel(label.id, { preserveExisting: true });
    startAnnotationDrag(e, 'label', label.id);
  });
  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    startInlineAnnotationEdit(label.id);
  });
  return el;
}

function getIconSvgMarkup(icon) {
  if (icon.svgMarkup) return sanitizeImportedIconSvg(icon.svgMarkup) || icon.svgMarkup;
  return getBuiltinIconDefinition(icon.iconKey)?.svg || getBuiltinIconDefinition('gear')?.svg || '';
}

function getNormalizedIconBackgroundStyle(icon) {
  return icon?.backgroundStyle === 'soft' ? 'fill' : (icon?.backgroundStyle || 'none');
}

function getIconFillValue(icon) {
  return icon?.fillColor || 'var(--surface)';
}

function syncSelectedIconInspector(icon) {
  if (!icon) return;
  const sizeSlider = document.getElementById('selected-icon-size-slider');
  const sizeLabel = document.getElementById('selected-icon-size-label');
  const opacitySlider = document.getElementById('selected-icon-opacity-slider');
  const opacityLabel = document.getElementById('selected-icon-opacity-label');
  if (sizeSlider) {
    sizeSlider.value = String(icon.size || 40);
    if (typeof updateSliderPct === 'function') updateSliderPct(sizeSlider);
  }
  if (sizeLabel) sizeLabel.textContent = `Size — ${Math.round(Number(icon.size) || 40)}px`;
  if (opacitySlider) {
    opacitySlider.value = String(icon.opacity ?? 1);
    if (typeof updateSliderPct === 'function') updateSliderPct(opacitySlider);
  }
  if (opacityLabel) opacityLabel.textContent = `Opacity — ${Math.round((icon.opacity ?? 1) * 100)}%`;
}

function applyIconAppearance(icon, el) {
  const size = Math.max(20, Number(icon.size) || 36);
  const backgroundStyle = getNormalizedIconBackgroundStyle(icon);
  el.style.left = `${icon.x}px`;
  el.style.top = `${icon.y}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.opacity = String(icon.opacity ?? 1);
  el.style.color = icon.color || 'var(--text2)';
  el.style.background = backgroundStyle === 'fill' ? getIconFillValue(icon) : 'transparent';
  el.style.borderColor = backgroundStyle === 'fill' ? 'var(--border)' : 'transparent';
  const glyph = el.querySelector('.annotation-icon-glyph');
  if (glyph) glyph.innerHTML = getIconSvgMarkup(icon);
}

function createIconAnnotationEl(icon) {
  const el = document.createElement('div');
  el.className = 'canvas-annotation annotation-icon';
  if (isCanvasObjectSelected('icon', icon.id)) el.classList.add('selected');
  el.id = `icon-${icon.id}`;
  el.dataset.iconId = icon.id;
  el.innerHTML = '<div class="annotation-icon-glyph"></div><button type="button" class="annotation-icon-resize" aria-label="Resize icon"></button>';
  applyIconAppearance(icon, el);
  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (_brushActive) {
      e.stopPropagation();
      applyStyleBrush('icon', icon.id);
      return;
    }
    if (_nodeLayerTargetMode) {
      e.stopPropagation();
      if (!(_nodeLayerTargetMode.sourceKind === 'icon' && _nodeLayerTargetMode.sourceId === icon.id)) applyCanvasLayerTarget('icon', icon.id);
      return;
    }
    if (_quickConnectMode || wireActive) return;
    if (e.target.closest('.annotation-icon-resize')) return;
    e.stopPropagation();
    if (e.shiftKey) {
      selectIcon(icon.id, { additive: true });
      return;
    }
    selectIcon(icon.id, { preserveExisting: true });
    startAnnotationDrag(e, 'icon', icon.id);
  });
  const resizeHandle = el.querySelector('.annotation-icon-resize');
  resizeHandle?.addEventListener('mousedown', e => {
    if (_nodeLayerTargetMode || _quickConnectMode || wireActive) return;
    e.preventDefault();
    e.stopPropagation();
    selectIcon(icon.id, { preserveExisting: true });
    pushUndo();
    resizingAnnotation = icon.id;
    resizeAnnotationStart = {
      mx: e.clientX,
      my: e.clientY,
      size: Math.max(20, Number(icon.size) || 40)
    };
  });
  el.addEventListener('dblclick', e => {
    e.stopPropagation();
    openIconPicker({ iconId: icon.id });
  });
  return el;
}

function startAnnotationDrag(e, kind, id) {
  startSelectionDragSession(e, kind, id);
}

function positionInlineAnnotationEdit(annotationEl, wrap) {
  if (!annotationEl || !wrap) return;
  const rect = annotationEl.getBoundingClientRect();
  const width = wrap.offsetWidth || 240;
  let left = rect.left + Math.max(-20, (rect.width - width) / 2);
  let top = rect.top - wrap.offsetHeight - 10;
  if (top < 70) top = rect.bottom + 8;
  left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
  wrap.style.left = `${Math.round(left)}px`;
  wrap.style.top = `${Math.round(top)}px`;
}

function closeInlineAnnotationEdit({ save = false } = {}) {
  if (!_inlineAnnotationEditor) return;
  const session = _inlineAnnotationEditor;
  _inlineAnnotationEditor = null;
  if (session.wrap.parentNode) session.wrap.remove();
  if (save) {
    const label = getLabelById(session.labelId);
    if (label) {
      const nextText = session.input.value.trim() || 'Label';
      if (label.text !== nextText) {
        label.text = nextText;
        renderAnnotations();
        renderSidebar();
        if (typeof renderLayersPanel === 'function') renderLayersPanel();
        scheduleSaveToLocalStorage();
      }
    }
  }
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
}

function startInlineAnnotationEdit(labelId) {
  const label = getLabelById(labelId);
  const labelEl = document.getElementById(`label-${labelId}`);
  if (!label || !labelEl) return;
  if (selectedLabel !== labelId) {
    selectLabel(labelId);
    requestAnimationFrame(() => startInlineAnnotationEdit(labelId));
    return;
  }
  closeInlineAnnotationEdit();
  const wrap = document.createElement('div');
  wrap.className = 'annotation-inline-edit';
  wrap.innerHTML = `
    <textarea class="annotation-inline-input" rows="2" spellcheck="false"></textarea>
    <div class="annotation-inline-actions">
      <button type="button" class="annotation-inline-btn">Cancel</button>
      <button type="button" class="annotation-inline-btn primary">Save</button>
    </div>
  `;
  document.body.appendChild(wrap);
  const input = wrap.querySelector('.annotation-inline-input');
  input.value = label.text || '';
  _inlineAnnotationEditor = { labelId, wrap, input };
  if (typeof updateContextToolbar === 'function') updateContextToolbar();
  const [cancelBtn, saveBtn] = wrap.querySelectorAll('button');
  cancelBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeInlineAnnotationEdit();
  });
  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    closeInlineAnnotationEdit({ save: true });
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeInlineAnnotationEdit();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      closeInlineAnnotationEdit({ save: true });
    }
  });
  wrap.addEventListener('mousedown', e => e.stopPropagation());
  positionInlineAnnotationEdit(labelEl, wrap);
  requestAnimationFrame(() => {
    positionInlineAnnotationEdit(labelEl, wrap);
    input.focus();
    input.select();
  });
}

function setSelectedIconValue(iconId, patch) {
  const icon = getIconById(iconId);
  if (!icon) return false;
  Object.assign(icon, patch);
  renderAnnotations();
  syncSelectedIconInspector(icon);
  if (typeof renderLayersPanel === 'function') renderLayersPanel();
  scheduleSaveToLocalStorage();
  return true;
}

function openIconPicker({ iconId = '', createAt = null } = {}) {
  const renderGrid = filterText => {
    const query = (filterText || '').trim().toLowerCase();
    const icons = BUILTIN_ICON_LIBRARY
      .filter(icon => {
        if (!query) return true;
        const hay = `${icon.title} ${icon.category} ${(icon.keywords || []).join(' ')}`.toLowerCase();
        return hay.includes(query);
      });
    if (!icons.length) {
      return '<div class="icon-picker-empty">No icons match that search.</div>';
    }
    const byCategory = new Map();
    icons.forEach(icon => {
      const category = icon.category || 'Other';
      if (!byCategory.has(category)) byCategory.set(category, []);
      byCategory.get(category).push(icon);
    });
    return Array.from(byCategory.entries()).map(([category, categoryIcons]) => `
      <div class="icon-picker-category">
        <div class="icon-picker-category-title">${escapeHtml(category)}</div>
        <div class="icon-picker-grid">
          ${categoryIcons.map(icon => `
            <button type="button" class="icon-picker-item" data-icon-key="${escapeHtml(icon.key)}">
              <span class="icon-picker-glyph">${icon.svg}</span>
              <span class="icon-picker-title">${escapeHtml(icon.title)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `).join('');
  };

  openBasicModal({
    title: 'Choose icon',
    body: `
      <div class="icon-picker-modal">
        <input id="icon-picker-search" class="draft-name-input" type="text" placeholder="Search icons">
        <div id="icon-picker-grid" class="icon-picker-grid">${renderGrid('')}</div>
        <div class="icon-picker-actions">
          <button type="button" id="icon-picker-import" class="tb-btn">Import SVG...</button>
        </div>
      </div>
    `,
    buttons: [{ label: 'Close', className: 'tb-btn' }]
  });

  const grid = document.getElementById('icon-picker-grid');
  const search = document.getElementById('icon-picker-search');
  const importBtn = document.getElementById('icon-picker-import');
  const importInput = document.getElementById('icon-import-input');
  if (!grid || !search || !importBtn || !importInput) return;

  const applyIconSelection = iconData => {
    if (iconId) {
      const icon = getIconById(iconId);
      if (!icon) return;
      pushUndo();
      icon.iconKey = iconData.iconKey || '';
      icon.iconTitle = iconData.iconTitle || '';
      icon.svgMarkup = iconData.svgMarkup || '';
      renderAnnotations();
      renderSidebar();
      if (typeof renderLayersPanel === 'function') renderLayersPanel();
      scheduleSaveToLocalStorage();
    } else if (createAt) {
      pushUndo();
      const icon = createIconAnnotationObject(createAt.x, createAt.y, iconData);
      state.icons.push(icon);
      appendCanvasOrderEntry('icon', icon.id);
      selectIcon(icon.id);
      render();
      scheduleSaveToLocalStorage();
    }
    closeBasicModal();
  };

  search.addEventListener('input', () => {
    grid.innerHTML = renderGrid(search.value);
  });
  grid.addEventListener('click', e => {
    const btn = e.target.closest('.icon-picker-item[data-icon-key]');
    if (!btn) return;
    const icon = getBuiltinIconDefinition(btn.dataset.iconKey);
    if (!icon) return;
    applyIconSelection({ iconKey: icon.key, iconTitle: icon.title, svgMarkup: icon.svg });
  });
  importBtn.addEventListener('click', () => importInput.click());
  importInput.onchange = ev => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loadEvent => {
      const sanitized = sanitizeImportedIconSvg(String(loadEvent.target?.result || ''));
      if (!sanitized) {
        setStatusModeMessage('SVG import failed', { fade: true, autoClearMs: 1800, color: 'var(--danger)' });
        return;
      }
      const title = (file.name || 'Custom icon').replace(/\.[^.]+$/, '') || 'Custom icon';
      applyIconSelection({ iconKey: '', iconTitle: title, svgMarkup: sanitized });
    };
    reader.readAsText(file);
  };
  requestAnimationFrame(() => search.focus());
}

document.addEventListener('mousedown', e => {
  if (!_inlineAnnotationEditor) return;
  if (_inlineAnnotationEditor.wrap.contains(e.target)) return;
  closeInlineAnnotationEdit({ save: true });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _inlineAnnotationEditor) {
    closeInlineAnnotationEdit();
  }
});
