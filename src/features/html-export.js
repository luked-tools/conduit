function buildExportHTML(opts) {
  const title = document.getElementById('diagram-title-input').value;
  const subtitle = document.getElementById('diagram-subtitle-input').value;
  const stateJson = JSON.stringify(state);
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);

  function getExportNodeType(type) {
    return type === 'external' || type === 'boundary' ? type : 'internal';
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

  // Build static SVG arrows and nodes for the export
  const nodes = state.nodes;
  const arrows = state.arrows;

  // Estimate exported node heights based on what content opts will actually render.
  // We can't use live DOM heights because opts may hide functions/IO, changing the height.
  // Instead we estimate from the node's stored data + opts, then add a generous pad.
  function estimateExportHeight(n) {
    if (n.type === 'boundary') return n.h;
    let h = 14 + 4;
    if (n.tag)      h += 16;
    h += 20;
    if (n.title && n.title.includes('\n')) h += 16 * (n.title.split('\n').length - 1);
    if (n.subtitle) h += 18;
    const fns = (n.functions||[]).filter(f => (typeof f === 'string' ? f : (f.name || '')).trim() && !f.hidden);
    if (fns.length) {
      h += 14 + 8;
      fns.forEach(f => {
        h += 22;
        const hidIn  = f.hiddenInputs  || [];
        const hidOut = f.hiddenOutputs || [];
        const ins  = (Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : [])).filter((_,i) => !hidIn.includes(i));
        const outs = (Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : [])).filter((_,i) => !hidOut.includes(i));
        if (ins.length)  h += 22;
        if (outs.length) h += 22;
      });
    }
    h += 14;
    return Math.max(n.h, h);
  }

  const estimatedHeights = {};
  nodes.forEach(n => { estimatedHeights[n.id] = estimateExportHeight(n); });

  // Compute bounding box from estimated heights
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  nodes.forEach(n => {
    const h = estimatedHeights[n.id];
    minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
    maxX=Math.max(maxX,n.x+n.w); maxY=Math.max(maxY,n.y+h);
  });
  const pad = 60;
  minX-=pad; minY-=pad; maxX+=pad; maxY+=pad;
  const W = maxX-minX, H = maxY-minY;

  // Build SVG
  function bezierPtE(p0,p1,p2,p3,t){const mt=1-t;return mt*mt*mt*p0+3*mt*mt*t*p1+3*mt*t*t*p2+t*t*t*p3;}
  function getPortXYE(n, pos, offset) {
    const h = estimatedHeights[n.id] || n.h;
    return getPortXY(n, pos, offset, h);
  }


  let svgArrows = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;overflow:visible;pointer-events:none;z-index:2;" width="${W}" height="${H}"><defs id="edefs"></defs>`;

  // Port stagger - mirrors canvas renderArrows logic exactly
  const ePortGroups = {};
  arrows.forEach(a => {
    const fk = a.from + ':' + (a.fromPos||'e');
    const tk = a.to   + ':' + (a.toPos  ||'w');
    if (!ePortGroups[fk]) ePortGroups[fk] = [];
    if (!ePortGroups[tk]) ePortGroups[tk] = [];
    if (getArrowEndOffset(a, 'from') === null) ePortGroups[fk].push(a.id + ':from');
    if (getArrowEndOffset(a, 'to') === null) ePortGroups[tk].push(a.id + ':to');
  });
  const ePortPerp = { n:{x:1,y:0}, s:{x:1,y:0}, e:{x:0,y:1}, w:{x:0,y:1} };
  const E_STAGGER = 8;
  function staggeredPortXYE(node, pos, arrowId, end, manualOffset) {
    if (manualOffset !== null) return getPortXYE(node, pos, manualOffset);
    const base = getPortXYE(node, pos);
    const key  = node.id + ':' + pos;
    const token = arrowId + ':' + end;
    const group = ePortGroups[key] || [];
    if (group.length <= 1) return base;
    const idx    = group.indexOf(token);
    if (idx === -1) return base;
    const total  = group.length;
    const offset = (idx - (total - 1) / 2) * E_STAGGER;
    const perp   = ePortPerp[pos] || {x:1,y:0};
    return { x: base.x + perp.x * offset, y: base.y + perp.y * offset };
  }

  // Build per-arrow marker defs string
  let eDefsHtml = '';
  function makeExportMarker(id, color, forStart) {
    return `<marker id="${id}" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="${forStart?'auto-start-reverse':'auto'}"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker>`;
  }
  const exportArrowColor = cs.getPropertyValue('--arrow-color').trim() || '#ff8c42';

  arrows.forEach(a => {
    const fn = nodes.find(x=>x.id===a.from), tn = nodes.find(x=>x.id===a.to);
    if(!fn||!tn) return;
    const color = a.color || exportArrowColor;
    eDefsHtml += makeExportMarker('emf-'+a.id, color, false);
    eDefsHtml += makeExportMarker('emb-'+a.id, color, true);
  });
  svgArrows = svgArrows.replace('<defs id="edefs"></defs>', `<defs>${eDefsHtml}</defs>`);

  arrows.forEach(a => {
    const fn = nodes.find(x=>x.id===a.from), tn = nodes.find(x=>x.id===a.to);
    if(!fn||!tn) return;
    const p1=staggeredPortXYE(fn,a.fromPos||'e',a.id,'from',getArrowEndOffset(a, 'from')),
          p2=staggeredPortXYE(tn,a.toPos||'w',a.id,'to',getArrowEndOffset(a, 'to'));
    const {d:d2, lx:_elx, ly:_ely, cx1, cy1, cx2, cy2} =
      buildArrowPath(p1, p2, a.fromPos||'e', a.toPos||'w', a.bend||0, a.lineStyle||'curved', minX, minY, a.orthoY||0);
    const color = a.color || exportArrowColor;
    let mEnd='', mStart='';
    if(a.direction==='directed'){mEnd=`marker-end="url(#emf-${a.id})"`;}
    else if(a.direction==='bidirectional'){mEnd=`marker-end="url(#emf-${a.id})"`;mStart=`marker-start="url(#emb-${a.id})"`;}
    const dash=a.dash?'stroke-dasharray="6 3"':'';
    svgArrows+=`<path d="${d2}" fill="none" stroke="${color}" stroke-width="1.5" ${mEnd} ${mStart} ${dash}/>`;
    if(a.label){
      const lx=_elx+(a.labelOffsetX||0);
      const ly=_ely+(a.labelOffsetY||0);
      const eLines=a.label.split('\n').map(line => escapeHtml(line));
      const eFontSize=11;
      const eLineH=eFontSize+4;
      const eTotalH=eLines.length*eLineH;
      const eMaxW=Math.max(...eLines.map(l=>l.length))*(a.labelBold?7:6.5);
      const eFill=a.labelColor||'#9aa0b8';
      const eFW=a.labelBold?'600':'400';
      const eFS=a.labelItalic?'italic':'normal';
      svgArrows+=`<rect x="${lx-eMaxW/2-5}" y="${ly-eTotalH/2-5}" width="${eMaxW+10}" height="${eTotalH+8}" rx="4" fill="var(--surface)" stroke="var(--border)" stroke-width="1"/>`;
      const tspans=eLines.map((l,i)=>`<tspan x="${lx}" dy="${i===0?0:eLineH}">${l}</tspan>`).join('');
      svgArrows+=`<text x="${lx}" y="${ly-(eLines.length-1)*eLineH/2}" fill="${eFill}" font-size="${eFontSize}" font-weight="${eFW}" font-style="${eFS}" font-family="IBM Plex Sans,sans-serif" text-anchor="middle" dominant-baseline="middle">${tspans}</text>`;
    }
  });
  svgArrows += '</svg>';

  // Build per-node detail data for the exported panel (always captured regardless of opts)
  const nodeDetailData = {};
  nodes.filter(n => n.type !== 'boundary').forEach(n => {
    const fns = (n.functions||[]).filter(f => {
      const nm = typeof f === 'string' ? f : (f.name || ''); return nm.trim() && !f.hidden;
    });
    const hasFnDetail = fns.some(f => f.description||(f.inputs&&f.inputs.length)||(f.outputs&&f.outputs.length));
    const hasNotes    = n.notes && n.notes.trim();
    if (hasFnDetail || hasNotes) {
      nodeDetailData[n.id] = {
        tag:   n.tag   || '',
        title: n.title.replace(/\n/g,' '),
        type:  n.type,
        notes: n.notes || '',
        functions: fns.map(f => ({
          name:    f.name  || f || '',
          desc:    f.description || '',
          inputs:  Array.isArray(f.inputs)  ? f.inputs  : (f.inputs  ? [f.inputs]  : []),
          outputs: Array.isArray(f.outputs) ? f.outputs : (f.outputs ? [f.outputs] : []),
          owner:   f.owner   || '',
          trigger: f.trigger || '',
          system:  f.system  || '',
        }))
      };
    }
  });
  const nodeDetailJson = JSON.stringify(nodeDetailData).replace(/</g,'\\u003c').replace(/>/g,'\\u003e');

  let nodeHtml = '';
  const sortedN = [...nodes].sort((a,b)=>(a.type==='boundary'?-1:1)-(b.type==='boundary'?-1:1));
  sortedN.forEach(n => {
    const hasDetail = !!nodeDetailData[n.id];
    const nodeType = getExportNodeType(n.type);
    const op = n.colorOpacity !== undefined ? n.colorOpacity : 51;
    const opHex = op.toString(16).padStart(2,'0');
    const colorStyle = n.color ? `background:${n.color}${opHex};` : '';
    const detailBtn = hasDetail && n.type !== 'boundary'
      ? `<span class="detail-btn">i</span>`
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
        + fnItems
        + `</div>`;
    }

    const clickAttr = (n.type !== 'boundary' && hasDetail) ? `onclick='openDetail(${JSON.stringify(String(n.id))})' style="position:absolute;left:${n.x-minX}px;top:${n.y-minY}px;width:${n.w}px;min-height:${n.h}px;${colorStyle}cursor:pointer;"` : `style="position:absolute;left:${n.x-minX}px;top:${n.y-minY}px;width:${n.w}px;min-height:${n.h}px;${colorStyle}"`;
    nodeHtml += `<div class="node ${nodeType}" ${clickAttr}>${innerHtml}${detailBtn}</div>`;
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
/* Header bar */
#export-header{flex-shrink:0;height:44px;padding:0 14px;background:var(--surface);border-bottom:1px solid var(--border);border-top:2px solid var(--accent);display:flex;align-items:center;gap:12px;z-index:10;box-shadow:0 1px 3px rgba(0,0,0,0.06);}
#export-header h1{font-size:13px;font-weight:600;color:var(--text);letter-spacing:-0.02em;}
#export-header p{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--text3);margin-left:4px;}
/* Canvas viewport */
#viewport{flex:1;overflow:hidden;position:relative;cursor:grab;}
#viewport.panning{cursor:grabbing;}
#canvas-root{position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;}
.diagram{position:relative;width:${W}px;height:${H}px;}
/* Grid */
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:40px 40px;opacity:0.22;pointer-events:none;z-index:0;}
/* Nodes */
.node{position:absolute;border-radius:var(--radius);cursor:default;min-width:120px;z-index:3;}
.node.internal{background:var(--node-internal);border:1px solid var(--node-internal-edge);border-left:3px solid var(--node-internal-border);box-shadow:var(--shadow);}
.node.external{background:var(--node-external);border:1px solid var(--node-external-edge);border-left:3px dashed var(--node-external-border);box-shadow:var(--shadow);}
.node.boundary{background:transparent;border:1px dashed #cccccc;box-shadow:none;z-index:1;}
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
.detail-btn{position:absolute;top:7px;right:8px;width:10px;height:10px;border-radius:50%;background:transparent;border:1px solid var(--accent3);color:var(--accent3);font-size:7px;font-style:italic;font-family:Georgia,serif;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;opacity:0.75;transition:opacity 0.15s;pointer-events:none;}
.node:hover .detail-btn{opacity:1;}
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
#help-hud{position:fixed;top:60px;left:16px;background:var(--surface);border:1px solid var(--border);backdrop-filter:blur(8px);border-radius:6px;padding:7px 11px;font-size:9.5px;color:var(--text3);z-index:20;line-height:1.75;font-family:'IBM Plex Mono',monospace;}
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
    <button id="dp-close" onclick="closeDetail()">×</button>
  </div>
  <div id="dp-body"></div>
</div>
<div id="export-header">
  <div>
    <h1>${safeTitle}</h1>
    ${subtitle ? `<p>${safeSubtitle}</p>` : ''}
  </div>
</div>
<div id="viewport">
  <div id="canvas-root">
    <div class="diagram">
      ${nodeHtml}
      ${svgArrows}
    </div>
  </div>
</div>
<div id="zoom-hud">
  <button class="zoom-hud-btn" onclick="zoomBy(1.2)" title="Zoom in">+</button>
  <div id="zoom-label">100%</div>
  <button class="zoom-hud-btn" onclick="zoomBy(1/1.2)" title="Zoom out">−</button>
  <button class="zoom-hud-btn" onclick="resetView()" title="Fit to screen" style="font-size:11px;">⊡</button>
</div>
<div id="help-hud"><b>Scroll</b> to zoom · <b>Drag</b> to pan · <b>Click</b> node for detail</div>
  ${opts.showLegend ? `<div id="legend-wrap"><div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:var(--node-internal);border-left:3px solid var(--node-internal-border);border-top:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);"></div>Internal system</div>
    <div class="legend-item"><div class="legend-box" style="background:var(--node-external);border-left:3px dashed var(--node-external-border);border-top:1px solid var(--border);border-right:1px solid var(--border);border-bottom:1px solid var(--border);"></div>External boundary</div>
    <div class="legend-item"><div class="legend-box" style="background:transparent;border:1.5px dashed var(--border2);"></div>Label / boundary</div>
    <div class="legend-item"><div class="legend-line" style="background:var(--accent);border-radius:1px;"></div>Connection</div>
    <div class="legend-item"><svg width="28" height="4" style="flex-shrink:0"><line x1="0" y1="2" x2="28" y2="2" stroke="var(--accent2)" stroke-width="2" stroke-dasharray="4 3"/></svg>Dashed connection</div>
  </div>` : ''}
<footer style="position:fixed;bottom:4px;right:16px;font-family:'IBM Plex Mono',monospace;font-size:9px;color:#2a2f3e;z-index:5;">Conduit v1.2 · ${new Date().toLocaleDateString()}</footer>
</div>
<scr\u0069pt>
const _nodeData = ${nodeDetailJson};
function openDetail(id) {
  const d = _nodeData[id]; if (!d) return;
  document.getElementById('dp-tag').textContent   = d.tag || '';
  document.getElementById('dp-title').textContent = d.title || '';
  const body = document.getElementById('dp-body');
  body.innerHTML = '';
  // Notes section
  if (d.notes && d.notes.trim()) {
    const sec = document.createElement('div'); sec.className = 'dp-section';
    const lbl = document.createElement('div'); lbl.className = 'dp-section-label'; lbl.textContent = 'Notes';
    const txt = document.createElement('div'); txt.className = 'dp-notes'; txt.textContent = d.notes.trim();
    sec.appendChild(lbl); sec.appendChild(txt); body.appendChild(sec);
  }
  // Functions section
  const fns = (d.functions||[]).filter(f => f.desc || (f.inputs&&f.inputs.length) || (f.outputs&&f.outputs.length) || f.owner || f.trigger || f.system);
  if (fns.length) {
    const sec = document.createElement('div'); sec.className = 'dp-section';
    const lbl = document.createElement('div'); lbl.className = 'dp-section-label'; lbl.textContent = 'Functions';
    sec.appendChild(lbl);
    fns.forEach((f, i) => {
      const card = document.createElement('div'); card.className = 'dp-fn';
      const hdr  = document.createElement('div'); hdr.className  = 'dp-fn-header';
      const nm   = document.createElement('div'); nm.className   = 'dp-fn-name'; nm.textContent = f.name || 'Untitled';
      const chv  = document.createElement('div'); chv.className  = 'dp-fn-chevron'; chv.textContent = '▾';
      hdr.appendChild(nm); hdr.appendChild(chv);
      hdr.onclick = () => { card.classList.toggle('open'); };
      const bdy  = document.createElement('div'); bdy.className  = 'dp-fn-body';
      if (f.desc) {
        const p = document.createElement('div'); p.className = 'dp-fn-desc'; p.textContent = f.desc; bdy.appendChild(p);
      }
      if (f.inputs && f.inputs.length) {
        const row = document.createElement('div'); row.className = 'dp-io-row';
        const lbr = document.createElement('div'); lbr.className = 'dp-io-label'; lbr.textContent = 'Inputs';
        const pills = document.createElement('div'); pills.className = 'dp-pills';
f.inputs.forEach(v => { const s = document.createElement('span'); s.className='dp-pill-in'; s.innerHTML='<span class="io-pill-prefix">IN</span>'+escapeHtml(v); pills.appendChild(s); });
        row.appendChild(lbr); row.appendChild(pills); bdy.appendChild(row);
      }
      if (f.outputs && f.outputs.length) {
        const row = document.createElement('div'); row.className = 'dp-io-row';
        const lbr = document.createElement('div'); lbr.className = 'dp-io-label'; lbr.textContent = 'Outputs';
        const pills = document.createElement('div'); pills.className = 'dp-pills';
f.outputs.forEach(v => { const s = document.createElement('span'); s.className='dp-pill-out'; s.innerHTML='<span class="io-pill-prefix">OUT</span>'+escapeHtml(v); pills.appendChild(s); });
        row.appendChild(lbr); row.appendChild(pills); bdy.appendChild(row);
      }
      const metaItems = [f.owner&&('Owner: '+f.owner), f.trigger&&('Trigger: '+f.trigger), f.system&&('System: '+f.system)].filter(Boolean);
      if (metaItems.length) {
        const meta = document.createElement('div'); meta.className = 'dp-meta';
        metaItems.forEach(m => { const c = document.createElement('span'); c.className='dp-meta-chip'; c.textContent=m; meta.appendChild(c); });
        bdy.appendChild(meta);
      }
      card.appendChild(hdr); card.appendChild(bdy); sec.appendChild(card);
      if (i === 0) card.classList.add('open');
    });
    body.appendChild(sec);
  }
  if (!body.children.length) {
    body.innerHTML = '<div class="dp-empty">No additional detail available.</div>';
  }
  document.getElementById('detail-overlay').classList.add('open');
  document.getElementById('detail-panel').classList.add('open');
}
function closeDetail() {
  document.getElementById('detail-overlay').classList.remove('open');
  document.getElementById('detail-panel').classList.remove('open');
}
document.addEventListener('keydown', e => { if (e.key==='Escape') closeDetail(); });
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Pan / Zoom
const _vp = document.getElementById('viewport');
const _cr = document.getElementById('canvas-root');
const _dW = ${W}, _dH = ${H};
let _sc = 1, _px = 0, _py = 0;

function _applyT() {
  _cr.style.transform = 'translate(' + _px + 'px,' + _py + 'px) scale(' + _sc + ')';
  const lbl = document.getElementById('zoom-label');
  if (lbl) lbl.textContent = Math.round(_sc * 100) + '%';
}
function zoomBy(factor, cx, cy) {
  cx = (cx !== undefined ? cx : _vp.clientWidth / 2);
  cy = (cy !== undefined ? cy : _vp.clientHeight / 2);
  const ns = Math.min(4, Math.max(0.1, _sc * factor));
  _px = cx - (cx - _px) * (ns / _sc);
  _py = cy - (cy - _py) * (ns / _sc);
  _sc = ns;
  _applyT();
}
function resetView() {
  const vw = _vp.clientWidth, vh = _vp.clientHeight, pad = 60;
  _sc = Math.min(1, (vw - pad * 2) / _dW, (vh - pad * 2) / _dH);
  _px = (vw - _dW * _sc) / 2;
  _py = (vh - _dH * _sc) / 2;
  _applyT();
}
_vp.addEventListener('wheel', e => {
  e.preventDefault();
  const r = _vp.getBoundingClientRect();
  zoomBy(e.deltaY < 0 ? 1.1 : 0.91, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
let _mp = false, _ms = {x:0,y:0}, _mps = {x:0,y:0}, _mMoved = false;
function _startPan(e) {
  _mp = true; _mMoved = false;
  _ms = {x:e.clientX, y:e.clientY}; _mps = {x:_px, y:_py};
  _vp.classList.add('panning');
}
_vp.addEventListener('mousedown', e => {
  if (e.button === 1) { e.preventDefault(); _startPan(e); }
  else if (e.button === 0) { _startPan(e); }
});
window.addEventListener('mousemove', e => {
  if (!_mp) return;
  const dx = e.clientX - _ms.x, dy = e.clientY - _ms.y;
  if (!_mMoved && Math.sqrt(dx*dx+dy*dy) > 4) _mMoved = true;
  if (!_mMoved) return;
  _px = _mps.x + dx; _py = _mps.y + dy;
  _applyT();
});
window.addEventListener('mouseup', e => {
  if (!_mp) return;
  _mp = false; _vp.classList.remove('panning');
  if (_mMoved) { e.stopPropagation(); }
});
_vp.addEventListener('click', e => { if (_mMoved) { e.stopPropagation(); _mMoved = false; } }, true);
window.addEventListener('load', resetView);
<\/script>
</body>
</html>`;

  return { html, title, diagramW: W, diagramH: H };
}

function exportHTML() {
  openExportModal();
}
