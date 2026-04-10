function buildExportHTML(opts) {
  function serializeForScript(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  const exportDoc = typeof getDiagramDocumentPayload === 'function'
    ? getDiagramDocumentPayload()
    : {
        title: document.getElementById('diagram-title-input')?.value || 'System Map',
        subtitle: document.getElementById('diagram-subtitle-input')?.value || '',
        rootDiagramId: 'diagram-main',
        activeDiagramId: 'diagram-main',
        diagrams: [{
          id: 'diagram-main',
          title: document.getElementById('diagram-title-input')?.value || 'System Map',
          subtitle: document.getElementById('diagram-subtitle-input')?.value || '',
          state: cloneDiagramData(state),
          viewport: { scale, panX, panY }
        }]
      };
  const diagramLookup = new Map((exportDoc.diagrams || []).map(diagram => [String(diagram.id), diagram]));
  const rootDiagram = diagramLookup.get(String(exportDoc.rootDiagramId)) || exportDoc?.diagrams?.[0] || null;
  const originalState = state;
  const title = rootDiagram?.title || document.getElementById('diagram-title-input').value;
  const subtitle = rootDiagram?.subtitle || document.getElementById('diagram-subtitle-input').value;
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);

  function getExportNodeType(type) {
    return type === 'external' || type === 'boundary' ? type : 'internal';
  }

  function getExportArrowStrokeStyle(arr) {
    if (typeof arr?.strokeStyle === 'string' && arr.strokeStyle) return arr.strokeStyle;
    return arr?.dash ? 'dashed' : 'solid';
  }

  function getExportArrowDasharray(arr) {
    switch (getExportArrowStrokeStyle(arr)) {
      case 'dashed': return '6 3';
      case 'dotted': return '1.5 4';
      case 'dashdot': return '8 3 1.5 3';
      case 'longdash': return '12 4';
      default: return '';
    }
  }

  // Capture live CSS variable values so the export is pixel-perfect
  const cs = getComputedStyle(document.documentElement);
  const cssVars = [
    '--bg','--surface','--surface2','--surface3',
    '--border','--border2',
    '--accent','--accent2','--accent3',
    '--text','--text2','--text3',
    '--node-internal','--node-internal-border','--node-internal-edge',
    '--node-external','--node-external-border','--node-external-edge',
    '--arrow-color','--label-bg',
    '--io-input-bg','--io-input-border','--io-input-text',
    '--io-output-bg','--io-output-border','--io-output-text',
    '--shadow','--radius'
  ].map(v => v + ':' + cs.getPropertyValue(v).trim()).join(';');

  function renderCurrentStateForExport(diagram) {
    const nodes = state.nodes;
    const arrows = state.arrows;
    const labels = state.labels || [];
    const icons = state.icons || [];

    function estimateExportHeight(n) {
      if (n.type === 'boundary') return n.h;
      let h = 14 + 4;
      if (n.tag) h += 16;
      h += 20;
      if (n.title && n.title.includes('\n')) h += 16 * (n.title.split('\n').length - 1);
      if (n.subtitle) h += 18;
      const fns = (n.functions || []).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim() && !f.hidden);
      if (fns.length) {
        h += 14 + 8;
        fns.forEach(f => {
          h += 22;
          const hidIn = f.hiddenInputs || [];
          const hidOut = f.hiddenOutputs || [];
          const ins = (Array.isArray(f.inputs) ? f.inputs : (f.inputs ? [f.inputs] : [])).filter((_, i) => !hidIn.includes(i));
          const outs = (Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : [])).filter((_, i) => !hidOut.includes(i));
          if (ins.length) h += 22;
          if (outs.length) h += 22;
        });
      }
      h += 14;
      return Math.max(n.h, h);
    }

    const estimatedHeights = {};
    nodes.forEach(n => { estimatedHeights[n.id] = estimateExportHeight(n); });
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodes.forEach(n => {
      const h = estimatedHeights[n.id];
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + h);
    });
    labels.forEach(label => {
      const width = Math.max(40, (String(label.text || 'Label').split('\n').reduce((max, line) => Math.max(max, line.length), 0) * ((label.fontWeight || 600) >= 600 ? 9 : 8)) + 20);
      const height = (Math.max(1, String(label.text || 'Label').split('\n').length) * ((label.fontSize || 16) + 5)) + 12;
      minX = Math.min(minX, label.x);
      minY = Math.min(minY, label.y);
      maxX = Math.max(maxX, label.x + width);
      maxY = Math.max(maxY, label.y + height);
    });
    icons.forEach(icon => {
      const size = Math.max(20, Number(icon.size) || 40);
      minX = Math.min(minX, icon.x);
      minY = Math.min(minY, icon.y);
      maxX = Math.max(maxX, icon.x + size);
      maxY = Math.max(maxY, icon.y + size);
    });
    if (!nodes.length) {
      minX = 0;
      minY = 0;
      maxX = 1200;
      maxY = 800;
    }
    const pad = 60;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    const W = maxX - minX;
    const H = maxY - minY;

    function getPortXYE(n, pos, offset) {
      const h = estimatedHeights[n.id] || n.h;
      return getPortXY(n, pos, offset, h);
    }

    let svgArrows = '';
    const ePortGroups = {};
    arrows.forEach(a => {
      const fk = a.from + ':' + (a.fromPos || 'e');
      const tk = a.to + ':' + (a.toPos || 'w');
      if (!ePortGroups[fk]) ePortGroups[fk] = [];
      if (!ePortGroups[tk]) ePortGroups[tk] = [];
      if (getArrowEndOffset(a, 'from') === null) ePortGroups[fk].push(a.id + ':from');
      if (getArrowEndOffset(a, 'to') === null) ePortGroups[tk].push(a.id + ':to');
    });
    const ePortPerp = { n: { x: 1, y: 0 }, s: { x: 1, y: 0 }, e: { x: 0, y: 1 }, w: { x: 0, y: 1 } };
    const E_STAGGER = 8;
    function staggeredPortXYE(node, pos, arrowId, end, manualOffset) {
      if (manualOffset !== null) return getPortXYE(node, pos, manualOffset);
      const base = getPortXYE(node, pos);
      const key = node.id + ':' + pos;
      const token = arrowId + ':' + end;
      const group = ePortGroups[key] || [];
      if (group.length <= 1) return base;
      const idx = group.indexOf(token);
      if (idx === -1) return base;
      const total = group.length;
      const offset = (idx - (total - 1) / 2) * E_STAGGER;
      const perp = ePortPerp[pos] || { x: 1, y: 0 };
      return { x: base.x + perp.x * offset, y: base.y + perp.y * offset };
    }

    function makeExportMarker(id, color, forStart) {
      return `<marker id="${id}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="${forStart ? 'auto-start-reverse' : 'auto'}"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker>`;
    }
    const exportArrowColor = cs.getPropertyValue('--arrow-color').trim() || '#ff8c42';

    getSortedArrowLayerEntries().forEach(entry => {
      const a = entry.arrow;
      const fn = nodes.find(x => x.id === a.from);
      const tn = nodes.find(x => x.id === a.to);
      if (!fn || !tn) return;
      const color = a.color || exportArrowColor;
      const p1 = staggeredPortXYE(fn, a.fromPos || 'e', a.id, 'from', getArrowEndOffset(a, 'from'));
      const p2 = staggeredPortXYE(tn, a.toPos || 'w', a.id, 'to', getArrowEndOffset(a, 'to'));
      const { d: d2, lx: _elx, ly: _ely } = buildArrowPath(p1, p2, a.fromPos || 'e', a.toPos || 'w', a.bend || 0, a.lineStyle || 'curved', minX, minY, a.orthoY || 0);
      let mEnd = '';
      let mStart = '';
      if (a.direction === 'directed') mEnd = `marker-end="url(#emf-${a.id})"`;
      else if (a.direction === 'bidirectional') {
        mEnd = `marker-end="url(#emf-${a.id})"`;
        mStart = `marker-start="url(#emb-${a.id})"`;
      }
      const dashArray = getExportArrowDasharray(a);
      const dash = dashArray ? `stroke-dasharray="${dashArray}"` : '';
      const arrowZ = getRenderedArrowLayerValue(a);
      let arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;overflow:visible;pointer-events:none;z-index:${arrowZ};" width="${W}" height="${H}">`;
      arrowSvg += `<defs>${makeExportMarker('emf-' + a.id, color, false)}${makeExportMarker('emb-' + a.id, color, true)}</defs>`;
      arrowSvg += `<path d="${d2}" fill="none" stroke="${color}" stroke-width="1.5" ${mEnd} ${mStart} ${dash}/>`;
      if (a.label) {
        const lx = _elx + (a.labelOffsetX || 0);
        const ly = _ely + (a.labelOffsetY || 0);
        const eLines = a.label.split('\n').map(line => escapeHtml(line));
        const eFontSize = 11;
        const eLineH = eFontSize + 4;
        const eTotalH = eLines.length * eLineH;
        const eMaxW = Math.max(...eLines.map(l => l.length)) * (a.labelBold ? 7 : 6.5);
        const eFill = a.labelColor || '#9aa0b8';
        const eFW = a.labelBold ? '600' : '400';
        const eFS = a.labelItalic ? 'italic' : 'normal';
        arrowSvg += `<rect x="${lx - eMaxW / 2 - 5}" y="${ly - eTotalH / 2 - 5}" width="${eMaxW + 10}" height="${eTotalH + 8}" rx="4" fill="var(--surface)" stroke="var(--border)" stroke-width="1"/>`;
        const tspans = eLines.map((l, i) => `<tspan x="${lx}" dy="${i === 0 ? 0 : eLineH}">${l}</tspan>`).join('');
        arrowSvg += `<text x="${lx}" y="${ly - (eLines.length - 1) * eLineH / 2}" fill="${eFill}" font-size="${eFontSize}" font-weight="${eFW}" font-style="${eFS}" font-family="IBM Plex Sans,sans-serif" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
      }
      arrowSvg += '</svg>';
      svgArrows += arrowSvg;
    });

    const nodeDetailData = {};
    nodes.filter(n => n.type !== 'boundary').forEach(n => {
      const fns = (n.functions || []).filter(f => {
        const nm = typeof f === 'string' ? f : (f.name || '');
        return nm.trim() && !f.hidden;
      });
      const hasFnDetail = fns.some(f => f.description || (f.inputs && f.inputs.length) || (f.outputs && f.outputs.length) || f.owner || f.trigger || f.system);
      const hasNotes = n.notes && n.notes.trim();
      if (!hasFnDetail && !hasNotes) return;
      nodeDetailData[n.id] = {
        tag: n.tag || '',
        title: n.title.replace(/\n/g, ' '),
        type: n.type,
        notes: n.notes || '',
        functions: fns.map(f => ({
          name: f.name || f || '',
          desc: f.description || '',
          inputs: Array.isArray(f.inputs) ? f.inputs : (f.inputs ? [f.inputs] : []),
          outputs: Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : []),
          owner: f.owner || '',
          trigger: f.trigger || '',
          system: f.system || ''
        }))
      };
    });

    let nodeHtml = '';
    getSortedNodeLayerEntries().forEach(entry => {
      const n = entry.node;
      const hasDetail = !!nodeDetailData[n.id];
      const linkedDiagram = n.linkedDiagramId ? diagramLookup.get(String(n.linkedDiagramId)) : null;
      const nodeType = getExportNodeType(n.type);
      const op = n.colorOpacity !== undefined ? n.colorOpacity : 51;
      const opHex = op.toString(16).padStart(2,'0');
      const colorStyle = n.color ? `background:${n.color}${opHex};` : '';
      const detailBtn = hasDetail && n.type !== 'boundary'
        ? `<button type="button" class="detail-btn" data-node-detail-id="${escapeHtml(String(n.id))}" aria-label="Open more detail for ${escapeHtml((n.title || n.tag || 'Untitled node').replace(/\n/g, ' '))}">More detail</button>`
        : '';
      const linkChip = linkedDiagram
        ? `<button type="button" class="linked-diagram-chip" data-linked-diagram-id="${escapeHtml(String(linkedDiagram.id))}" aria-label="Open linked diagram: ${escapeHtml(linkedDiagram.title || 'Untitled diagram')}">Linked diagram</button>`
        : '';

    let innerHtml = '';
    if (n.type === 'boundary') {
      innerHtml = `<div class="node-inner">`
        + (n.title ? `<div class="node-title">${escapeHtml(n.title)}</div>` : '')
        + (n.subtitle ? `<div class="node-boundary-sub" style="${n.subtitleColor ? 'color:'+n.subtitleColor+';' : (n.textColor ? 'color:'+n.textColor+';' : '')}">${escapeHtml(n.subtitle)}</div>` : '')
        + `</div>`;
    } else {
      // Always render exactly what the canvas shows - visibility controlled in editor
      const tc = n.textColor ? `color:${n.textColor};` : '';
      const inSt = [n.ioInputBg&&`background:${n.ioInputBg}`, n.ioInputBorder&&`border-color:${n.ioInputBorder}`, n.ioInputText&&`color:${n.ioInputText}`].filter(Boolean).join(';');
      const outSt = [n.ioOutputBg&&`background:${n.ioOutputBg}`, n.ioOutputBorder&&`border-color:${n.ioOutputBorder}`, n.ioOutputText&&`color:${n.ioOutputText}`].filter(Boolean).join(';');
      const fnItems = (() => {
        const fns2 = (n.functions||[]).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim() && !f.hidden);
        if (!fns2.length) return '';
        const items = fns2.map(f => {
          const name = escapeHtml(typeof f === 'string' ? f : (f.name || ''));
          const hidIn  = f.hiddenInputs  || [];
          const hidOut = f.hiddenOutputs || [];
          const ins  = (Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : [])).filter((_,i) => !hidIn.includes(i));
          const outs = (Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : [])).filter((_,i) => !hidOut.includes(i));
          let ioHtml = '';
          if (ins.length)  ioHtml += `<div class="node-io-wrap">${ins.map(v=>`<span class="node-io-pill input" ${inSt?`style="${inSt}"`:''}><span class="io-pill-prefix">IN</span>${escapeHtml(v)}</span>`).join('')}</div>`;
          if (outs.length) ioHtml += `<div class="node-io-wrap">${outs.map(v=>`<span class="node-io-pill output" ${outSt?`style="${outSt}"`:''}><span class="io-pill-prefix">OUT</span>${escapeHtml(v)}</span>`).join('')}</div>`;
          return `<div class="node-fn-item" style="${n.fnTextColor ? 'color:'+n.fnTextColor+';' : tc}">${name}</div>${ioHtml}`;
        }).join('');
        return `<div class="node-functions"><div class="node-functions-label" style="${n.fnLabelColor ? 'color:'+n.fnLabelColor+';' : tc}">Functions</div>${items}</div>`;
      })();
      innerHtml = `<div class="node-inner" style="padding-right:${hasDetail?'26px':'14px'};">`
        + (n.tag ? `<div class="node-tag" style="${n.tagColor ? 'color:'+n.tagColor+';' : tc}">${escapeHtml(n.tag)}</div>` : '')
        + `<div class="node-title" style="${tc}">${escapeHtml(n.title)}</div>`
        + (n.subtitle ? `<div class="node-subtitle" style="${n.subtitleColor ? 'color:'+n.subtitleColor+';' : tc}">${escapeHtml(n.subtitle)}</div>` : '')
        + linkChip
        + fnItems
        + `</div>`;
    }

      const zStyle = `z-index:${getRenderedNodeLayerValue(n, entry.index)};`;
      const clickAttr = (n.type !== 'boundary' && hasDetail && !linkedDiagram) ? `style="position:absolute;left:${n.x-minX}px;top:${n.y-minY}px;width:${n.w}px;min-height:${n.h}px;${zStyle}${colorStyle}cursor:pointer;" data-click-detail="1"` : `style="position:absolute;left:${n.x-minX}px;top:${n.y-minY}px;width:${n.w}px;min-height:${n.h}px;${zStyle}${colorStyle}" data-click-detail="0"`;
      nodeHtml += `<div class="node ${nodeType}${linkedDiagram ? ' has-linked-diagram' : ''}" data-node-id="${escapeHtml(String(n.id))}" ${clickAttr}>${innerHtml}${detailBtn}</div>`;
    });

    let annotationHtml = '';
    labels.forEach(label => {
      const lines = String(label.text || 'Label').split('\n').map(line => escapeHtml(line));
      const backgroundStyle = label.backgroundStyle === 'soft' ? 'fill' : (label.backgroundStyle || 'none');
      const fillColor = label.fillColor || 'var(--surface)';
      const textCss = [
        label.textColor ? `color:${label.textColor}` : '',
        `font-size:${label.fontSize || 16}px`,
        `font-weight:${label.fontWeight || 600}`,
        `font-style:${label.fontStyle || 'normal'}`
      ].filter(Boolean).join(';');
      const style = [
        `left:${label.x - minX}px`,
        `top:${label.y - minY}px`,
        `z-index:${getRenderedLabelLayerValue(label)}`,
        `opacity:${label.opacity ?? 1}`,
        `background:${backgroundStyle === 'fill' ? fillColor : 'transparent'}`,
        `border-color:${backgroundStyle === 'fill' ? 'var(--border)' : 'transparent'}`
      ].join(';');
      annotationHtml += `<div class="canvas-annotation annotation-label" style="${style}"><div class="annotation-label-text" style="${textCss}">${lines.join('<br>')}</div></div>`;
    });
    icons.forEach(icon => {
      const size = Math.max(20, Number(icon.size) || 40);
      const backgroundStyle = icon.backgroundStyle === 'soft' ? 'fill' : (icon.backgroundStyle || 'none');
      const fillColor = icon.fillColor || 'var(--surface)';
      const style = [
        `left:${icon.x - minX}px`,
        `top:${icon.y - minY}px`,
        `width:${size}px`,
        `height:${size}px`,
        `z-index:${getRenderedIconLayerValue(icon)}`,
        `opacity:${icon.opacity ?? 1}`,
        `color:${icon.color || 'var(--text2)'}`,
        `background:${backgroundStyle === 'fill' ? fillColor : 'transparent'}`,
        `border-color:${backgroundStyle === 'fill' ? 'var(--border)' : 'transparent'}`
      ].join(';');
      annotationHtml += `<div class="canvas-annotation annotation-icon" style="${style}"><div class="annotation-icon-glyph">${sanitizeImportedIconSvg(icon.svgMarkup || '') || getBuiltinIconDefinition(icon.iconKey)?.svg || ''}</div></div>`;
    });

    return {
      id: String(diagram.id),
      title: diagram.title || 'Untitled diagram',
      subtitle: diagram.subtitle || '',
      markup: `<div class="diagram" style="width:${W}px;height:${H}px;">${nodeHtml}${annotationHtml}${svgArrows}</div>`,
      detailData: nodeDetailData,
      width: W,
      height: H,
      minX,
      minY,
      viewport: diagram?.viewport || null
    };
  }

  const renderedDiagrams = {};
  (exportDoc.diagrams || []).forEach(diagram => {
    state = cloneDiagramData(diagram.state || { nodes: [], arrows: [], canvasOrder: [] });
    if (typeof normalizeCanvasOrder === 'function') normalizeCanvasOrder();
    renderedDiagrams[String(diagram.id)] = renderCurrentStateForExport(diagram);
  });
  state = originalState;
  const rootRendered = renderedDiagrams[String(rootDiagram?.id || exportDoc.rootDiagramId)] || Object.values(renderedDiagrams)[0];
  const renderedDiagramsJson = serializeForScript(renderedDiagrams);
  const exportDocJson = serializeForScript({
    rootDiagramId: String(exportDoc.rootDiagramId || rootDiagram?.id || ''),
    diagrams: (exportDoc.diagrams || []).map(diagram => ({
      id: String(diagram.id),
      title: diagram.title || 'Untitled diagram',
      subtitle: diagram.subtitle || '',
      state: cloneDiagramData(diagram.state || { nodes: [], arrows: [], canvasOrder: [] })
    }))
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
:root{${cssVars}}
body{background:var(--bg);font-family:'Inter',sans-serif;display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;}
#export-header{position:relative;flex-shrink:0;padding:12px 14px;background:var(--surface);border-bottom:1px solid var(--border);border-top:2px solid var(--accent);display:flex;flex-direction:column;gap:10px;z-index:40;box-shadow:0 1px 3px rgba(0,0,0,0.06);}
#export-header-title{min-height:32px;}
#export-header-title h1{font-size:13px;font-weight:600;color:var(--text);letter-spacing:-0.02em;}
#export-header-title p{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text3);margin-top:3px;}
#export-diagram-nav{display:flex;flex-wrap:wrap;align-items:center;gap:8px;width:fit-content;max-width:calc(100% - 28px);padding:7px 10px;border:1px solid var(--border);border-radius:14px;background:color-mix(in srgb, var(--surface) 94%, transparent);box-shadow:0 8px 24px rgba(0,0,0,0.06);}
#export-diagram-nav[hidden]{display:none;}
.export-nav-controls{display:flex;align-items:center;gap:8px;}
.export-nav-divider{width:1px;align-self:stretch;min-height:22px;background:var(--border);margin:1px 2px;}
.export-nav-btn,.export-crumb{min-height:24px;padding:4px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--text2);font-size:9px;font-family:'IBM Plex Mono',monospace;font-weight:500;cursor:pointer;white-space:nowrap;transition:all 0.12s;}
.export-nav-btn:hover:not(:disabled),.export-crumb:hover:not(:disabled){border-color:var(--border2);color:var(--text);background:var(--surface3);}
.export-nav-btn:disabled,.export-crumb:disabled{opacity:0.45;cursor:default;}
#export-breadcrumbs{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-width:0;}
.export-menu-wrap{position:relative;}
#export-diagram-menu{position:absolute;top:calc(100% + 8px);left:0;right:auto;min-width:240px;max-width:min(360px,calc(100vw - 32px));max-height:320px;overflow:auto;padding:6px;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:4px;z-index:60;}
#export-diagram-menu[hidden]{display:none;}
.export-diagram-menu-item{border:1px solid transparent;background:transparent;color:var(--text2);border-radius:6px;padding:8px 10px;text-align:left;font-size:10px;font-family:'IBM Plex Mono',monospace;cursor:pointer;transition:all 0.12s;}
.export-diagram-menu-item:hover:not(:disabled){background:var(--surface2);border-color:var(--border);color:var(--text);}
.export-diagram-menu-item:disabled{background:var(--surface2);border-color:var(--border);color:var(--text);cursor:default;}
.export-diagram-menu-title{display:flex;align-items:center;gap:6px;min-width:0;}
.export-diagram-menu-title-text{font-size:10px;font-weight:600;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.export-diagram-menu-meta{margin-top:4px;font-size:9px;color:var(--text3);line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.export-diagram-menu-badge{padding:2px 5px;border-radius:999px;background:var(--surface3);color:var(--text3);font-size:8px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;flex-shrink:0;}
.export-diagram-menu-badge.root{background:var(--accent-soft);color:var(--accent3);}
.export-diagram-menu-badge.current{background:var(--surface3);color:var(--text2);}
.export-nav-manager-btn{color:var(--text);border-color:var(--border);background:color-mix(in srgb, var(--surface2) 88%, transparent);}
.export-nav-arrow-btn{min-width:36px;min-height:28px;padding:1px 0 3px;justify-content:center;font-size:17px;font-weight:700;line-height:1;}
.export-crumb.active{color:var(--text);font-weight:600;background:color-mix(in srgb, var(--surface2) 88%, transparent);border-color:var(--border2);}
.export-crumb-sep{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text3);margin:0 -2px;}
/* Canvas viewport */
#viewport{flex:1;overflow:hidden;position:relative;cursor:grab;}
#viewport.panning{cursor:grabbing;}
#canvas-root{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;}
.diagram{position:relative;}
/* Grid */
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px;opacity:0.22;pointer-events:none;z-index:0;}
/* Nodes */
.node{position:absolute;border-radius:var(--radius);cursor:default;min-width:120px;z-index:3;}
.node.internal{background:var(--node-internal);border:1px solid var(--node-internal-edge);border-left:3px solid var(--node-internal-border);box-shadow:var(--shadow);}
.node.external{background:var(--node-external);border:1px solid var(--node-external-edge);border-left:3px dashed var(--node-external-border);box-shadow:var(--shadow);}
.node.boundary{background:transparent;border:1px dashed var(--border2);box-shadow:none;z-index:1;}
.node-inner{padding:12px 14px;}
.node.boundary .node-inner{padding:10px 14px;}
.node-tag{font-family:'IBM Plex Mono',monospace;font-size:8.5px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:5px;}
.node-title{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--text);margin-bottom:3px;line-height:1.35;letter-spacing:-0.02em;white-space:pre-line;}
.node.boundary .node-title{font-size:11px;color:var(--text3);font-weight:600;font-family:'IBM Plex Mono',monospace;letter-spacing:0.06em;text-transform:uppercase;white-space:pre-line;}
.node-subtitle{font-family:'Inter',sans-serif;font-size:10px;color:var(--text2);line-height:1.45;font-weight:400;white-space:pre-line;}
.node-boundary-sub{font-size:10px;color:var(--text3);font-weight:400;font-family:'IBM Plex Sans',sans-serif;margin-top:2px;opacity:0.8;}
.node-functions{margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:7px;}
.node-functions-label{font-family:'IBM Plex Mono',monospace;font-size:7.5px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:5px;opacity:0.7;}
.node-fn-item{display:flex;align-items:center;gap:6px;padding:1.5px 0;font-family:'Inter',sans-serif;font-size:10px;color:var(--text2);line-height:1.4;}
.node-fn-item::before{content:'';width:3px;height:3px;border-radius:50%;background:var(--accent3);flex-shrink:0;opacity:0.6;}
.node.external .node-fn-item::before{background:var(--accent2);}
.node-io-wrap{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px;margin-bottom:1px;}
.node-io-pill{padding:1px 6px;border-radius:10px;font-size:8.5px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.02em;}
.io-pill-prefix{font-family:'IBM Plex Mono',monospace;font-size:0.95em;font-weight:600;letter-spacing:0.08em;margin-right:0.45em;}
.node-io-pill.input{background:var(--io-input-bg);border:1px solid var(--io-input-border);color:var(--io-input-text);}
.node-io-pill.output{background:var(--io-output-bg);border:1px solid var(--io-output-border);color:var(--io-output-text);}
/* Detail trigger button */
.detail-btn{position:absolute;top:8px;right:8px;border:1px solid var(--accent3);border-radius:999px;background:var(--surface);color:var(--accent2);font-size:9px;font-family:'IBM Plex Mono',monospace;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px 9px;opacity:0.9;transition:opacity 0.15s,background 0.15s,border-color 0.15s,color 0.15s;white-space:nowrap;}
.detail-btn:hover{opacity:1;background:var(--surface2);border-color:var(--accent2);color:var(--text);}
    .linked-diagram-chip{position:relative;align-self:flex-start;margin-top:9px;border:1px solid var(--border2);border-radius:999px;padding:4px 10px;background:var(--surface2);color:var(--text2);font-size:9px;font-family:'IBM Plex Mono',monospace;letter-spacing:0.04em;cursor:pointer;transition:all 0.12s;max-width:100%;}
    .linked-diagram-chip:hover{border-color:var(--accent2);color:var(--text);background:var(--surface3);}
.canvas-annotation{position:absolute;user-select:none;}
.annotation-label{min-width:28px;max-width:300px;padding:6px 10px;border:1px solid transparent;border-radius:10px;color:var(--text2);line-height:1.35;white-space:pre-wrap;}
.annotation-label-text{font-family:'Inter',sans-serif;font-size:16px;font-weight:600;color:inherit;}
.annotation-icon{min-width:24px;min-height:24px;border:1px solid transparent;border-radius:12px;display:flex;align-items:center;justify-content:center;color:var(--text2);}
.annotation-icon-glyph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
.annotation-icon-glyph svg{width:100%;height:100%;overflow:visible;}
/* Zoom controls */
#zoom-hud{position:fixed;bottom:16px;right:16px;display:flex;flex-direction:column;gap:4px;z-index:20;}
.zoom-hud-btn{width:28px;height:28px;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text2);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.12s;font-family:'IBM Plex Mono',monospace;}
.zoom-hud-btn:hover{border-color:var(--border2);color:var(--text);background:var(--surface2);}
#zoom-label{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text3);text-align:center;padding:3px 0;}
/* Legend */
#legend-wrap{position:fixed;bottom:16px;left:16px;z-index:20;}
.legend{display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;background:var(--surface);backdrop-filter:blur(8px);border:1px solid var(--border);border-radius:7px;}
.legend-item{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text2);font-family:'IBM Plex Mono',monospace;}
.legend-box{width:18px;height:12px;border-radius:2px;}
.legend-line{width:24px;height:2px;}
/* Help tip */
#help-hud{position:fixed;top:120px;left:16px;background:var(--surface);border:1px solid var(--border);backdrop-filter:blur(8px);border-radius:6px;padding:7px 11px;font-size:9.5px;color:var(--text3);z-index:20;line-height:1.75;font-family:'IBM Plex Mono',monospace;max-width:min(420px,calc(100vw - 32px));}
#help-hud b{color:var(--text2);font-weight:500;}
/* Detail panel */
#detail-overlay{position:fixed;inset:0;background:#00000060;z-index:1000;display:none;backdrop-filter:blur(2px);}
#detail-overlay.open{display:block;}
#detail-panel{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:96vw;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;z-index:1001;transform:translateX(100%);transition:transform 0.22s cubic-bezier(0.16,1,0.3,1);box-shadow:-12px 0 40px #00000080;}
#detail-panel.open{transform:translateX(0);}
#dp-header{padding:18px 18px 14px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:flex-start;gap:10px;}
#dp-header-text{flex:1;}
#dp-tag{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:4px;}
#dp-title{font-size:15px;font-weight:600;color:var(--text);line-height:1.3;}
#dp-close{width:26px;height:26px;border-radius:5px;background:transparent;border:1px solid transparent;color:var(--text3);cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
#dp-close:hover{background:var(--surface2);border-color:var(--border);color:var(--text);}
#dp-body{flex:1;overflow-y:auto;padding:16px 18px;}
.dp-section{margin-bottom:20px;}
.dp-section-label{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--text3);margin-bottom:8px;}
.dp-notes{font-size:12px;color:var(--text2);line-height:1.65;white-space:pre-wrap;}
.dp-fn{border:1px solid var(--border);border-radius:7px;margin-bottom:8px;overflow:hidden;}
.dp-fn-header{padding:9px 12px;background:var(--surface2);cursor:pointer;display:flex;align-items:center;gap:8px;user-select:none;}
.dp-fn-header:hover{background:var(--surface3);}
.dp-fn-name{font-size:12px;font-weight:500;color:var(--text);flex:1;}
.dp-fn-chevron{font-size:10px;color:var(--text3);transition:transform 0.15s;flex-shrink:0;}
.dp-fn.open .dp-fn-chevron{transform:rotate(180deg);}
.dp-fn-body{display:none;padding:10px 12px;border-top:1px solid var(--border);}
.dp-fn.open .dp-fn-body{display:block;}
.dp-fn-desc{font-size:11px;color:var(--text2);line-height:1.6;margin-bottom:8px;}
.dp-io-row{display:flex;gap:8px;margin-bottom:6px;}
.dp-io-label{font-family:'IBM Plex Mono',monospace;font-size:9px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text3);width:52px;flex-shrink:0;padding-top:2px;}
.dp-pills{display:flex;flex-wrap:wrap;gap:4px;}
.dp-pill-in{padding:2px 8px;border-radius:10px;font-size:10px;background:var(--io-input-bg);border:1px solid var(--io-input-border);color:var(--io-input-text);}
.dp-pill-out{padding:2px 8px;border-radius:10px;font-size:10px;background:var(--io-output-bg);border:1px solid var(--io-output-border);color:var(--io-output-text);}
.dp-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.dp-meta-chip{padding:2px 8px;border-radius:4px;font-size:10px;background:var(--surface3);color:var(--text3);font-family:'IBM Plex Mono',monospace;}
.dp-empty{font-size:11px;color:var(--text3);font-style:italic;}
</style>
</head>
<body>
${opts.showGrid ? '<div class="grid-bg"></div>' : ''}
<div id="detail-overlay" onclick="closeDetail()"></div>
<div id="detail-panel">
  <div id="dp-header">
    <div id="dp-header-text">
      <div id="dp-tag"></div>
      <div id="dp-title"></div>
    </div>
    <button id="dp-close" onclick="closeDetail()" aria-label="Close detail panel">&times;</button>
  </div>
  <div id="dp-body"></div>
</div>
<div id="export-header">
  <div id="export-header-title">
    <h1 id="export-title">${safeTitle}</h1>
    <p id="export-subtitle"${subtitle ? '' : ' hidden'}>${safeSubtitle}</p>
  </div>
  <div id="export-diagram-nav" hidden>
    <div class="export-menu-wrap">
      <button type="button" id="export-diagram-menu-toggle" class="export-nav-btn export-nav-manager-btn">Diagrams</button>
      <div id="export-diagram-menu" hidden></div>
    </div>
    <span class="export-nav-divider"></span>
    <div class="export-nav-controls">
      <button type="button" id="export-nav-back" class="export-nav-btn export-nav-arrow-btn" aria-label="Back">&#8592;</button>
      <button type="button" id="export-nav-forward" class="export-nav-btn export-nav-arrow-btn" aria-label="Forward">&#8594;</button>
    </div>
    <span class="export-nav-divider"></span>
    <div id="export-breadcrumbs"></div>
  </div>
</div>
<div id="viewport">
  <div id="canvas-root">${rootRendered?.markup || ''}</div>
</div>
<div id="zoom-hud">
  <button class="zoom-hud-btn" onclick="zoomBy(1.2)">+</button>
  <div id="zoom-label">100%</div>
  <button class="zoom-hud-btn" onclick="zoomBy(1/1.2)">&minus;</button>
  <button class="zoom-hud-btn" onclick="resetView()" style="font-size:11px;">&#8998;</button>
</div>
<div id="help-hud"><b>Scroll</b> to zoom &middot; <b>Drag</b> to pan &middot; Use <b>Diagrams</b>, <b>Linked diagram</b>, and <b>More detail</b> to move between diagrams and context</div>
  ${opts.showLegend ? `<div id="legend-wrap"><div class="legend">
    <div class="legend-item"><svg width="18" height="12" style="flex-shrink:0"><rect x="1" y="1" width="16" height="10" rx="2" fill="var(--node-internal)" stroke="var(--node-internal-border)" stroke-width="1.5"/></svg>Internal system</div>
    <div class="legend-item"><svg width="18" height="12" style="flex-shrink:0"><rect x="1" y="1" width="16" height="10" rx="2" fill="var(--node-external)" stroke="var(--node-external-border)" stroke-width="1.5" stroke-dasharray="4 2"/></svg>External entity</div>
    <div class="legend-item"><div class="legend-box" style="background:transparent;border:1.5px dashed var(--border2);"></div>Label / boundary</div>
    <div class="legend-item"><svg width="18" height="12" style="flex-shrink:0"><circle cx="9" cy="6" r="3.2" fill="none" stroke="var(--text2)" stroke-width="1.5"/></svg>Icon annotation</div>
    <div class="legend-item"><div class="legend-line" style="background:var(--accent);border-radius:1px;"></div>Connection</div>
  </div>` : ''}
<footer style="position:fixed;bottom:4px;right:16px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--text3);z-index:5;">Conduit v1.4 &middot; Full draft export &middot; ${new Date().toLocaleDateString()}</footer>
</div>
<scr\u0069pt>
const _exportDoc = ${exportDocJson};
const _renderedDiagrams = ${renderedDiagramsJson};
const _vp = document.getElementById('viewport');
const _cr = document.getElementById('canvas-root');
const _titleEl = document.getElementById('export-title');
const _subtitleEl = document.getElementById('export-subtitle');
const _navEl = document.getElementById('export-diagram-nav');
const _crumbsEl = document.getElementById('export-breadcrumbs');
const _backBtn = document.getElementById('export-nav-back');
const _forwardBtn = document.getElementById('export-nav-forward');
const _menuToggleBtn = document.getElementById('export-diagram-menu-toggle');
const _menuEl = document.getElementById('export-diagram-menu');
let _activeDiagramId = _exportDoc.rootDiagramId;
let _diagramBackStack = [];
let _diagramForwardStack = [];
let _menuOpen = false;
let _dW = ${rootRendered?.width || 1200};
let _dH = ${rootRendered?.height || 800};
let _sc = 1, _px = 0, _py = 0;
let _mp = false, _ms = {x:0,y:0}, _mps = {x:0,y:0}, _mMoved = false;
function escapeHtml(value){return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function getRenderedDiagram(id){return _renderedDiagrams[String(id)] || null;}
function getDiagramRecord(id){return (_exportDoc.diagrams||[]).find(diagram => String(diagram.id)===String(id)) || null;}
function getParentDiagramId(id){const targetId=String(id); const parent=(_exportDoc.diagrams||[]).find(diagram => (Array.isArray(diagram.state?.nodes)?diagram.state.nodes:[]).some(node => String(node.linkedDiagramId||'')===targetId)); return parent ? String(parent.id) : '';}
function getDiagramAncestors(id){const path=[]; const seen=new Set(); let currentId=String(id||''); while(currentId && !seen.has(currentId)){const diagram=getDiagramRecord(currentId); if(!diagram) break; path.unshift(diagram); seen.add(currentId); currentId=getParentDiagramId(currentId);} return path;}
function renderBreadcrumbs(){const ancestors=getDiagramAncestors(_activeDiagramId); const hasMultipleDiagrams=(_exportDoc.diagrams||[]).length>1; _navEl.hidden=!hasMultipleDiagrams && ancestors.length<=1 && _diagramBackStack.length===0 && _diagramForwardStack.length===0; _backBtn.disabled=_diagramBackStack.length===0; _forwardBtn.disabled=_diagramForwardStack.length===0; _crumbsEl.innerHTML=ancestors.map(diagram => { const active=String(diagram.id)===String(_activeDiagramId); return '<button type="button" class="export-crumb'+(active?' active':'')+'" data-diagram-id="'+escapeHtml(diagram.id)+'"'+(active?' disabled':'')+'>'+escapeHtml(diagram.title||'Untitled diagram')+'</button>'; }).join('<span class="export-crumb-sep">/</span>');}
function renderDiagramMenu(){if(!_menuEl || !_menuToggleBtn) return; const diagrams=_exportDoc.diagrams||[]; _menuEl.innerHTML=diagrams.map(diagram => { const id=String(diagram.id); const active=id===String(_activeDiagramId); const isRoot=id===String(_exportDoc.rootDiagramId); const subtitle=diagram.subtitle||''; return '<button type="button" class="export-diagram-menu-item" data-diagram-id="'+escapeHtml(id)+'"'+(active?' disabled':'')+'><div class="export-diagram-menu-title"><span class="export-diagram-menu-title-text">'+escapeHtml(diagram.title||'Untitled diagram')+'</span>'+(isRoot?'<span class="export-diagram-menu-badge root">Root</span>':'')+(active?'<span class="export-diagram-menu-badge current">Current</span>':'')+'</div>'+(subtitle?'<div class="export-diagram-menu-meta">'+escapeHtml(subtitle)+'</div>':'')+'</button>'; }).join(''); _menuToggleBtn.setAttribute('aria-expanded', _menuOpen ? 'true' : 'false'); _menuEl.hidden=!_menuOpen;}
function closeDiagramMenu(){_menuOpen=false; renderDiagramMenu();}
function toggleDiagramMenu(){_menuOpen=!_menuOpen; renderDiagramMenu();}
function updateHeader(diagram){const title=diagram?.title||'Untitled diagram'; const subtitle=diagram?.subtitle||''; _titleEl.textContent=title; document.title=title; _subtitleEl.textContent=subtitle; _subtitleEl.hidden=!subtitle;}
function _applyT(){_cr.style.transform='translate('+_px+'px,'+_py+'px) scale('+_sc+')'; const lbl=document.getElementById('zoom-label'); if(lbl) lbl.textContent=Math.round(_sc*100)+'%';}
function zoomBy(factor,cx,cy){cx=(cx!==undefined?cx:_vp.clientWidth/2); cy=(cy!==undefined?cy:_vp.clientHeight/2); const ns=Math.min(4,Math.max(0.1,_sc*factor)); _px=cx-(cx-_px)*(ns/_sc); _py=cy-(cy-_py)*(ns/_sc); _sc=ns; _applyT();}
function resetView(){const vw=_vp.clientWidth, vh=_vp.clientHeight, pad=60; _sc=Math.min(1,(vw-pad*2)/_dW,(vh-pad*2)/_dH); _px=(vw-_dW*_sc)/2; _py=(vh-_dH*_sc)/2; _applyT();}
function restoreDiagramViewport(diagram){const vp=diagram?.viewport; if(!vp || !Number.isFinite(vp.scale) || !Number.isFinite(vp.panX) || !Number.isFinite(vp.panY)){resetView(); return;} _sc=Math.min(4,Math.max(0.1,vp.scale)); _px=vp.panX+((diagram.minX||0)*_sc); _py=vp.panY+((diagram.minY||0)*_sc); _applyT();}
function renderActiveDiagram(){const diagram=getRenderedDiagram(_activeDiagramId); if(!diagram) return false; closeDetail(); closeDiagramMenu(); _cr.innerHTML=diagram.markup||''; _dW=diagram.width||1200; _dH=diagram.height||800; updateHeader(diagram); renderBreadcrumbs(); renderDiagramMenu(); restoreDiagramViewport(diagram); return true;}
function navigateToDiagram(id,options={}){const targetId=String(id||''); if(!getRenderedDiagram(targetId) || targetId===String(_activeDiagramId)) return false; if(options.pushHistory!==false && _activeDiagramId){_diagramBackStack.push(String(_activeDiagramId)); _diagramForwardStack=[];} _activeDiagramId=targetId; return renderActiveDiagram();}
function navigateBack(){const previousId=_diagramBackStack.pop(); if(!previousId) return false; if(_activeDiagramId) _diagramForwardStack.push(String(_activeDiagramId)); return navigateToDiagram(previousId,{pushHistory:false});}
function navigateForward(){const nextId=_diagramForwardStack.pop(); if(!nextId) return false; if(_activeDiagramId) _diagramBackStack.push(String(_activeDiagramId)); return navigateToDiagram(nextId,{pushHistory:false});}
function openDetail(id){closeDiagramMenu(); const detailMap=getRenderedDiagram(_activeDiagramId)?.detailData || {}; const d=detailMap[String(id)]; if(!d) return; document.getElementById('dp-tag').textContent=d.tag||''; document.getElementById('dp-title').textContent=d.title||''; const body=document.getElementById('dp-body'); body.innerHTML=''; if(d.notes&&d.notes.trim()){const sec=document.createElement('div'); sec.className='dp-section'; const lbl=document.createElement('div'); lbl.className='dp-section-label'; lbl.textContent='Notes'; const txt=document.createElement('div'); txt.className='dp-notes'; txt.textContent=d.notes.trim(); sec.appendChild(lbl); sec.appendChild(txt); body.appendChild(sec);} const fns=(d.functions||[]).filter(f => f.desc || (f.inputs&&f.inputs.length) || (f.outputs&&f.outputs.length) || f.owner || f.trigger || f.system); if(fns.length){const sec=document.createElement('div'); sec.className='dp-section'; const lbl=document.createElement('div'); lbl.className='dp-section-label'; lbl.textContent='Functions'; sec.appendChild(lbl); fns.forEach((f,i)=>{const card=document.createElement('div'); card.className='dp-fn'; const hdr=document.createElement('div'); hdr.className='dp-fn-header'; const nm=document.createElement('div'); nm.className='dp-fn-name'; nm.textContent=f.name||'Untitled'; const chv=document.createElement('div'); chv.className='dp-fn-chevron'; chv.textContent='▾'; hdr.appendChild(nm); hdr.appendChild(chv); hdr.onclick=()=>{card.classList.toggle('open');}; const bdy=document.createElement('div'); bdy.className='dp-fn-body'; if(f.desc){const p=document.createElement('div'); p.className='dp-fn-desc'; p.textContent=f.desc; bdy.appendChild(p);} if(f.inputs&&f.inputs.length){const row=document.createElement('div'); row.className='dp-io-row'; const lbr=document.createElement('div'); lbr.className='dp-io-label'; lbr.textContent='Inputs'; const pills=document.createElement('div'); pills.className='dp-pills'; f.inputs.forEach(v=>{const s=document.createElement('span'); s.className='dp-pill-in'; s.innerHTML='<span class="io-pill-prefix">IN</span>'+escapeHtml(v); pills.appendChild(s);}); row.appendChild(lbr); row.appendChild(pills); bdy.appendChild(row);} if(f.outputs&&f.outputs.length){const row=document.createElement('div'); row.className='dp-io-row'; const lbr=document.createElement('div'); lbr.className='dp-io-label'; lbr.textContent='Outputs'; const pills=document.createElement('div'); pills.className='dp-pills'; f.outputs.forEach(v=>{const s=document.createElement('span'); s.className='dp-pill-out'; s.innerHTML='<span class="io-pill-prefix">OUT</span>'+escapeHtml(v); pills.appendChild(s);}); row.appendChild(lbr); row.appendChild(pills); bdy.appendChild(row);} const metaItems=[f.owner&&('Owner: '+f.owner),f.trigger&&('Trigger: '+f.trigger),f.system&&('System: '+f.system)].filter(Boolean); if(metaItems.length){const meta=document.createElement('div'); meta.className='dp-meta'; metaItems.forEach(m=>{const c=document.createElement('span'); c.className='dp-meta-chip'; c.textContent=m; meta.appendChild(c);}); bdy.appendChild(meta);} card.appendChild(hdr); card.appendChild(bdy); sec.appendChild(card); if(i===0) card.classList.add('open');}); body.appendChild(sec);} if(!body.children.length) body.innerHTML='<div class="dp-empty">No additional detail available.</div>'; document.getElementById('detail-overlay').classList.add('open'); document.getElementById('detail-panel').classList.add('open');}
function closeDetail(){document.getElementById('detail-overlay').classList.remove('open'); document.getElementById('detail-panel').classList.remove('open');}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeDetail(); closeDiagramMenu();}}); document.addEventListener('click',e=>{if(_menuOpen && !e.target.closest('.export-menu-wrap')) closeDiagramMenu();}); _menuToggleBtn?.addEventListener('click',e=>{e.preventDefault(); e.stopPropagation(); toggleDiagramMenu();}); _menuEl?.addEventListener('click',e=>{const item=e.target.closest('.export-diagram-menu-item[data-diagram-id]'); if(!item || item.disabled) return; navigateToDiagram(item.getAttribute('data-diagram-id'));}); _crumbsEl.addEventListener('click',e=>{const crumb=e.target.closest('.export-crumb[data-diagram-id]'); if(!crumb || crumb.disabled) return; navigateToDiagram(crumb.getAttribute('data-diagram-id'));}); _backBtn.addEventListener('click',navigateBack); _forwardBtn.addEventListener('click',navigateForward); _cr.addEventListener('click',e=>{if(_mMoved) return; const linkChip=e.target.closest('.linked-diagram-chip[data-linked-diagram-id]'); if(linkChip){e.preventDefault(); e.stopPropagation(); navigateToDiagram(linkChip.getAttribute('data-linked-diagram-id')); return;} const detailBtn=e.target.closest('.detail-btn[data-node-detail-id]'); if(detailBtn){e.preventDefault(); e.stopPropagation(); openDetail(detailBtn.getAttribute('data-node-detail-id')); return;} const node=e.target.closest('.node[data-click-detail="1"][data-node-id]'); if(node) openDetail(node.getAttribute('data-node-id'));});
_vp.addEventListener('wheel',e=>{e.preventDefault(); const r=_vp.getBoundingClientRect(); zoomBy(e.deltaY<0?1.1:0.91,e.clientX-r.left,e.clientY-r.top);},{passive:false}); function _startPan(e){_mp=true; _mMoved=false; _ms={x:e.clientX,y:e.clientY}; _mps={x:_px,y:_py}; _vp.classList.add('panning');} _vp.addEventListener('mousedown',e=>{if(e.button===1){e.preventDefault(); _startPan(e);} else if(e.button===0){_startPan(e);}}); window.addEventListener('mousemove',e=>{if(!_mp) return; const dx=e.clientX-_ms.x, dy=e.clientY-_ms.y; if(!_mMoved && Math.sqrt(dx*dx+dy*dy)>4) _mMoved=true; if(!_mMoved) return; _px=_mps.x+dx; _py=_mps.y+dy; _applyT();}); window.addEventListener('mouseup',e=>{if(!_mp) return; _mp=false; _vp.classList.remove('panning'); if(_mMoved) e.stopPropagation();}); _vp.addEventListener('click',e=>{if(_mMoved){e.stopPropagation(); _mMoved=false;}},true); window.addEventListener('load',renderActiveDiagram);
<\/script>
</body>
</html>`;

  state = originalState;
  return {
    html,
    title,
    diagramW: rootRendered?.width || 1200,
    diagramH: rootRendered?.height || 800
  };
}

function exportHTML() {
  openExportModal();
}

