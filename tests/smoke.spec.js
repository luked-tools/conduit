const { test, expect } = require('@playwright/test');
const fs = require('fs');

const BLANK_TITLE = 'System Map';
const BLANK_SUBTITLE = 'Processes, platforms, and data flows';
const SAMPLE_TITLE = 'Manufacturing Operations Map';
const SAMPLE_SUBTITLE = 'Example workflow across planning, execution, and quality';

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

async function openLayerOrderSection(page) {
  const frontButton = page.getByRole('button', { name: 'To front' }).first();
  if (await frontButton.isVisible().catch(() => false)) return;
  await page.locator('.prop-section-head', { hasText: 'Layer order' }).click();
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

  test('node layer controls reorder nodes and persist after reload', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 650);
    await addNode(page, 'external', 940, 690);
    const [firstId, secondId] = await getNodeIds(page);

    await expect.poll(async () => page.evaluate(ids => {
      const first = state.nodes.find(node => node.id === ids.firstId);
      const second = state.nodes.find(node => node.id === ids.secondId);
      return [first?.z ?? null, second?.z ?? null];
    }, { firstId, secondId })).toEqual([1, 2]);

    await page.evaluate(id => selectNode(id), firstId);
    await openLayerOrderSection(page);
    await page.getByRole('button', { name: 'To front' }).click();

    await expect.poll(async () => page.evaluate(ids => {
      const first = state.nodes.find(node => node.id === ids.firstId);
      const second = state.nodes.find(node => node.id === ids.secondId);
      return [first?.z ?? null, second?.z ?? null];
    }, { firstId, secondId })).toEqual([2, 1]);

    await expect.poll(async () => page.evaluate(id => {
      const el = document.getElementById(`node-${id}`);
      return el ? getComputedStyle(el).zIndex : null;
    }, firstId)).toBe('2');

    await page.reload();

    await expect.poll(async () => page.evaluate(ids => {
      const first = state.nodes.find(node => node.id === ids.firstId);
      const second = state.nodes.find(node => node.id === ids.secondId);
      return [first?.z ?? null, second?.z ?? null];
    }, { firstId, secondId })).toEqual([2, 1]);
  });

  test('context toolbar appears for selected node and can move it forward', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 880, 640);
    await addNode(page, 'external', 940, 700);
    const [firstId, secondId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), firstId);
    await expect(page.locator('#context-toolbar')).toHaveClass(/visible/);
    await expect(page.locator('#context-toolbar')).toContainText('Forward');
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="Move forward"]')?.click();
    });

    await expect.poll(async () => page.evaluate(ids => {
      const first = state.nodes.find(node => node.id === ids.firstId);
      const second = state.nodes.find(node => node.id === ids.secondId);
      return [first?.z ?? null, second?.z ?? null];
    }, { firstId, secondId })).toEqual([2, 1]);
  });

  test('context toolbar more menu can move a node to front and back', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 920, 680);
    await addNode(page, 'internal', 980, 740);
    const [firstId, secondId, thirdId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), firstId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="More actions"]')?.click();
    });
    await expect(page.locator('#context-toolbar .context-toolbar-menu')).toBeVisible();
    await page.evaluate(() => {
      [...document.querySelectorAll('#context-toolbar .context-toolbar-menu-item')]
        .find(btn => btn.textContent.trim() === 'To front')?.click();
    });

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([3, 1, 2]);

    await page.evaluate(id => selectNode(id), thirdId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="More actions"]')?.click();
      [...document.querySelectorAll('#context-toolbar .context-toolbar-menu-item')]
        .find(btn => btn.textContent.trim() === 'To back')?.click();
    });

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([3, 2, 1]);
  });

  test('context toolbar more menu uses shared menu icons and dividers', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 920, 680);
    const [firstId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), firstId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="More actions"]')?.click();
    });

    await expect(page.locator('#context-toolbar .context-toolbar-menu .app-menu-item-icon svg')).toHaveCount(5);
    await expect(page.locator('#context-toolbar .context-toolbar-menu .app-menu-divider')).toHaveCount(2);
  });

  test('context toolbar can quick connect a node to another node', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 980, 700);
    const [sourceId, targetId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), sourceId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="Quick connect to another node"]')?.click();
    });

    await expect(page.locator('#quick-connect-banner')).toHaveClass(/active/);
    await expect(page.locator('#context-toolbar')).not.toHaveClass(/visible/);

    await page.locator(`#node-${targetId}`).click();

    await expect(page.locator('#quick-connect-banner')).not.toHaveClass(/active/);
    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => {
      const arrow = state.arrows[0];
      return arrow ? { from: arrow.from, to: arrow.to, direction: arrow.direction, lineStyle: arrow.lineStyle } : null;
    })).toEqual({ from: sourceId, to: targetId, direction: 'directed', lineStyle: 'curved' });
  });

  test('quick connect mode cancels on escape', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    const [sourceId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), sourceId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="Quick connect to another node"]')?.click();
    });

    await expect(page.locator('#quick-connect-banner')).toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#quick-connect-banner')).not.toHaveClass(/active/);
    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(0);
  });

  test('node layer controls can move a node backward and to the back', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 840, 620);
    await addNode(page, 'external', 900, 660);
    await addNode(page, 'internal', 960, 700);
    const [firstId, secondId, thirdId] = await getNodeIds(page);

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([1, 2, 3]);

    await page.evaluate(id => selectNode(id), thirdId);
    await openLayerOrderSection(page);
    await page.getByRole('button', { name: 'Backward' }).click();

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([1, 3, 2]);

    await page.getByRole('button', { name: 'To back' }).click();

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([2, 3, 1]);
  });

  test('sidebar can start relative node layering mode and place a node in front of another node', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 840, 620);
    await addNode(page, 'external', 920, 680);
    await addNode(page, 'internal', 1000, 740);
    const [firstId, secondId, thirdId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), firstId);
    await openLayerOrderSection(page);
    await page.getByRole('button', { name: 'In front of...' }).click();

    await expect(page.locator('#layer-target-banner')).toHaveClass(/active/);
    await expect(page.locator('#layer-target-banner')).toContainText('bring this node in front of it');
    await expect(page.locator('#context-toolbar')).not.toHaveClass(/visible/);

    await page.locator(`#node-${secondId}`).click();

    await expect(page.locator('#layer-target-banner')).not.toHaveClass(/active/);
    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([2, 1, 3]);
  });

  test('toolbar more menu can start relative node layering mode and place a node behind another node', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 840, 620);
    await addNode(page, 'external', 920, 680);
    await addNode(page, 'internal', 1000, 740);
    const [firstId, secondId, thirdId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), thirdId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="More actions"]')?.click();
      [...document.querySelectorAll('#context-toolbar .context-toolbar-menu-item')]
        .find(btn => btn.textContent.trim() === 'Send behind...')?.click();
    });

    await expect(page.locator('#layer-target-banner')).toHaveClass(/active/);
    await expect(page.locator('#layer-target-banner')).toContainText('place this node behind it');

    await page.locator(`#node-${firstId}`).click();

    await expect(page.locator('#layer-target-banner')).not.toHaveClass(/active/);
    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([2, 3, 1]);
  });

  test('overlapping nodes select the node on the top layer', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 920, 660);
    await addNode(page, 'external', 920, 660);
    const [bottomId, topId] = await getNodeIds(page);
    const overlapBox = await page.locator(`#node-${topId}`).boundingBox();

    if (!overlapBox) {
      throw new Error('Could not resolve overlapping node bounds');
    }

    const overlapPoint = {
      x: overlapBox.x + overlapBox.width / 2,
      y: overlapBox.y + overlapBox.height / 2
    };

    await expect.poll(async () => page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const host = el?.closest('.node');
      return host?.id || null;
    }, overlapPoint)).toBe(`node-${topId}`);

    await page.evaluate(id => selectNode(id), bottomId);
    await openLayerOrderSection(page);
    await page.getByRole('button', { name: 'To front' }).click();

    await expect.poll(async () => page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const host = el?.closest('.node');
      return host?.id || null;
    }, overlapPoint)).toBe(`node-${bottomId}`);
  });

  test('nodes sidebar can search and filter the node list', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 980, 700);

    await page.evaluate(() => {
      const internal = state.nodes.find(n => n.type === 'internal');
      const external = state.nodes.find(n => n.type === 'external');
      internal.tag = 'ERP';
      internal.title = 'Enterprise Planning';
      external.tag = 'CRM';
      external.title = 'Customer Portal';
      render();
    });

    await page.locator('#node-list-search').fill('erp');
    await expect(page.locator('#node-list .node-list-item')).toHaveCount(1);
    await expect(page.locator('#node-list .node-list-item')).toContainText('ERP');

    await page.locator('#node-list .node-list-item').click();
    await expect.poll(async () => page.evaluate(() => selectedNode)).toBeTruthy();

    await page.locator('#node-list-search').fill('missing');
    await expect(page.locator('#node-list .node-list-empty')).toHaveText('No matching nodes');
  });

  test('newly added nodes and pasted nodes land on the top layer', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 840, 620);
    await addNode(page, 'external', 940, 700);
    const [firstId, secondId] = await getNodeIds(page);

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId])).toEqual([1, 2]);

    await addNode(page, 'internal', 1040, 760);
    const afterAddIds = await getNodeIds(page);
    const newId = afterAddIds[2];

    await expect.poll(async () => page.evaluate(id => state.nodes.find(node => node.id === id)?.z ?? null, newId)).toBe(3);

    await page.evaluate(id => {
      selectNode(id);
      copySelectedNode();
      pasteNode();
    }, firstId);

    const afterPasteIds = await getNodeIds(page);
    expect(afterPasteIds).toHaveLength(4);
    const pastedId = afterPasteIds[afterPasteIds.length - 1];
    await expect.poll(async () => page.evaluate(id => state.nodes.find(node => node.id === id)?.z ?? null, pastedId)).toBe(4);
  });

  test('exported HTML keeps overlapping node layer order', async ({ page, context }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 920, 660);
    await addNode(page, 'external', 920, 660);
    const [firstId, secondId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), firstId);
    await openLayerOrderSection(page);
    await page.getByRole('button', { name: 'To front' }).click();

    const exportPayload = await page.evaluate(() => buildExportHTML({
      showGrid: false,
      showLegend: false,
      showHelp: false
    }));
    const exportPath = `playwright-layer-export-${Date.now()}.html`;
    fs.writeFileSync(exportPath, exportPayload.html, 'utf8');

    const exportPage = await context.newPage();
    await exportPage.goto(`/${exportPath}`);

    await expect.poll(async () => exportPage.locator('.node').count()).toBe(2);
    const zMap = await exportPage.evaluate(() => {
      return [...document.querySelectorAll('.node .node-title')]
        .map(el => {
          const host = el.closest('.node');
          return {
            title: el.textContent.trim(),
            z: host ? getComputedStyle(host).zIndex : null
          };
        });
    });

    expect(zMap.length).toBe(2);
    const topNode = zMap.find(entry => entry.z === '2');
    expect(topNode).toBeTruthy();
    expect(topNode.title).toContain('New System');

    await exportPage.close();
    fs.unlinkSync(exportPath);
  });

  test('layers panel can drag reorder node layers', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 840, 620);
    await addNode(page, 'external', 920, 680);
    await addNode(page, 'internal', 1000, 740);
    const [firstId, secondId, thirdId] = await getNodeIds(page);

    await page.locator('#layers-toggle-btn').click();
    await expect(page.locator('#layers-panel')).toHaveClass(/open/);

    const firstHandle = page.locator(`#layers-panel .layers-row[data-kind="node"][data-id="${firstId}"] .layers-drag-handle`);
    const thirdRow = page.locator(`#layers-panel .layers-row[data-kind="node"][data-id="${thirdId}"]`);
    await firstHandle.dragTo(thirdRow, { targetPosition: { x: 20, y: 2 } });

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.nodes.find(node => node.id === id)?.z ?? null);
    }, [firstId, secondId, thirdId])).toEqual([3, 1, 2]);
  });

  test('layers panel can drag reorder connection layers', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 520);
    await addNode(page, 'external', 1160, 520);
    await addNode(page, 'internal', 760, 820);
    await addNode(page, 'external', 1160, 820);
    const [topLeftId, topRightId, bottomLeftId, bottomRightId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${topLeftId} .conn-point[data-pos="e"]`,
      `#node-${bottomRightId} .conn-point[data-pos="w"]`
    );
    await dragBetween(
      page,
      `#node-${bottomLeftId} .conn-point[data-pos="e"]`,
      `#node-${topRightId} .conn-point[data-pos="w"]`
    );
    const [firstArrowId, secondArrowId] = await page.evaluate(() => state.arrows.map(arrow => arrow.id));

    await page.locator('#layers-toggle-btn').click();
    await expect(page.locator('#layers-panel')).toHaveClass(/open/);

    const firstHandle = page.locator(`#layers-panel .layers-row[data-kind="arrow"][data-id="${firstArrowId}"] .layers-drag-handle`);
    const secondRow = page.locator(`#layers-panel .layers-row[data-kind="arrow"][data-id="${secondArrowId}"]`);
    await firstHandle.dragTo(secondRow, { targetPosition: { x: 20, y: 2 } });

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([2, 1]);
  });

  test('context toolbar stays visible while layers panel is open', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 900, 650);
    const [nodeId] = await getNodeIds(page);

    await page.evaluate(id => selectNode(id), nodeId);
    await page.locator('#layers-toggle-btn').click();

    await expect(page.locator('#layers-panel')).toHaveClass(/open/);
    await expect(page.locator('#context-toolbar')).toHaveClass(/visible/);
    await expect(page.locator('#context-toolbar')).toContainText('Forward');
  });

  test('layers panel filter can switch between nodes and connections', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 840, 620);
    await addNode(page, 'external', 1120, 620);
    const [fromId, toId] = await getNodeIds(page);
    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${toId} .conn-point[data-pos="w"]`
    );

    await page.locator('#layers-toggle-btn').click();
    await expect(page.locator('#layers-panel')).toHaveClass(/open/);

    await page.locator('#layers-panel-filter .layers-filter-btn[data-filter="nodes"]').click();
    await expect(page.locator('#layers-panel .layers-section[data-section="nodes"]')).toBeVisible();
    await expect(page.locator('#layers-panel .layers-section[data-section="connections"]')).toHaveCount(0);

    await page.locator('#layers-panel-filter .layers-filter-btn[data-filter="connections"]').click();
    await expect(page.locator('#layers-panel .layers-section[data-section="connections"]')).toBeVisible();
    await expect(page.locator('#layers-panel .layers-section[data-section="nodes"]')).toHaveCount(0);

    await page.locator('#layers-panel-filter .layers-filter-btn[data-filter="all"]').click();
    await expect(page.locator('#layers-panel .layers-section[data-section="nodes"]')).toBeVisible();
    await expect(page.locator('#layers-panel .layers-section[data-section="connections"]')).toBeVisible();
  });

  test('layers panel scrolls selected item into view', async ({ page }) => {
    await bootFresh(page);

    for (let i = 0; i < 30; i += 1) {
      await addNode(page, 'internal', 820 + (i % 3) * 120, 560 + i * 28);
    }
    const ids = await getNodeIds(page);
    const targetId = ids[ids.length - 1];

    await page.locator('#layers-toggle-btn').click();
    await expect(page.locator('#layers-panel')).toHaveClass(/open/);
    await page.evaluate(() => {
      const body = document.getElementById('layers-panel-body');
      if (body) body.scrollTop = 0;
    });

    await page.evaluate(id => selectNode(id), targetId);

    await expect.poll(async () => page.evaluate(id => {
      const body = document.getElementById('layers-panel-body');
      const row = document.querySelector(`#layers-panel .layers-row[data-kind="node"][data-id="${id}"]`);
      if (!body || !row) return false;
      const bodyRect = body.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return rowRect.top >= bodyRect.top && rowRect.bottom <= bodyRect.bottom;
    }, targetId)).toBe(true);

    await expect(page.locator(`#layers-panel .layers-row[data-kind="node"][data-id="${targetId}"]`)).toHaveClass(/selected/);
  });

  test('layers panel updates immediately when a selected node fill color changes', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await page.locator('#layers-toggle-btn').click();
    await page.locator('.node.internal').first().click();

    await page.locator('.prop-row input[type="color"]').first().evaluate((el, value) => {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, '#ff3366');

    await expect.poll(async () => page.locator('#layers-panel .layers-row.selected .layers-node-preview svg rect').first().getAttribute('fill')).toContain('#ff3366');
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

  test('blank draft uses the default document title and subtitle', async ({ page }) => {
    await bootFresh(page);

    await expect(page.locator('#diagram-title-input')).toHaveValue(BLANK_TITLE);
    await expect(page.locator('#diagram-subtitle-input')).toHaveValue(BLANK_SUBTITLE);
    await expect(page.locator('#document-panel-preview-title')).toHaveText(BLANK_TITLE);
    await expect(page.locator('#document-panel-preview-subtitle')).toHaveText(BLANK_SUBTITLE);
  });

  test('sample load applies the sample document title and subtitle', async ({ page }) => {
    await bootFresh(page);

    await page.evaluate(() => {
      loadSampleIntoCurrentDraft();
    });

    await expect(page.locator('#diagram-title-input')).toHaveValue(SAMPLE_TITLE);
    await expect(page.locator('#diagram-subtitle-input')).toHaveValue(SAMPLE_SUBTITLE);
    await expect(page.locator('#document-panel-preview-title')).toHaveText(SAMPLE_TITLE);
    await expect(page.locator('#document-panel-preview-subtitle')).toHaveText(SAMPLE_SUBTITLE);
  });

  test('creating a new draft resets document metadata to the blank defaults', async ({ page }) => {
    await bootFresh(page);

    await page.locator('#diagram-title-input').fill('Temporary Working Title');
    await page.locator('#diagram-subtitle-input').fill('Temporary working subtitle');
    await page.evaluate(() => {
      createDraftFromPayload(createBlankDiagramPayload(), 'Fresh Draft', { activate: true });
      saveToLocalStorage();
    });

    await expect(page.locator('#active-draft-chip')).toContainText('Fresh Draft');
    await expect(page.locator('#diagram-title-input')).toHaveValue(BLANK_TITLE);
    await expect(page.locator('#diagram-subtitle-input')).toHaveValue(BLANK_SUBTITLE);
  });

  test('sample document metadata persists after reload', async ({ page }) => {
    await bootFresh(page);

    await page.evaluate(() => {
      loadSampleIntoCurrentDraft();
    });

    await page.reload();

    await expect(page.locator('#diagram-title-input')).toHaveValue(SAMPLE_TITLE);
    await expect(page.locator('#diagram-subtitle-input')).toHaveValue(SAMPLE_SUBTITLE);
    await expect(page.locator('#document-panel-preview-title')).toHaveText(SAMPLE_TITLE);
    await expect(page.locator('#document-panel-preview-subtitle')).toHaveText(SAMPLE_SUBTITLE);
  });

  test('sample load normalizes layer numbering in the layers panel', async ({ page }) => {
    await bootFresh(page);

    await page.evaluate(() => {
      loadSampleIntoCurrentDraft();
    });
    await page.locator('#layers-toggle-btn').click();

    const panelText = await page.locator('#layers-panel-body').textContent();
    expect(panelText).not.toContain('Layer 100');
    expect(panelText).not.toContain('Layer 200');
    expect(panelText).toContain('Layer 1');
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

  test('sample arrow labels remain selectable inside the boundary area', async ({ page }) => {
    await bootFresh(page);

    await page.evaluate(() => {
      loadSampleIntoCurrentDraft();
    });

    await page.locator('#arrow-svg text', { hasText: 'Engineering sync' }).click();
    await expect.poll(async () => page.evaluate(() => selectedArrow)).toBe('a4');
  });

  test('context toolbar appears for selected connection and can move it forward', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 520);
    await addNode(page, 'external', 1160, 520);
    await addNode(page, 'internal', 760, 820);
    await addNode(page, 'external', 1160, 820);
    const [topLeftId, topRightId, bottomLeftId, bottomRightId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${topLeftId} .conn-point[data-pos="e"]`,
      `#node-${bottomRightId} .conn-point[data-pos="w"]`
    );
    await dragBetween(
      page,
      `#node-${bottomLeftId} .conn-point[data-pos="e"]`,
      `#node-${topRightId} .conn-point[data-pos="w"]`
    );

    const [firstArrowId, secondArrowId] = await page.evaluate(() => state.arrows.map(arrow => arrow.id));
    await page.evaluate(id => selectArrow(id), firstArrowId);

    await expect(page.locator('#context-toolbar')).toHaveClass(/visible/);
    await expect(page.locator('#context-toolbar')).toContainText('Forward');
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="Move forward"]')?.click();
    });

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([2, 1]);
  });

  test('context toolbar more menu can move a connection to front and back', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 520);
    await addNode(page, 'external', 1160, 520);
    await addNode(page, 'internal', 760, 820);
    await addNode(page, 'external', 1160, 820);
    const [topLeftId, topRightId, bottomLeftId, bottomRightId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${topLeftId} .conn-point[data-pos="e"]`,
      `#node-${bottomRightId} .conn-point[data-pos="w"]`
    );
    await dragBetween(
      page,
      `#node-${bottomLeftId} .conn-point[data-pos="e"]`,
      `#node-${topRightId} .conn-point[data-pos="w"]`
    );

    const [firstArrowId, secondArrowId] = await page.evaluate(() => state.arrows.map(arrow => arrow.id));

    await page.evaluate(id => selectArrow(id), firstArrowId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="More actions"]')?.click();
      [...document.querySelectorAll('#context-toolbar .context-toolbar-menu-item')]
        .find(btn => btn.textContent.trim() === 'To front')?.click();
    });
    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([2, 1]);

    await page.evaluate(id => selectArrow(id), secondArrowId);
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="More actions"]')?.click();
      [...document.querySelectorAll('#context-toolbar .context-toolbar-menu-item')]
        .find(btn => btn.textContent.trim() === 'To back')?.click();
    });
    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([2, 1]);
  });

  test('connection layer controls reorder connectors and persist after reload', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 520);
    await addNode(page, 'external', 1160, 520);
    await addNode(page, 'internal', 760, 820);
    await addNode(page, 'external', 1160, 820);
    const [topLeftId, topRightId, bottomLeftId, bottomRightId] = await getNodeIds(page);

    await dragBetween(
      page,
      `#node-${topLeftId} .conn-point[data-pos="e"]`,
      `#node-${bottomRightId} .conn-point[data-pos="w"]`
    );
    await dragBetween(
      page,
      `#node-${bottomLeftId} .conn-point[data-pos="e"]`,
      `#node-${topRightId} .conn-point[data-pos="w"]`
    );

    const [firstArrowId, secondArrowId] = await page.evaluate(() => state.arrows.map(arrow => arrow.id));

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([1, 2]);

    await page.evaluate(id => selectArrow(id), firstArrowId);
    await page.getByRole('button', { name: 'To front' }).click();

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([2, 1]);

    await page.reload();

    await expect.poll(async () => page.evaluate(ids => {
      return ids.map(id => state.arrows.find(arrow => arrow.id === id)?.z ?? null);
    }, [firstArrowId, secondArrowId])).toEqual([2, 1]);
  });

  test('new connection drag shows the target node tooltip', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 860, 620);
    await addNode(page, 'external', 1180, 620);
    const [fromId, toId] = await getNodeIds(page);

    await page.evaluate(id => {
      const node = state.nodes.find(n => n.id === id);
      if (!node) return;
      node.title = 'Receiving System';
      render();
    }, toId);

    const fromBox = await page.locator(`#node-${fromId} .conn-point[data-pos="e"]`).boundingBox();
    const toBox = await page.locator(`#node-${toId} .conn-point[data-pos="w"]`).boundingBox();

    if (!fromBox || !toBox) {
      throw new Error('Could not resolve connection tooltip endpoints');
    }

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, { steps: 12 });

    await expect(page.locator('#connect-tooltip')).toHaveClass(/visible/);
    await expect(page.locator('#connect-tooltip')).toContainText('Receiving System');

    await page.mouse.up();
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
    const targetBox = await page.locator(`#node-${toId}`).boundingBox();

    if (!fromBox || !targetBox) {
      throw new Error('Could not resolve connection drag nodes');
    }

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 8 });

    await expect.poll(async () => page.evaluate(() => document.body.classList.contains('connecting'))).toBe(true);
    await expect.poll(async () => page.evaluate(() => document.getElementById('context-toolbar')?.classList.contains('visible'))).toBe(false);

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

  test('endpoint drag shows the target node tooltip', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 760, 620);
    await addNode(page, 'external', 1080, 620);
    await addNode(page, 'internal', 1360, 620);
    const [fromId, firstTargetId, secondTargetId] = await getNodeIds(page);

    await page.evaluate(id => {
      const node = state.nodes.find(n => n.id === id);
      if (!node) return;
      node.title = 'Fallback Target';
      render();
    }, secondTargetId);

    await dragBetween(
      page,
      `#node-${fromId} .conn-point[data-pos="e"]`,
      `#node-${firstTargetId} .conn-point[data-pos="w"]`
    );

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);

    await page.evaluate(() => {
      selectArrow(state.arrows[0].id);
    });

    const handleBox = await page.locator('.arrow-endpoint-handle .hit').nth(1).boundingBox();
    const targetBox = await page.locator(`#node-${secondTargetId} .conn-point[data-pos="w"]`).boundingBox();

    if (!handleBox || !targetBox) {
      throw new Error('Could not resolve endpoint tooltip elements');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 12 });

    await expect(page.locator('#connect-tooltip')).toHaveClass(/visible/);
    await expect(page.locator('#connect-tooltip')).toContainText('Fallback Target');

    await page.mouse.up();
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

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].to)).toBe(boundaryId);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].toOffset !== null)).toBe(true);
  });

  test('normal nodes can use flexible edge snap when dragging near an edge', async ({ page }) => {
    await bootFresh(page);

    await addNode(page, 'internal', 560, 620);
    await addNode(page, 'external', 900, 520);
    const [fromId, targetId] = await getNodeIds(page);

    const fromBox = await page.locator(`#node-${fromId} .conn-point[data-pos="e"]`).boundingBox();
    const targetBox = await page.locator(`#node-${targetId}`).boundingBox();

    if (!fromBox || !targetBox) {
      throw new Error('Could not resolve normal-node flexible edge snap elements');
    }

    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const nearLeftEdgeX = targetBox.x + 10;
    const edgeY = targetBox.y + targetBox.height * 0.34;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(nearLeftEdgeX, edgeY, { steps: 12 });
    await page.mouse.up();

    await expect.poll(async () => page.evaluate(() => state.arrows.length)).toBe(1);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].to)).toBe(targetId);
    await expect.poll(async () => page.evaluate(() => state.arrows[0].toOffset !== null)).toBe(true);
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
    await page.evaluate(() => {
document.querySelector('#context-toolbar button[title="Rename title and description"]')?.click();
    });

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
    await page.evaluate(() => {
document.querySelector('#context-toolbar button[title="Rename title and description"]')?.click();
    });
    await expect(page.locator('.node-quick-edit-panel')).toBeVisible();
    await page.locator('.node-quick-edit-field.title').press('Escape');
    await expect(page.locator('.node-quick-edit-panel')).toHaveCount(0);

    await page.evaluate(() => {
document.querySelector('#context-toolbar button[title="Rename title and description"]')?.click();
    });
    await expect(page.locator('.node-quick-edit-panel')).toBeVisible();
    await page.locator('#topbar').click({ position: { x: 20, y: 20 } });
    await expect(page.locator('.node-quick-edit-panel')).toHaveCount(0);
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

  test('custom theme preset can be reselected after switching to another preset', async ({ page }) => {
    await bootFresh(page);

    await page.locator('#theme-toggle-btn').click();

    const customBtn = page.locator('.theme-preset-btn', { hasText: 'Custom' });
    await expect(customBtn).toBeDisabled();

    const bgHexInput = page.locator('.theme-hex[data-var="--bg"]');
    await bgHexInput.fill('#123456');
    await bgHexInput.blur();

    await expect(customBtn).toBeEnabled();
    await expect(customBtn).toHaveClass(/active/);

    const customBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    );
    expect(customBg).toBe('#123456');

    await page.locator('.theme-preset-btn', { hasText: 'Midnight' }).click();
    await expect(customBtn).not.toHaveClass(/active/);

    const midnightBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    );
    expect(midnightBg).not.toBe(customBg);

    await customBtn.click();
    await expect(customBtn).toHaveClass(/active/);

    await expect.poll(async () => page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    )).toBe(customBg);
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

    await expect(exportedPage.locator('#export-header h1')).toContainText(BLANK_TITLE);
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
    await page.locator('.node.internal').first().click();
    await page.evaluate(() => {
      document.querySelector('#context-toolbar button[title="Quick connect to another node"]')?.click();
    });
    await expect(page.locator('#quick-connect-banner')).toContainText('Quick connect');
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
