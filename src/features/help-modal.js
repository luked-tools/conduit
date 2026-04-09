function setHelpTab(tabId) {
  document.querySelectorAll('.help-modal-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
    btn.setAttribute('aria-selected', btn.dataset.tab === tabId ? 'true' : 'false');
  });
  document.querySelectorAll('.help-modal-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.tabPanel === tabId);
  });
}

function openHelpModal() {
  const body = `
    <div class="help-modal-body">
      <div id="help-modal-tabs" role="tablist" aria-label="Help sections">
        <button class="help-modal-tab active" data-tab="quickstart" onclick="setHelpTab('quickstart')" role="tab" aria-selected="true">Quick Start</button>
        <button class="help-modal-tab" data-tab="workflows" onclick="setHelpTab('workflows')" role="tab" aria-selected="false">Workflows</button>
        <button class="help-modal-tab" data-tab="about" onclick="setHelpTab('about')" role="tab" aria-selected="false">About</button>
      </div>
      <section class="help-modal-panel active" data-tab-panel="quickstart">
        <section class="help-modal-section">
          <div class="help-modal-kicker">Quick Start</div>
          <div class="help-modal-copy">Learn the core features, and jump straight in.</div>
          <div class="help-modal-tip-list">
            <div class="help-modal-tip">
              <span class="help-modal-tip-index">1</span>
              <div>
                <div class="help-modal-tip-title">Add nodes from the Palette</div>
                <div class="help-modal-tip-copy">Use internal systems, external entities, or boundary boxes to frame the map.</div>
              </div>
            </div>
            <div class="help-modal-tip">
              <span class="help-modal-tip-index">2</span>
              <div>
                <div class="help-modal-tip-title">Connect directly on the canvas</div>
                <div class="help-modal-tip-copy">Drag from node ports, or use the selection toolbar for quick connect, layering, rename, and style actions.</div>
              </div>
            </div>
            <div class="help-modal-tip">
              <span class="help-modal-tip-index">3</span>
              <div>
                <div class="help-modal-tip-title">Use linked diagrams for additional detail</div>
                <div class="help-modal-tip-copy">Select a node or boundary, then use the toolbar or the sidebar to create or connect a linked diagram when the draft needs another level.</div>
              </div>
            </div>
            <div class="help-modal-tip">
              <span class="help-modal-tip-index">4</span>
              <div>
                <div class="help-modal-tip-title">Open detail surfaces when you need more control</div>
                <div class="help-modal-tip-copy">Use the sidebar for fast edits, then open panels or modals for functions, layers, theme, and deeper detail.</div>
              </div>
            </div>
          </div>
        </section>
      </section>
      <section class="help-modal-panel" data-tab-panel="workflows">
        <section class="help-modal-section">
          <div class="help-modal-kicker">Key Workflows</div>
          <div class="help-modal-copy">Conduit is designed for fast editing on the canvas, with deeper tools revealed only when you need them.</div>
          <div class="help-modal-meta">
            <div><span>Create</span><strong>Add nodes, drag to connect, or use quick connect from the selection toolbar.</strong></div>
            <div><span>Edit</span><strong>Select nodes and connectors to use the sidebar, inline rename, style brush, and layer controls.</strong></div>
            <div><span>Drill down</span><strong>Link nodes or boundaries to linked diagrams, then use the Diagrams controls and breadcrumbs to move between diagrams in the draft.</strong></div>
            <div><span>Review</span><strong>Use Layers, Theme, and detail panels to refine structure, presentation, and visual hierarchy.</strong></div>
            <div><span>Share</span><strong>Export full draft HTML when you want a richer shared artifact, including linked-diagram navigation inside the export.</strong></div>
          </div>
        </section>
      </section>
      <section class="help-modal-panel" data-tab-panel="about">
        <section class="help-modal-section">
          <div class="help-modal-kicker">About Conduit</div>
          <div class="help-modal-copy">Conduit is a canvas-first tool for mapping systems, interfaces, and operational flows. It is designed to stay consistently clean but still technical: quick to directly edit, but structured enough for detailed review and interactive exports.</div>
          <div class="help-modal-meta">
            <div><span>Created by</span><strong>Luke Darragh</strong></div>
            <div><span>Best for</span><strong>System maps, interface flows, operational architecture</strong></div>
          </div>
        </section>
      </section>
    </div>
  `;

  openBasicModal({
    title: 'Help',
    body,
    buttons: [
      {
        label: 'Close',
        className: 'tb-btn primary'
      }
    ]
  });
}
