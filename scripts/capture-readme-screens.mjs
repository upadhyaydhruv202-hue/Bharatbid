/**
 * Capture clean README screenshots with Playwright (real Chromium viewport).
 * Usage: node scripts/capture-readme-screens.mjs
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../docs/assets');
const base = process.env.APP_URL || 'http://127.0.0.1:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

async function shot(name) {
  const dest = path.join(outDir, name);
  await page.screenshot({ path: dest, type: 'png', fullPage: false });
  console.log('wrote', dest);
}

await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.locator('.bb-auth-card').waitFor({ state: 'visible' });
await shot('ui-login.png');

await page.goto(`${base}/signup`, { waitUntil: 'networkidle' });
await page.locator('.bb-auth-card').waitFor({ state: 'visible' });
await shot('ui-signup.png');

await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Sign in with password/i }).click();
await page.getByLabel(/^Email$/i).fill('demo.officer@example.com');
await page.getByLabel(/^Password$/i).fill('demo-password');
await page.getByRole('button', { name: /^Sign in$/i }).click();
await page.waitForURL(/\/bharatbid/, { timeout: 20000 });
await page.waitForTimeout(3000);
await shot('ui-command-center.png');

await browser.close();
console.log('done');
