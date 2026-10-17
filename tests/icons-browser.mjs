import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const base = process.env.DAMA_TEST_URL || 'http://localhost:5173';
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const variants = ['monogram-dark', 'monogram-light', 'board-light', 'board-dark'];
const pngSize = async (path) =>
  page.evaluate(async (path) => {
    const image = new Image();
    image.src = path;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, path);
try {
  await page.goto(base);
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'monogram-dark');
  assert.equal(
    await page.locator('#app-manifest').getAttribute('href'),
    '/manifests/monogram-dark.webmanifest',
  );
  const original = await page.evaluate(() => localStorage.getItem('dama-session-v1'));
  await page.locator('#settings-button').click();
  await page.locator('#icon-settings summary').click();
  assert.equal(await page.locator('input[name="app-icon"]').count(), 4);
  await page.locator('.icon-option:has(input[value="board-light"])').click();
  for (const id of variants) {
    await page.locator(`.icon-option:has(input[value="${id}"])`).click();
    assert.equal(
      await page.locator('#app-manifest').getAttribute('href'),
      `/manifests/${id}.webmanifest`,
    );
    assert.equal(
      await page.locator('#app-touch-icon').getAttribute('href'),
      `/icons/${id}/icon-180.png`,
    );
    assert.equal(await page.evaluate(() => localStorage.getItem('dama-app-icon-v1')), id);
    const response = await page.request.get(`${base}/manifests/${id}.webmanifest`);
    assert.equal(response.status(), 200);
    const manifest = await response.json();
    assert.equal(manifest.id, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.start_url, `/?app-icon=${id}`);
    assert.equal(manifest.display, 'standalone');
    for (const icon of manifest.icons) {
      const size = Number(icon.sizes.split('x')[0]);
      assert.deepEqual(await pngSize(icon.src), [size, size]);
    }
    assert.deepEqual(await pngSize(`/icons/${id}/icon-180.png`), [180, 180]);
    assert.deepEqual(await pngSize(`/icons/${id}/icon-32.png`), [32, 32]);
    const preview = await context.newPage();
    await preview.goto(`${base}/install/${id}.html`);
    assert.equal(
      await preview.locator('link[rel="manifest"]').getAttribute('href'),
      `/manifests/${id}.webmanifest`,
    );
    assert.equal(
      await preview.locator('link[rel="apple-touch-icon"]').getAttribute('href'),
      `/icons/${id}/icon-180.png`,
    );
    const client = await context.newCDPSession(preview);
    const result = await client.send('Page.getAppManifest');
    assert.equal(result.errors.length, 0);
    assert.equal(JSON.parse(result.data).id, '/');
    // Native prompts are browser-controlled: exercise only our event handling here.
    await preview.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      });
      window.dispatchEvent(event);
    });
    await preview.locator('#install-button').click();
    assert.match(await preview.locator('#install-status').textContent(), /dismissed/);
    await preview.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    assert.match(await preview.locator('#install-status').textContent(), /was installed/);
    await preview.close();
  }
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-session-v1')), original);
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'board-dark');
  await page.goto(`${base}/?app-icon=monogram-light`);
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'monogram-light');
  assert.equal(new URL(page.url()).searchParams.has('app-icon'), false);
  await page.locator('#settings-button').click();
  await page.locator('#icon-settings summary').click();
  await page.locator('.icon-option:has(input[value="board-light"])').click();
  await page.locator('#theme').selectOption('dark');
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'board-light');
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'board-light');
  await page.locator('#settings-button').click();
  await page.locator('#icon-settings summary').click();
  await page.screenshot({ path: '.inspection/app-icon-options.png' });
  await page.evaluate(() => localStorage.setItem('dama-app-icon-v1', 'unknown'));
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'monogram-dark');
  // The optional early metadata script must never be required to render the game.
  await page.route('**/icon-bootstrap.js', (route) => route.abort());
  await page.reload();
  assert.equal(await page.locator('#home-screen').isVisible(), true);
  assert.equal(await page.locator('#app-manifest').count(), 1);
  assert.deepEqual(errors, []);
  console.log(
    'Passed: four icon families/sizes, default/persistence/theme independence, launch choice, static install metadata, shared identity, valid Chromium manifests, prompt events and bootstrap fallback. Physical installation remains a device check.',
  );
} finally {
  await browser.close();
}
