import { test, expect } from '@playwright/test';

test.describe('Hexham Pathfinding Visualizer', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    await page.goto('/?speed=instant');
  });

  test.afterEach(async () => {
    expect(consoleErrors, 'Expected no console errors').toEqual([]);
  });

  test('loads without errors and shows canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('has all tool buttons visible', async ({ page }) => {
    await expect(page.locator('button.tile-btn[data-type="move"]')).toBeVisible();
    await expect(page.locator('button.tile-btn[data-type="start"]')).toBeVisible();
    await expect(page.locator('button.tile-btn[data-type="end"]')).toBeVisible();
    await expect(page.locator('button.tile-btn[data-type="wall"]')).toBeVisible();
    await expect(page.locator('button.tile-btn[data-type="standard"]')).toBeVisible();
  });

  test('can select each tool button', async ({ page }) => {
    const tools = ['move', 'start', 'end', 'wall', 'standard'];

    for (const tool of tools) {
      const button = page.locator(`button.tile-btn[data-type="${tool}"]`);
      await button.click();
      await expect(button).toHaveClass(/active/);
    }
  });

  test('has all algorithm options', async ({ page }) => {
    const select = page.locator('#algorithm-select');
    await expect(select).toBeVisible();

    await expect(select.locator('option[value="bfs"]')).toHaveText('Breadth First Search');
    await expect(select.locator('option[value="dfs"]')).toHaveText('Depth First Search');
    await expect(select.locator('option[value="astar"]')).toHaveText('A*');
    await expect(select.locator('option[value="greedy"]')).toHaveText('Greedy Best-First');
  });

  test('can change algorithm selection', async ({ page }) => {
    const select = page.locator('#algorithm-select');

    await select.selectOption('dfs');
    await expect(select).toHaveValue('dfs');

    await select.selectOption('astar');
    await expect(select).toHaveValue('astar');

    await select.selectOption('greedy');
    await expect(select).toHaveValue('greedy');

    await select.selectOption('bfs');
    await expect(select).toHaveValue('bfs');
  });

  test('has all map generator options', async ({ page }) => {
    const select = page.locator('#map-select');
    await expect(select).toBeVisible();

    await expect(select.locator('option[value="empty"]')).toHaveText('Empty');
    await expect(select.locator('option[value="maze"]')).toHaveText('Maze');
    await expect(select.locator('option[value="scatter"]')).toHaveText('Scattered');
    await expect(select.locator('option[value="rooms"]')).toHaveText('Rooms');
  });

  test('can generate each map type', async ({ page }) => {
    const mapSelect = page.locator('#map-select');
    const generateBtn = page.locator('#generate-btn');

    const mapTypes = ['empty', 'maze', 'scatter', 'rooms'];

    for (const mapType of mapTypes) {
      await mapSelect.selectOption(mapType);
      await generateBtn.click();
      // Wait a moment for generation to complete
      await page.waitForTimeout(100);
    }
  });

  test('Go button is enabled on page load (empty map has start/end)', async ({ page }) => {
    const goBtn = page.locator('#go-btn');
    await expect(goBtn).toBeEnabled();
  });

  test('can run pathfinding without errors', async ({ page }) => {
    const goBtn = page.locator('#go-btn');
    await expect(goBtn).toBeEnabled();

    await goBtn.click();

    // Wait for pathfinding animation to complete
    await page.waitForTimeout(2000);
  });

  test('can run pathfinding with each algorithm', async ({ page }) => {
    const algorithmSelect = page.locator('#algorithm-select');
    const goBtn = page.locator('#go-btn');
    const generateBtn = page.locator('#generate-btn');

    const algorithms = ['bfs', 'dfs', 'astar', 'greedy'];

    for (const algorithm of algorithms) {
      // Reset to empty map
      await page.locator('#map-select').selectOption('empty');
      await generateBtn.click();
      await page.waitForTimeout(50);

      // Select algorithm and run
      await algorithmSelect.selectOption(algorithm);
      await goBtn.click();

      // Wait for pathfinding to complete
      await page.waitForTimeout(1500);
    }
  });

  test('keyboard shortcuts work for tool selection', async ({ page }) => {
    // Press 1-5 to select tools
    const toolMap = {
      '1': 'move',
      '2': 'start',
      '3': 'end',
      '4': 'wall',
      '5': 'standard'
    };

    for (const [key, tool] of Object.entries(toolMap)) {
      await page.keyboard.press(key);
      const button = page.locator(`button.tile-btn[data-type="${tool}"]`);
      await expect(button).toHaveClass(/active/);
    }
  });

  test('R key resets view without errors', async ({ page }) => {
    await page.keyboard.press('r');
    await page.waitForTimeout(100);
  });
});
