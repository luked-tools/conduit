function openHelpModal() {
  const body = `
    <div class="help-modal-body">
      <section class="help-modal-section">
        <div class="help-modal-kicker">Quick Start</div>
        <div class="help-modal-copy">Conduit is built for direct system mapping on the canvas. Start with nodes, connect them by dragging from ports, then use the selection toolbar and sidebar for deeper edits.</div>
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
              <div class="help-modal-tip-copy">Drag from node ports, or use the selection toolbar for quick connect and layering actions.</div>
            </div>
          </div>
          <div class="help-modal-tip">
            <span class="help-modal-tip-index">3</span>
            <div>
              <div class="help-modal-tip-title">Open detail surfaces when needed</div>
              <div class="help-modal-tip-copy">Use the sidebar for fast edits, then open panels or modals for functions, theme, layers, and deeper configuration.</div>
            </div>
          </div>
        </div>
      </section>
      <section class="help-modal-section">
        <div class="help-modal-kicker">About Conduit</div>
        <div class="help-modal-copy">Conduit is a canvas-first tool for mapping systems, interfaces, and operational flows. It is designed to stay calm and technical: quick for direct edits, but structured enough for detailed review and export.</div>
        <div class="help-modal-meta">
          <div><span>Created by</span><strong>Luke Darragh</strong></div>
          <div><span>Best for</span><strong>System maps, flows, interfaces</strong></div>
        </div>
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
