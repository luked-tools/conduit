const { test, expect } = require('@playwright/test');
const fs = require('fs');

async function bootFresh(page) {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
}

async function addNode(page, type = 'internal', x = 900, y = 650) {
  await page.evaluate(({ type, x, y }) => {
    addModeAt(type, x, y);
  }, { type, x, y });
}

async function getNodeIds(page) {
  return page.evaluate(() => state.nodes.map(node => node.id));
}

async function dragBetween(page, fromSelector, toSelector) {
  const from = page.locator(fromSelector);
  const to = page.locator(toSelector);
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();

  if (!fromBox || !toBox) {
    throw new Error(`Could not resolve drag endpoints: ${fromSelector} -> ${toSelector}`);
  }

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 12 });
  await page.mouse.up();
}

async function dragBy(page, selector, deltaX, deltaY = 0) {
  const locator = page.locator(selector);
  return dragLocatorBy(page, locator, deltaX, deltaY);
}

async function dragLocatorBy(page, locator, deltaX, deltaY = 0) {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Could not resolve drag source');
  }
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 10 });
  await page.mouse.up();
}

test.describe('Conduit smoke', () => {
  test('loads without runtime errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await bootFresh(page);

    await expect(page.locator('#topbar')).toBeVisible();
    await expect(page.locator('#canvas-wrap')).toBeVisible();
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.node')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('can add a node from app helpers', async ({ page }) => {
    await bootFresh(page);

    await addNode(page);

    await expect(page.locator('.node')).toHaveCount(1);
    await expect(page.locator('.node.internal')).toHaveCount(1);
    await expect(page.locator('#node-count')).toHaveText('1');
  });

  test('undo and redo restore node changes', async ({ page }) => {
    await bootFresh(page);

    await addNode(page);
    await expect(page.locator('.node')).toHaveCount(1);

    await expect(page.locator('#undo-btn')).toBeEnabled();
    await page.locator('#undo-btn').click();
    await expect(page.locator('.node')).toHaveCount(0);

    await expect(page.locator('#redo-btn')).toBeEnabled();
    await page.locator('#redo-btn').click();
    await expect(page.locator('.node')).toHaveCount(1);
  });

  test('draft autosave survives a reload', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 880, 620);
    await addNode(page, 'external', 1180, 620);
    await expect(page.locator('.node')).toHaveCount(2);

    await page.reload();

    await expect(page.locator('.node')).toHaveCount(2);
    await expect(page.locator('#node-count')).toHaveText('2');
  });

  test('can create a connection by dragging between node ports', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    const [fromId, toId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${toId} .conn-point[data-pos="w"]`
    );

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].from)).toBe(fromId);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].to)).toBe(toId);
  });

  test('palette default connection type applies to new connections', async ({ page }) => {
    await bootFresh(page);

    await page.locator('#next-line-style-orthogonal').click();
    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    const [fromId, toId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${toId} .conn-point[data-pos="w"]`
    );

    await expect.poll(async () => page.evaluate(() => state.arrows[0].lineStyle || 'curved')).toBe('orthogonal');
  });

  test('new connection preview follows the selected default connection type', async ({ page }) => {
    await bootFresh(page);

    await page.locator('#next-line-style-orthogonal').click();
    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    const [fromId, toId] = await getNodeIds(page);

    const fromBox = await page.locator(`#node-${fromId} .conn-point[data-pos="e"]`).boundingBox();
    const toBox = await page.locator(`#node-${toId} .conn-point[data-pos="w"]`).boundingBox();

    if (!fromBox || !toBox) {
      throw new Error('Could not resolve new connection preview elements');
    }

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 8 });

    const previewPath = await page.evaluate(() => wireTempPath?.getAttribute('d') || '');
    expect(previewPath).toContain(' L');
    expect(previewPath.includes(' C')).toBe(false);

    await page.mouse.up();
  });

  test('quick edit affordance is suppressed while dragging a connection', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    const [fromId, toId] = await getNodeIds(page);

    const fromBox = await page.locator(`#node-${fromId} .conn-point[data-pos="e"]`).boundingBox();
    const targetNode = page.locator(`#node-${toId}`);
    const targetBox = await targetNode.boundingBox();

    if (!fromBox || !targetBox) {
      throw new Error('Could not resolve connection drag nodes');
    }

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });

    await expect.poll(async () => page.evaluate(() => document.body.classList.contains('connecting'))).toBe(true);
    await expect.poll(async () => targetNode.locator('.node-quick-edit-btn').evaluate(el => getComputedStyle(el).opacity)).toBe('0');

    await page.mouse.up();
  });

  test('newly created connection can be adjusted immediately without reselecting', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 620);
    await addNode(page, 'external', 1080, 620);
    await addNode(page, 'internal', 1360, 620);
    const [fromId, firstTargetId, secondTargetId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${firstTargetId} .conn-point[data-pos="w"]`
    );

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => selectedArrow)).toBe(
      await page.evaluate(() => state.arrows[0].id)
    );
    await expect(page.locator('.arrow-endpoint-handle')).toHaveCount(2);

    const handles = page.locator('.arrow-endpoint-handle .hit');
    const handleBox = await handles.nth(1).boundingBox();
    const targetBox = await page.locator(`#node-${secondTargetId} .conn-point[data-pos="w"]`).boundingBox();

    if (!handleBox || !targetBox) {
      throw new Error('Could not resolve immediate endpoint drag elements');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => page.evaluate(() => state.arrows[0].to)).toBe(secondTargetId);
  });

  test('can move an arrow endpoint to a different node', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 620);
    await addNode(page, 'external', 1080, 620);
    await addNode(page, 'internal', 1360, 620);
    const [fromId, firstTargetId, secondTargetId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${firstTargetId} .conn-point[data-pos="w"]`
    );

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);

    await page.evaluate(() => {
      selectArrow(state.arrows[0].id);
    });
    await expect(page.locator('.arrow-endpoint-handle')).toHaveCount(2);

    const handles = page.locator('.arrow-endpoint-handle .hit');
    const handleBox = await handles.nth(1).boundingBox();
    const targetBox = await page.locator(`#node-${secondTargetId} .conn-point[data-pos="w"]`).boundingBox();

    if (!handleBox || !targetBox) {
      throw new Error('Could not resolve endpoint drag elements');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => page.evaluate(() => state.arrows[0].to)).toBe(secondTargetId);
  });

  test('arrow stroke pattern presets update the rendered connector', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );

    await page.evaluate(() => selectArrow(state.arrows[0].id));
    await page.getByRole('button', { name: 'Dot', exact: true }).click();

    await expect.poll(async () => page.evaluate(() => state.arrows[0].strokeStyle)).toBe('dotted');
    await expect.poll(async () => page.evaluate(() => {
      return [...document.querySelectorAll('#arrow-svg path')]
        .map(p => p.getAttribute('stroke-dasharray'))
        .find(Boolean) || null;
    })).toBe('1.5 4');
  });

  test('selected arrow keeps its connector color visible while editing', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );

    await page.evaluate(() => {
      selectArrow(state.arrows[0].id);
      state.arrows[0].color = '#0088cc';
      renderArrows();
    });

    await expect.poll(async () => page.evaluate(() => {
      return [...document.querySelectorAll('#arrow-svg path')]
        .map(p => p.getAttribute('stroke'))
        .filter(Boolean);
    })).toContain('#0088cc');
  });

  test('boundary only snaps new connections near its edge', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 560, 620);
    await addNode(page, 'boundary', 820, 520);
    await addNode(page, 'external', 1240, 620);
    const [fromId, boundaryId] = await getNodeIds(page);

    const fromBox = await page.locator(`#node-${fromId} .conn-point[data-pos="e"]`).boundingBox();
    const boundaryBox = await page.locator(`#node-${boundaryId}`).boundingBox();

    if (!fromBox || !boundaryBox) {
      throw new Error('Could not resolve connection source or boundary target');
    }

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const centerX = boundaryBox.x + boundaryBox.width / 2;
    const centerY = boundaryBox.y + boundaryBox.height / 2;
    const nearLeftEdgeX = boundaryBox.x + 10;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(centerX, centerY, { steps: 14 });

    await expect.poll(async () => page.evaluate(() => wireTargetId)).toBe(null);

    await page.mouse.move(nearLeftEdgeX, centerY, { steps: 8 });

    await expect.poll(async () => page.evaluate(() => wireTargetId)).toBe(boundaryId);
    await expect(page.locator(`#node-${boundaryId}`)).toHaveClass(/connect-target/);

    await page.mouse.up();
  });

  test('can open the node detail modal from a node', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 640);
    const [nodeId] = await getNodeIds(page);

    await page.locator(`#node-${nodeId}`).dblclick();

    await expect(page.locator('#node-modal-overlay')).toHaveClass(/open/);
    await expect(page.locator('#nm-title-input')).toBeVisible();
    await expect(page.locator('#nm-panel-overview')).toHaveClass(/active/);
  });

  test('can quick edit node title and subtitle directly on the canvas', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 640);
    const [nodeId] = await getNodeIds(page);

    await page.locator(`#node-${nodeId}`).click();
    await page.locator(`#node-${nodeId} .node-quick-edit-btn`).click();

    await expect(page.locator('.node-quick-edit-panel')).toBeVisible();
    await page.locator('.node-quick-edit-field.title').fill('Order Hub');
    await page.locator('.node-quick-edit-field.subtitle').fill('Planning and orchestration');
    await page.locator('.node-quick-edit-field.subtitle').press('Enter');

    await expect(page.locator('.node-quick-edit-panel')).toHaveCount(0);
    await expect(page.locator(`#node-${nodeId} .node-title`)).toHaveText('Order Hub');
    await expect(page.locator(`#node-${nodeId} .node-subtitle`)).toHaveText('Planning and orchestration');
  });

  test('quick edit closes on escape and outside click', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 640);
    const [nodeId] = await getNodeIds(page);

    await page.locator(`#node-${nodeId}`).click();
    await page.locator(`#node-${nodeId} .node-quick-edit-btn`).click();
    await expect(page.locator('.node-quick-edit-panel')).toBeVisible();
    await page.locator('.node-quick-edit-field.title').press('Escape');
    await expect(page.locator('.node-quick-edit-panel')).toHaveCount(0);

    await page.locator(`#node-${nodeId} .node-quick-edit-btn`).click();
    await expect(page.locator('.node-quick-edit-panel')).toBeVisible();
    await page.locator('#topbar').click({ position: { x: 20, y: 20 } });
    await expect(page.locator('.node-quick-edit-panel')).toHaveCount(0);
  });

  test('can create a connection from the connection modal', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);

    await page.locator('#connect-mode-btn').click();
    await expect(page.locator('#conn-modal-overlay')).toHaveClass(/open/);

    await page.locator('#conn-from-display').click();
    await page.locator('#conn-from-list .conn-node-option').first().click();

    await page.locator('#conn-to-display').click();
    await page.locator('#conn-to-list .conn-node-option').nth(1).click();

    await page.locator('#conn-label-input').fill('Orders feed');
    await page.locator('#conn-create-btn').click();

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].label)).toBe('Orders feed');
  });

  test('theme preset survives reload', async ({ page }) => {
    await bootFresh(page);

    const beforeBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    );

    await page.locator('#theme-toggle-btn').click();
    await expect(page.locator('#theme-panel')).toHaveClass(/open/);
    await page.locator('.theme-preset-btn', { hasText: 'Midnight' }).click();

    const afterBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    );

    expect(afterBg).not.toBe(beforeBg);

    await page.reload();

    await expect.poll(async () => page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )).toBe(afterBg);
  });

  test('can export and import JSON through the file flow', async ({ page }, testInfo) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.evaluate(() => exportJSON()),
    ]);

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error('Playwright did not provide a download path for exported JSON');
    }

    const importedPath = testInfo.outputPath('conduit-export.json');
    fs.copyFileSync(downloadPath, importedPath);

    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload();

    await expect(page.locator('.node')).toHaveCount(0);
    await page.locator('#file-input').setInputFiles(importedPath);

    await expect(page.locator('.node')).toHaveCount(2);
    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
  });

  test('function editor updates the node function list', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 620);
    const [nodeId] = await getNodeIds(page);

    await page.evaluate(id => openFnModal(id), nodeId);
    await expect(page.locator('#fn-modal-overlay')).toHaveClass(/open/);

    await page.locator('#fn-list-add button').click();
    await page.locator('#fn-detail-pane .fn-form-input').first().fill('Plan orders');
    await page.locator('.io-add-input.input-focus').fill('Sales order');
    await page.locator('.io-add-input.input-focus').press('Enter');
    await page.locator('.io-add-input.output-focus').fill('Work order');
    await page.locator('.io-add-input.output-focus').press('Enter');
    await page.locator('#fn-modal-footer .tb-btn').click();

    await expect.poll(async () => page.evaluate(() => state.nodes[0].functions.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => state.nodes[0].functions[0].name)).toBe('Plan orders');
    await expect(page.locator(`#node-${nodeId} .node-functions`)).toContainText('Plan orders');
  });

  test('draft manager can create rename duplicate switch and delete drafts', async ({ page }) => {
    await bootFresh(page);

    await page.evaluate(() => openDraftManager());
    await expect(page.locator('#modal-title')).toHaveText('Drafts');
    await page.locator('#modal-btns button', { hasText: 'New draft' }).click();
    await page.locator('#draft-name-input').fill('Alpha Draft');
    await page.locator('#modal-btns button', { hasText: 'Create draft' }).click();
    await expect(page.locator('#active-draft-chip')).toContainText('Alpha Draft');

    await page.evaluate(() => openDraftManager());
    await page.locator('.draft-row .tb-btn', { hasText: 'Rename' }).first().click();
    await page.locator('#draft-name-input').fill('Alpha Renamed');
    await page.locator('#modal-btns button', { hasText: 'Save name' }).click();
    await expect(page.locator('#active-draft-chip')).toContainText('Alpha Renamed');

    await page.evaluate(() => openDraftManager());
    await page.locator('.draft-row .tb-btn', { hasText: 'Duplicate' }).first().click();

    await page.evaluate(() => openDraftManager());
    await expect(page.locator('.draft-row')).toHaveCount(3);
    const activeBeforeSwitch = await page.locator('#active-draft-chip').textContent();
    await page.locator('.draft-row .tb-btn', { hasText: 'Open' }).first().click();
    await expect(page.locator('#active-draft-chip')).not.toHaveText(activeBeforeSwitch || '');

    await page.evaluate(() => openDraftManager());
    await page.locator('.draft-row .tb-btn.danger', { hasText: 'Delete' }).last().click();
    await page.locator('#modal-btns button', { hasText: 'Delete draft' }).click();

    await page.evaluate(() => openDraftManager());
    await expect(page.locator('.draft-row')).toHaveCount(2);
  });

  test('clear canvas confirmation can cancel and confirm', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await expect(page.locator('.node')).toHaveCount(1);

    await page.evaluate(() => confirmClearCanvas());
    await expect(page.locator('#modal-title')).toHaveText('Clear canvas');
    await page.locator('#modal-btns button', { hasText: 'Cancel' }).click();
    await expect(page.locator('.node')).toHaveCount(1);

    await page.evaluate(() => confirmClearCanvas());
    await page.locator('#modal-btns button', { hasText: /Clear/i }).click();
    await expect(page.locator('.node')).toHaveCount(0);
  });

  test('inline arrow label editor supports enter escape and blur', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );
    await page.evaluate(() => {
      state.arrows[0].label = 'Original label';
      renderArrows();
    });

    await page.locator('#arrow-svg text', { hasText: 'Original label' }).dblclick();
    const editor = page.locator('#inline-label-editor textarea');
    await expect(editor).toBeVisible();
    await editor.fill('Committed label');
    await editor.press('Enter');
    await expect(page.locator('#inline-label-editor')).toHaveCount(0);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].label)).toBe('Committed label');

    await page.locator('#arrow-svg text', { hasText: 'Committed label' }).dblclick();
    await editor.fill('Cancelled label');
    await editor.press('Escape');
    await expect.poll(async () => page.evaluate(() => state.arrows[0].label)).toBe('Committed label');

    await page.locator('#arrow-svg text', { hasText: 'Committed label' }).dblclick();
    await editor.fill('Blur saved label');
    await editor.evaluate(el => el.blur());
    await expect.poll(async () => page.evaluate(() => state.arrows[0].label)).toBe('Blur saved label');
  });

  test('custom theme hex edit survives reload', async ({ page }) => {
    await bootFresh(page);

    await page.locator('#theme-toggle-btn').click();
    const hexInput = page.locator('.theme-hex[data-var="--bg"]');
    await hexInput.fill('#123456');
    await hexInput.blur();

    await expect.poll(async () => page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )).toBe('#123456');

    await page.reload();

    await expect.poll(async () => page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )).toBe('#123456');
  });

  test('exported HTML renders core exported content', async ({ page }, testInfo) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );

    await page.evaluate(() => exportHTML());
    await expect(page.locator('#export-modal-overlay')).toHaveClass(/open/);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.export-download-btn').click(),
    ]);

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error('Playwright did not provide a download path for exported HTML');
    }

    const htmlPath = testInfo.outputPath('conduit-export.html');
    fs.copyFileSync(downloadPath, htmlPath);
    const html = fs.readFileSync(htmlPath, 'utf8');

    const exportedPage = await page.context().newPage();
    await exportedPage.setContent(html, { waitUntil: 'load' });

    await expect(exportedPage.locator('#export-header h1')).toContainText('SYSTEM INTERFACE MAP');
    await expect(exportedPage.locator('.node')).toHaveCount(2);
    await expect(exportedPage.locator('#zoom-hud')).toBeVisible();
    await expect(exportedPage.locator('#legend-wrap')).toBeVisible();

    await exportedPage.close();
  });

  test('keyboard shortcuts support copy paste delete and undo', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 620);
    await page.locator('.node').click();
    await page.locator('body').press('Control+c');
    await page.locator('body').press('Control+v');
    await expect(page.locator('.node')).toHaveCount(2);

    await page.locator('body').press('Delete');
    await expect(page.locator('.node')).toHaveCount(1);

    await page.locator('body').press('Control+z');
    await expect(page.locator('.node')).toHaveCount(2);
  });

  test('imported hostile text renders literally in app surfaces', async ({ page }, testInfo) => {
    await bootFresh(page);

    const payload = {
      version: 1,
      title: '<script>alert("title")</script>',
      subtitle: '<img src=x onerror=alert("sub")>',
      state: {
        nodes: [
          {
            id: 'node_<script>',
            type: 'internal',
            tag: '<b>TAG</b>',
            title: '<img src=x onerror=alert("node")>',
            subtitle: '<svg onload=alert("subtitle")>',
            notes: '<script>alert("notes")</script>',
            x: 860, y: 620, w: 200, h: 110,
            functions: [{ name: '<b>Fn</b>', inputs: ['<i>IN</i>'], outputs: ['<i>OUT</i>'], description: '<script>x</script>' }]
          },
          { id: 'node_b', type: 'external', tag: 'EXT', title: 'Other node', subtitle: '', x: 1180, y: 620, w: 200, h: 110, functions: [] }
        ],
        arrows: [
          { id: 'a1', from: 'node_<script>', to: 'node_b', fromPos: 'e', toPos: 'w', direction: 'directed', label: '<img src=x onerror=alert("label")>', labelOffsetX: 0, labelOffsetY: 0, color: '', dash: false, bend: 0 }
        ]
      }
    };

    const importPath = testInfo.outputPath('hostile-import.json');
    fs.writeFileSync(importPath, JSON.stringify(payload, null, 2), 'utf8');

    await page.locator('#file-input').setInputFiles(importPath);

    await expect(page.locator('.node')).toHaveCount(2);
    await expect(page.locator('#diagram-title-input')).toHaveValue(payload.title);
    await expect(page.locator('#diagram-subtitle-input')).toHaveValue(payload.subtitle);
    await expect(page.locator('.node.internal .node-title').first()).toHaveText(payload.state.nodes[0].title);
    await expect(page.locator('#arrow-svg text')).toHaveText(payload.state.arrows[0].label);
    await expect(page.locator('#canvas-wrap script')).toHaveCount(0);
    await expect(page.locator('#canvas-wrap img')).toHaveCount(0);

    await page.locator('.node.internal').first().dblclick();
    await expect(page.locator('#nm-title-input')).toHaveValue(payload.state.nodes[0].title);
    await expect(page.locator('#nm-notes-area')).toHaveValue(payload.state.nodes[0].notes);

    await page.locator('#nm-close').click();
    await page.locator('#connect-mode-btn').click();
    await page.locator('#conn-from-display').click();
    await expect(page.locator('#conn-from-list .conn-node-option').first()).toContainText(payload.state.nodes[0].title);
  });

  test('invalid JSON import shows the canvas danger banner', async ({ page }, testInfo) => {
    await bootFresh(page);

    const importPath = testInfo.outputPath('invalid-import.json');
    fs.writeFileSync(importPath, '{"version":1,"state":', 'utf8');

    const dangerColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--danger').trim()
    );

    await page.locator('#file-input').setInputFiles(importPath);

    await expect(page.locator('#canvas-notice-banner')).toHaveClass(/active/);
    await expect(page.locator('#canvas-notice-banner')).toContainText('Import failed');
    await expect.poll(async () => page.locator('#canvas-notice-banner').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(
      await page.evaluate(color => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = color;
        document.body.appendChild(probe);
        const resolved = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return resolved;
      }, dangerColor)
    );
  });

  test('exported HTML escapes hostile text literally', async ({ page }, testInfo) => {
    await bootFresh(page);

    await page.evaluate(() => {
      state = {
        nodes: [
          { id: 'n1', type: 'internal', tag: '<b>tag</b>', title: '<script>alert("x")</script>', subtitle: '<img src=x onerror=alert(1)>', x: 860, y: 620, w: 200, h: 110, functions: [{ name: '<b>Fn</b>', inputs: ['<i>IN</i>'], outputs: ['<i>OUT</i>'], hidden: false }] },
          { id: 'n2', type: 'external', tag: 'EXT', title: 'Target', subtitle: '', x: 1180, y: 620, w: 200, h: 110, functions: [] }
        ],
        arrows: [
          { id: 'a1', from: 'n1', to: 'n2', fromPos: 'e', toPos: 'w', direction: 'directed', label: '<svg onload=alert(1)>', labelOffsetX: 0, labelOffsetY: 0, color: '', dash: false, bend: 0 }
        ]
      };
      render();
    });

    await page.evaluate(() => exportHTML());
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.export-download-btn').click(),
    ]);
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error('No exported HTML download path');
    const htmlPath = testInfo.outputPath('escaped-export.html');
    fs.copyFileSync(downloadPath, htmlPath);
    const html = fs.readFileSync(htmlPath, 'utf8');

    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;svg onload=alert(1)&gt;');
    expect(html).not.toContain('<script>alert("x")</script>');
  });

  test('label drag remains stable across repeated rerenders', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );
    await page.evaluate(() => {
      state.arrows[0].label = 'Drag label';
      renderArrows();
    });

    await dragBy(page, '#arrow-svg text', 30, 0);
    const firstOffset = await page.evaluate(() => state.arrows[0].labelOffsetX || 0);

    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        renderArrows();
      }
    });

    await dragBy(page, '#arrow-svg text', 30, 0);
    const secondOffset = await page.evaluate(() => state.arrows[0].labelOffsetX || 0);
    const delta = secondOffset - firstOffset;

    expect(delta).toBeGreaterThan(15);
    expect(delta).toBeLessThan(60);
  });

  test('orthogonal endpoint drag preview matches orthogonal line style', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 620);
    await addNode(page, 'external', 1080, 620);
    await addNode(page, 'internal', 1360, 620);
    const [fromId, firstTargetId, secondTargetId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${firstTargetId} .conn-point[data-pos="w"]`
    );

    await page.evaluate(() => {
      state.arrows[0].lineStyle = 'orthogonal';
      state.arrows[0].bend = 0;
      state.arrows[0].orthoY = 40;
      selectArrow(state.arrows[0].id);
    });

    const handleBox = await page.locator('.arrow-endpoint-handle .hit').nth(1).boundingBox();
    const targetBox = await page.locator(`#node-${secondTargetId} .conn-point[data-pos="w"]`).boundingBox();

    if (!handleBox || !targetBox) {
      throw new Error('Could not resolve orthogonal endpoint drag preview elements');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });

    const previewPath = await page.evaluate(() => wireTempPath?.getAttribute('d') || '');
    expect(previewPath).toContain(' L');
    expect(previewPath.includes(' C')).toBe(false);

    await page.mouse.up();
  });

  test('orthogonal handle drag remains stable across repeated rerenders', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    await dragBetween(
      page,
      '.node.internal .conn-point[data-pos="e"]',
      '.node.external .conn-point[data-pos="w"]'
    );
    await page.evaluate(() => {
      state.arrows[0].lineStyle = 'orthogonal';
      state.arrows[0].bend = 0;
      state.arrows[0].orthoY = 0;
      selectArrow(state.arrows[0].id);
    });

    await page.evaluate(() => {
      const arrow = state.arrows[0];
      const from = state.nodes.find(n => n.id === arrow.from);
      const to = state.nodes.find(n => n.id === arrow.to);
      const p1 = getPortXY(from, arrow.fromPos || 'e');
      const p2 = getPortXY(to, arrow.toPos || 'w');
      const info = buildArrowPath(p1, p2, arrow.fromPos || 'e', arrow.toPos || 'w', arrow.bend || 0, arrow.lineStyle || 'curved', 0, 0, arrow.orthoY || 0).hX;
      startOrthogonalHandleDrag(arrow.id, 'bend', info, true, { stopPropagation() {}, clientX: 0, clientY: 0 });
    });
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 24, clientY: 0 }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 24, clientY: 0 }));
    });
    const firstBend = await page.evaluate(() => state.arrows[0].bend || 0);

    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) {
        renderArrows();
      }
      selectArrow(state.arrows[0].id);
    });

    await page.evaluate(() => {
      const arrow = state.arrows[0];
      const from = state.nodes.find(n => n.id === arrow.from);
      const to = state.nodes.find(n => n.id === arrow.to);
      const p1 = getPortXY(from, arrow.fromPos || 'e');
      const p2 = getPortXY(to, arrow.toPos || 'w');
      const info = buildArrowPath(p1, p2, arrow.fromPos || 'e', arrow.toPos || 'w', arrow.bend || 0, arrow.lineStyle || 'curved', 0, 0, arrow.orthoY || 0).hX;
      startOrthogonalHandleDrag(arrow.id, 'bend', info, true, { stopPropagation() {}, clientX: 0, clientY: 0 });
    });
    await page.evaluate(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 24, clientY: 0 }));
      window.dispatchEvent(new MouseEvent('mouseup', { clientX: 24, clientY: 0 }));
    });
    const secondBend = await page.evaluate(() => state.arrows[0].bend || 0);
    const delta = secondBend - firstBend;

    expect(delta).toBeGreaterThan(10);
    expect(delta).toBeLessThan(50);
  });
});
