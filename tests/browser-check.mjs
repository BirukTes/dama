import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [],
  nativeDialogs = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', async (d) => {
  nativeDialogs.push(d.type());
  await d.dismiss();
});
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem('dama-qa-fixture');
  if (fixture) {
    localStorage.setItem('dama-session-v1', fixture);
    sessionStorage.removeItem('dama-qa-fixture');
    sessionStorage.setItem('dama-screen', 'play');
  }
});
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')));
async function settled() {
  await page.waitForFunction(() => !document.querySelector('.traveller'));
}
async function fixture(board, mode, delivered = { blue: 0, coral: 0 }) {
  await page.evaluate(
    async ({ board, mode, delivered }) => {
      const { key } = await import('/src/game/rules.ts');
      const state = { board, delivered, turn: 'coral', turns: 0, history: [], result: null };
      state.history = [key(state)];
      sessionStorage.setItem(
        'dama-qa-fixture',
        JSON.stringify({
          version: 1,
          state,
          mode,
          difficulty: 'standard',
          undo: [],
          starter: 'coral',
        }),
      );
    },
    { board, mode, delivered },
  );
  await page.reload();
}
await page.goto('http://localhost:5173/');
assert.equal(await page.locator('#home-screen').isVisible(), true);
assert.equal(await page.locator('#play-screen').isVisible(), false);
assert.equal(await page.locator('#continue-button').isVisible(), false);
await page.screenshot({ path: '.inspection/home-desktop.png', fullPage: true });
await page.locator('#solo-button').click();
await page.locator('#start-button').click();
assert.equal(await page.locator('#home-screen').isVisible(), false);
await page.screenshot({ path: '.inspection/desktop.png', fullPage: true });
await page.locator('[data-node="2"]').click();
assert.equal(await page.locator('.node.legal').count(), 2);
await page.locator('[data-node="4"]').click();
await settled();
await page.locator('#pause-button').click();
const paused = (await saved()).state;
await page.waitForTimeout(800);
assert.deepEqual((await saved()).state, paused);
await page.locator('#pause-settings').click();
await page.locator('#settings .primary').click();
await page.waitForSelector('#pause[open]');
await page.locator('#pause .primary').click();
await page.waitForFunction(
  () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2,
);
await page.waitForFunction(() => !document.querySelector('#undo-button').disabled);
await page.locator('#undo-button').click();
assert.equal((await saved()).state.turns, 0);
await page.locator('#home-button').click();
assert.equal(await page.locator('#continue-button').isVisible(), true);
await page.locator('#local-button').click();
await page.locator('#start-button').click();
assert.equal((await saved()).mode, 'local');
assert.equal((await saved()).state.turn, 'blue');
let count = 0;
while (count++ < 105) {
  const next = await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
    if (s.result) return { result: s.result };
    const { chooseMove } = await import('/src/ai/search.ts');
    return { move: chooseMove(s, 'standard') };
  });
  if (next.result) break;
  const before = (await saved()).state.turns;
  await page.locator(`[data-node="${next.move.from}"]`).click();
  await page.locator(`[data-node="${next.move.to}"]`).click();
  await page.waitForFunction(
    (t) =>
      JSON.parse(localStorage.getItem('dama-session-v1')).state.turns > t &&
      !document.querySelector('.traveller'),
    before,
  );
}
const finished = (await saved()).state;
assert.ok(finished.result);
await page.reload();
assert.deepEqual((await saved()).state, finished);
assert.equal(await page.locator('#result-panel[open]').count(), 1);
const finalBoard = await page.locator('#board').boundingBox();
await page.locator('#result-panel .close').click();
assert.deepEqual(await page.locator('#board').boundingBox(), finalBoard);
await page.locator('#pause-button').click();
await page.locator('#pause-help').click();
await page.keyboard.press('Escape');
await page.waitForSelector('#pause[open]');
await page.locator('#pause .primary').click();
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('#settings-button').click();
await page.locator('#motion').check();
await page.locator('#settings .primary').click();
await page.locator('#new-button').click();
assert.equal(await page.locator('dialog[open]').count(), 0);
await page.screenshot({ path: '.inspection/mobile.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true);
assert.equal(
  await page.locator('#status').evaluate((el) => getComputedStyle(el).userSelect),
  'none',
);
const keyboardState = (await saved()).state;
const n = keyboardState.board.findIndex((p) => p === keyboardState.turn);
await page.locator(`[data-node="${n}"]`).focus();
await page.keyboard.press('Enter');
assert.equal(await page.locator(`[data-node="${n}"]`).getAttribute('aria-pressed'), 'true');
await page.keyboard.press('ArrowDown');
assert.equal(
  await page
    .locator(`[data-node="${(n + 3) % 9}"]`)
    .evaluate((el) => el === document.activeElement),
  true,
);
await page.locator('#home-button').click();
await page.screenshot({ path: '.inspection/home-mobile.png', fullPage: true });
await page.reload();
assert.equal(await page.locator('#home-screen').isVisible(), true);
await page.locator('#continue-button').click();
assert.equal(await page.locator('#play-screen').isVisible(), true);
await fixture(['coral', null, 'blue', null, 'coral', 'blue', null, 'coral', 'blue'], 'local');
const boardBeforePass = await page.locator('#board').boundingBox();
await page.locator('[data-node="0"]').click();
await page.locator('[data-node="1"]').click();
await page.waitForFunction(() =>
  document.querySelector('#pass-notice').textContent.includes('Blue has no legal moves'),
);
assert.deepEqual(await page.locator('#board').boundingBox(), boardBeforePass);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('dama-session-v1'));
  s.mode = 'solo';
  sessionStorage.setItem('dama-qa-fixture', JSON.stringify(s));
});
await page.reload();
const passTurns = (await saved()).state.turns;
await page.locator('#home-button').click();
await page.waitForTimeout(2000);
assert.equal((await saved()).state.turns, passTurns);
await page.locator('#continue-button').click();
await page.waitForFunction(
  (t) => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns > t,
  passTurns,
);
await page.locator('#new-button').click();
await page.waitForSelector('#restart[open]');
await page.locator('#restart .close').first().click();
await fixture([null, 'blue', null, null, 'coral', null, null, null, null], 'solo', {
  blue: 2,
  coral: 2,
});
await page.waitForSelector('#result-panel[open]');
assert.equal(await page.locator('#result-title').textContent(), 'The computer won');
assert.match(await page.locator('#final-score').textContent(), /Computer 3 \/ 3/);
assert.equal(
  await page.locator('#play-again').evaluate((el) => el === document.activeElement),
  true,
);
await page.screenshot({ path: '.inspection/game-over-mobile.png', fullPage: true });
await page.locator('#play-again').click();
assert.equal(await page.locator('dialog[open]').count(), 0);
assert.equal((await saved()).state.turns, 0);
await page.setViewportSize({ width: 844, height: 390 });
await page.screenshot({ path: '.inspection/landscape.png', fullPage: true });
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
assert.deepEqual(errors, []);
assert.deepEqual(nativeDialogs, []);
console.log(
  JSON.stringify(
    {
      browser: 'Microsoft Edge',
      checks: [
        'home and match setup',
        'pause stops AI',
        'nested menus return to pause',
        'worker reply and undo',
        'full match',
        'saved navigation and reload',
        'result focus and rematch',
        'stable board',
        'mobile play fits viewport',
        'keyboard controls',
        'home stops AI',
        'restart protection',
        'portrait and landscape',
      ],
      playedTurns: finished.turns,
      result: finished.result,
      pageErrors: errors,
    },
    null,
    2,
  ),
);
await browser.close();
