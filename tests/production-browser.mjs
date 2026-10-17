import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';

const baseURL = process.env.DAMA_TEST_URL || 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.url().startsWith(baseURL) && response.status() >= 400) {
    errors.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto(baseURL);
  assert.equal(await page.locator('#home-screen').isVisible(), true);
  assert.equal(
    await page.locator('.source-link').getAttribute('href'),
    'https://github.com/BirukTes/dama',
  );
  await page.locator('#start-button').click();
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2,
  );
  await page.waitForFunction(() => !document.querySelector('#undo-button').disabled);
  let before = await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state);
  await page.reload();
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state),
    before,
  );
  await page.locator('#home-button').click();
  for (const [id, nodes, lines, from, to] of [
    ['ring-road', 9, 10, 2, 1],
    ['twin-bridges', 12, 16, 3, 2],
    ['long-crossing', 15, 22, 4, 3],
    ['islands', 9, 11, 5, 4],
  ]) {
    await page.locator(`label:has(#map-${id})`).click();
    await page.locator('[data-rival="guardian"]').click();
    await page.locator('#start-button').click();
    if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
    assert.equal(await page.locator('#board [data-node]').count(), nodes);
    assert.equal(await page.locator('#board line').count(), lines);
    await page.locator(`[data-node="${from}"]`).click();
    await page.locator(`[data-node="${to}"]`).click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2 &&
        !document.querySelector('.traveller'),
    );
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state.map),
      id,
    );
    await page.reload();
    assert.equal(await page.locator('#board [data-node]').count(), nodes);
    await page.locator('#home-button').click();
  }
  await page.locator('#home-button').click();
  await page.locator('label:has(#map-crossroads)').click();
  await page.locator('#start-button').click();
  await page.locator('#confirm-new').click();
  assert.equal(await page.locator('#board line').count(), 12);
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="1"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state.map),
    'crossroads',
  );
  before = await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state);
  await page.locator('#pause-button').click();
  assert.equal(await page.locator('#pause[open]').count(), 1);
  await page.locator('#pause .primary').click();
  await page.locator('#home-button').click();
  await page.locator('#puzzles-button').click();
  await page.locator('[data-puzzle="last-step"]').click();
  await page.locator('[data-node="7"]').click();
  await page.locator('[data-node="6"]').click();
  await page.waitForSelector('#result-panel[open]');
  assert.equal(await page.locator('#result-title').textContent(), 'Puzzle solved!');
  await page.locator('#next-puzzle').click();
  await page.locator('[data-node="5"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-puzzle-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state),
    before,
  );
  for (const path of ['/licenses/dm-sans-OFL.txt', '/licenses/dama-MIT.txt']) {
    const response = await page.request.get(new URL(path, baseURL).href);
    assert.equal(response.status(), 200);
    assert.match(
      await response.text(),
      path.includes('dm-sans') ? /SIL OPEN FONT LICENSE/ : /MIT License/,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        url: baseURL,
        checks: [
          'production Home',
          'source link',
          'built computer worker',
          'Crossroads graph and bundled rival worker',
          'four additional map graphs, Guardian worker and saved reloads',
          'puzzle completion and bundled defence worker',
          'puzzle play preserves the regular match',
          'saved reload',
          'pause',
          'bundled licences',
          'asset loading',
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
