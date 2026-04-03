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

  test('can open the node detail modal from a node', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 640);
    const [nodeId] = await getNodeIds(page);

    await page.locator(`#node-${nodeId}`).dblclick();

    await expect(page.locator('#node-modal-overlay')).toHaveClass(/open/);
    await expect(page.locator('#nm-title-input')).toBeVisible();
    await expect(page.locator('#nm-panel-overview')).toHaveClass(/active/);
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
});
