import { chromium } from '@playwright/test';

async function takeScreenshot() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 }
  });

  // Start local server and navigate
  const { spawn } = await import('child_process');
  const server = spawn('npx', ['serve', '-l', '3000', '.'], {
    stdio: 'pipe',
    shell: true
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    await page.goto('http://localhost:3000/?speed=instant');
    await page.waitForSelector('canvas');

    // Generate a maze
    await page.locator('#map-select').selectOption('rooms');
    await page.locator('#generate-btn').click();
    await page.waitForTimeout(200);

    // Use A* algorithm for nice visualization
    await page.locator('#algorithm-select').selectOption('astar');

    // Run pathfinding
    await page.locator('#go-btn').click();

    // Wait for animation to complete
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved to screenshot.png');

  } finally {
    await browser.close();
    server.kill();
  }
}

takeScreenshot().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Screenshot failed:', err);
  process.exit(1);
});
