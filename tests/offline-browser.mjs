import { chromium, expect } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
await mkdir(resolve('.inspection'), { recursive: true });
const temp = await mkdtemp(resolve('.inspection/offline-'));
const first = resolve(temp, 'v1'),
  second = resolve(temp, 'v2');
await cp(resolve('dist'), first, { recursive: true });
await cp(resolve('dist'), second, { recursive: true });
const html = await readFile(resolve(second, 'index.html'), 'utf8');
await writeFile(
  resolve(second, 'index.html'),
  html.replace('<title>', '<title>Offline update test · '),
);
execFileSync(process.execPath, ['scripts/build-offline.mjs', second]);
let release = first;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain',
};
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  // Cloudflare Pages redirects physical HTML files to canonical public URLs.
  if (pathname.endsWith('.html')) {
    res.writeHead(308, { Location: pathname === '/index.html' ? '/' : pathname.slice(0, -5) });
    res.end();
    return;
  }
  const file =
    pathname === '/'
      ? '/index.html'
      : pathname.startsWith('/install/') && !extname(pathname)
        ? pathname + '.html'
        : pathname;
  const path = resolve(release, '.' + file);
  if (!path.startsWith(release + '/') && !path.startsWith(release + '\\')) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const content = await readFile(path);
    res.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
context.setDefaultTimeout(15000);
const page = await context.newPage(),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() =>
  localStorage.setItem(
    'dama-settings-v1',
    JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
  ),
);
const snapshot = () =>
  page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => k !== 'dama-screen')
        .map((k) => [k, localStorage.getItem(k)]),
    ),
  );
async function settings() {
  await page.locator('#settings-button').click();
  await page.locator('#pwa-settings').evaluate((el) => {
    el.open = true;
  });
}
async function ready() {
  await page.waitForFunction(
    () =>
      document.querySelector('#pwa-status').textContent.includes('Ready for offline') ||
      document.querySelector('#pwa-status').textContent.includes('downloaded game is ready'),
  );
}
async function home() {
  await page.locator('#home-button').click();
}
try {
  await page.goto(base);
  await settings();
  await ready();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.locator('#pwa-install').click();
  assert.match(await page.locator('#pwa-install-help').textContent(), /Add to Home Screen/);
  // Simulate browser events, without claiming a real operating-system install.
  await page.evaluate(() => {
    window.installCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = async () => {
      window.installCalls++;
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  assert.equal(await page.locator('#pwa-install').textContent(), 'Install DA’MA');
  await page.locator('#pwa-install').click();
  assert.equal(await page.evaluate(() => window.installCalls), 1);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  assert.equal(await page.locator('#pwa-install').isHidden(), true);
  await page.screenshot({ path: '.inspection/offline-settings.png' });
  const versionOne = await page.evaluate(async () =>
    (await caches.keys()).find((k) => k.startsWith('dama-shell-')),
  );
  assert.equal(
    await page.evaluate(async () => {
      const cache = await caches.open(
        (await caches.keys()).find((name) => name.startsWith('dama-shell-')),
      );
      return (await cache.match('/index.html')).redirected;
    }),
    false,
  );
  await page.locator('#settings .primary').click();
  await context.setOffline(true);
  await page.reload();
  assert.equal(await page.locator('#home-screen').isVisible(), true);
  // Every map and the actual computer worker remain playable without network access.
  await page.locator('label:has(#track-free-play)').click();
  for (const [id, from, to] of [
    ['classic', 2, 4],
    ['crossroads', 2, 1],
    ['ring-road', 2, 1],
    ['twin-bridges', 3, 2],
    ['long-crossing', 4, 3],
    ['islands', 5, 4],
    ['diamond', 2, 4],
    ['weave', 3, 2],
    ['switchyard', 2, 1],
  ]) {
    await page.locator(`label:has(#map-${id})`).click();
    await page.locator('#start-button').click();
    if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
    await page.locator(`[data-node="${from}"]`).click();
    await page.locator(`[data-node="${to}"]`).click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2 &&
        !document.querySelector('.traveller'),
    );
    await home();
  }
  // The optional movement rule and both allowances must survive an offline reload.
  await page.locator('label:has(#map-weave)').click();
  await page.locator('label:has(#difficulty-expert)').click();
  await page.locator('label:has(#movement-one-retreat)').click();
  await page.locator('#start-button').click();
  if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
  await page.locator('[data-node="3"]').click();
  await page.locator('[data-node="2"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  const restricted = await page.evaluate(
    () => JSON.parse(localStorage.getItem('dama-session-v1')).state,
  );
  assert.ok(restricted.retreats);
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).difficulty),
    'expert',
  );
  await page.reload();
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state),
    restricted,
  );
  assert.equal(await page.locator('#blue-retreat').isVisible(), true);
  await home();
  const match = await page.evaluate(() => localStorage.getItem('dama-session-v1'));
  await page.locator('#puzzles-button').click();
  await page.locator('[data-puzzle="last-step"]').click();
  await page.locator('[data-node="7"]').click();
  await page.locator('[data-node="6"]').click();
  await page.waitForSelector('#result-panel[open]');
  await page.locator('#next-puzzle').click();
  await page.locator('[data-node="5"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-puzzle-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  await home();
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-session-v1')), match);
  await settings();
  await ready();
  await page.locator('#icon-settings summary').click();
  await page.locator('.icon-option:has(input[value="board-light"])').click();
  const icon = await context.newPage();
  await icon.goto(`${base}/install/board-light.html`);
  assert.equal(await icon.locator('h1').textContent(), 'Board · Light');
  for (const variant of ['board-light', 'board-dark', 'monogram-light', 'monogram-dark']) {
    await icon.goto(`${base}/install/${variant}`);
    assert.match(await icon.locator('h1').textContent(), /Board|Monogram/);
    await icon.reload();
    assert.match(await icon.locator('h1').textContent(), /Board|Monogram/);
  }
  await icon.goto(`${base}/?app-icon=monogram-light`);
  assert.equal(await icon.locator('html').getAttribute('data-app-icon'), 'monogram-light');
  await icon.goto(`${base}/index.html`);
  assert.equal(await icon.locator('#home-screen').isVisible(), true);
  await icon.close();
  await page.reload();
  await settings();
  await page.locator('#icon-settings').evaluate((el) => {
    el.open = true;
  });
  await page.locator('.icon-option:has(input[value="board-light"])').click();
  await page.locator('#settings .primary').click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'board-light');
  await context.setOffline(false);
  // Unrelated origin caches must survive DA'MA updates.
  await page.evaluate(async () => {
    const cache = await caches.open('unrelated-cache');
    await cache.put('/unrelated', new Response('keep'));
  });
  const other = await context.newPage();
  await other.goto(base);
  release = second;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
  await page.waitForFunction(
    async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
  );
  assert.ok(!(await page.title()).includes('Offline update test'));
  // Waiting updates cannot interrupt active play.
  await page.locator('#continue-button').click();
  await page.locator('#pause-button').click();
  await page.locator('#pause-settings').click();
  await page.locator('#pwa-settings').evaluate((el) => {
    el.open = true;
  });
  assert.equal(await page.locator('#pwa-update-settings').isDisabled(), true);
  await page.locator('#settings .primary').click();
  await page.locator('#pause .primary').click();
  await home();
  const before = await snapshot();
  await page.locator('#pwa-update').click();
  await settings();
  assert.match(await page.locator('#pwa-status').textContent(), /Close other/);
  assert.ok(!(await page.title()).includes('Offline update test'));
  await other.close();
  await expect
    .poll(async () =>
      context
        .serviceWorkers()[0]
        .evaluate(
          async () =>
            (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).length,
        ),
    )
    .toBe(1);
  // A failed local save must prevent activation and leave the existing release open.
  await page.evaluate(() => {
    window.originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dama-session-v1') throw new Error('Simulated unavailable save storage');
      return window.originalSetItem.call(this, key, value);
    };
  });
  await page.locator('#pwa-update-settings').click();
  assert.match(await page.locator('#pwa-status').textContent(), /save could not be written/);
  assert.ok(!(await page.title()).includes('Offline update test'));
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalSetItem;
  });
  await Promise.all([page.waitForNavigation(), page.locator('#pwa-update-settings').click()]);
  assert.match(await page.title(), /Offline update test/);
  assert.deepEqual(await snapshot(), before);
  assert.equal(await page.locator('html').getAttribute('data-app-icon'), 'board-light');
  const names = await page.evaluate(() => caches.keys());
  assert.ok(names.includes(versionOne));
  assert.ok(names.includes('unrelated-cache'));
  assert.equal(names.filter((name) => name.startsWith('dama-shell-')).length, 2);
  await context.setOffline(true);
  await page.reload();
  assert.match(await page.title(), /Offline update test/);
  assert.deepEqual(await snapshot(), before);
  // Repair one missing cached file without touching saved games.
  await context.setOffline(false);
  await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith('dama-shell-'));
    await (await caches.open(names.at(-1))).delete('/install/board-dark.html');
  });
  await page.reload();
  await settings();
  await expect(page.locator('#pwa-retry')).toBeVisible();
  await page.locator('#pwa-retry').click();
  await ready();
  assert.deepEqual(await snapshot(), before);
  await page.locator('#settings .primary').click();
  // A failed/tampered release cannot replace the working offline cache.
  await context.setOffline(false);
  const failed = resolve(temp, 'bad');
  await cp(second, failed, { recursive: true });
  await writeFile(
    resolve(failed, 'index.html'),
    html.replace('<title>', '<title>Broken release · '),
  );
  execFileSync(process.execPath, ['scripts/build-offline.mjs', failed]);
  await writeFile(resolve(failed, 'index.html'), 'invalid after integrity was generated');
  release = failed;
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration()).update();
  });
  await page.waitForFunction(
    async () => !(await navigator.serviceWorker.getRegistration()).installing,
  );
  await context.setOffline(true);
  await page.reload();
  assert.match(await page.title(), /Offline update test/);
  assert.ok(!(await page.title()).includes('Broken release'));
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(errors, []);
  console.log(
    'Passed: offline reload, all nine rival-worker boards, puzzle/defence worker, icon preview, install event UI, safe waiting update, active-game and multi-tab guards, save preservation, cache repair and rejected corrupt release.',
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
