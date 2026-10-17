import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
const page = await context.newPage();
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem('journey-fixture');
  if (fixture) {
    localStorage.setItem('dama-session-v1', fixture);
    sessionStorage.removeItem('journey-fixture');
    sessionStorage.setItem('dama-screen', 'play');
  }
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')));
const settled = () => page.waitForFunction(() => !document.querySelector('.traveller'));
async function centre(n) {
  const box = await page.locator(`[data-node="${n}"]`).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function drag(from, to) {
  const start = await centre(from);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
  await settled();
}
try {
  await page.goto('http://localhost:5173/');
  assert.equal(await page.locator('[data-rival="runner"]').isDisabled(), true);
  assert.equal(await page.locator('[data-rival="guardian"]').isDisabled(), true);
  await page.screenshot({ path: '.inspection/rival-journey.png' });
  await page.locator('#local-button').click();
  await page.locator('label:has(#view-focus)').click();
  const board = await page.locator('#board').boundingBox();
  assert.ok(board.width / board.height > 1.5);
  const piece = await page.locator('[data-node="2"] .piece').boundingBox();
  assert.ok(Math.abs(piece.width - piece.height) < 1);
  // Invalid drop returns home and spends no turn.
  await drag(2, await centre(0));
  assert.equal((await saved()).state.turns, 0);
  assert.equal(await page.locator('.drag-source').count(), 0);
  await page.waitForTimeout(510);
  // A legal drag needs no first click, and must not trigger a second click move.
  await drag(2, await centre(4));
  assert.equal((await saved()).state.turns, 1);
  assert.equal((await saved()).state.board[4], 'blue');
  // Touch pointer cancellation after pickup restores the board.
  const p = await centre(0);
  const client = await context.newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p.x + 30, y: p.y + 20 }],
  });
  assert.equal(await page.locator('.drag-ghost').count(), 1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  assert.equal(await page.locator('.drag-ghost').count(), 0);
  assert.equal((await saved()).state.turns, 1);
  await page.waitForTimeout(510);
  // Real touch drag commits without an initial tap.
  const goal = await centre(1);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: goal.x, y: goal.y }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await settled();
  assert.equal((await saved()).state.turns, 2);
  await page.waitForTimeout(510);
  // Tap and keyboard still work after a drag.
  await page.locator('[data-node="5"]').click();
  assert.equal(await page.locator('[data-node="5"]').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-node="5"]').getAttribute('aria-pressed'), 'false');
  // Rotate during a pickup: no stranded ghost and no move.
  const source = await centre(5);
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(source.x - 20, source.y - 20);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.up();
  await page.waitForFunction(() => !document.querySelector('.drag-ghost'));
  assert.equal(await page.locator('.drag-ghost').count(), 0);
  assert.equal((await saved()).state.turns, 2);
  // Home is the selector; replacing a live match needs one explicit confirmation.
  await page.locator('#home-button').click();
  const unfinished = await saved();
  await page.locator('#difficulty-select').selectOption('gentle');
  await page.locator('#start-button').click();
  assert.equal(await page.locator('#restart[open]').count(), 1);
  assert.deepEqual(await saved(), unfinished);
  await page.locator('#restart .close').first().click();
  assert.deepEqual(await saved(), unfinished);
  await page.locator('#local-button').click();
  await page.locator('#confirm-new').click();
  assert.equal((await saved()).mode, 'local');
  assert.equal((await saved()).state.turns, 0);
  await page.locator('#home-button').click();
  await page.reload();
  assert.equal(await page.locator('#difficulty-select').inputValue(), 'gentle');
  await page.locator('#start-button').click();
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal((await saved()).mode, 'solo');
  assert.equal((await saved()).difficulty, 'gentle');
  // Finish each solo rival with a valid near-win fixture to test the whole unlock flow.
  for (const opponent of ['coral', 'runner', 'guardian']) {
    console.log(`Checking ${opponent} completion`);
    await page.evaluate(async (opponent) => {
      const { key } = await import('/src/game/rules.ts');
      const state = {
        board: [null, null, null, null, 'blue', null, null, 'coral', null],
        delivered: { blue: 2, coral: 2 },
        turn: 'blue',
        turns: 0,
        history: [],
        result: null,
      };
      state.history = [key(state)];
      sessionStorage.setItem(
        'journey-fixture',
        JSON.stringify({
          version: 1,
          state,
          mode: 'solo',
          difficulty: 'standard',
          starter: 'blue',
          undo: [],
          opponent,
          matchId: `qa-${opponent}`,
        }),
      );
      sessionStorage.setItem('dama-screen', 'play');
    }, opponent);
    await page.reload();
    assert.equal(await page.locator('body').getAttribute('data-opponent'), opponent);
    await page.locator('[data-node="4"]').click();
    await page.locator('[data-node="0"]').click();
    try {
      await page.waitForSelector('#result-panel[open]', { timeout: 5000 });
    } catch (error) {
      console.log(
        JSON.stringify({
          saved: await saved(),
          errors,
          dialogs: await page.locator('dialog[open]').evaluateAll((ds) => ds.map((d) => d.id)),
          status: await page.locator('#status').textContent(),
        }),
      );
      await page.screenshot({ path: '.inspection/journey-failure.png' });
      throw error;
    }
    assert.equal(
      await page.evaluate(
        (id) => JSON.parse(localStorage.getItem('dama-progress-v1')).wins[id],
        opponent,
      ),
      1,
    );
    await page.reload();
    assert.equal(
      await page.evaluate(
        (id) => JSON.parse(localStorage.getItem('dama-progress-v1')).wins[id],
        opponent,
      ),
      1,
    );
    if (opponent !== 'guardian') {
      const next = opponent === 'coral' ? 'runner' : 'guardian';
      await page.locator('#next-opponent').click();
      assert.equal(
        await page.locator(`[data-rival="${next}"]`).getAttribute('aria-pressed'),
        'true',
      );
      await page.locator('#start-button').click();
      assert.equal((await saved()).opponent, next);
      await page.locator('[data-node="2"]').click();
      await page.locator('[data-node="4"]').click();
      await page.waitForFunction(
        () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2,
      );
      await settled();
    } else assert.equal(await page.locator('#next-opponent').isVisible(), false);
  }
  await page.locator('#result-panel .go-home').click();
  assert.equal(
    await page.locator('#journey-progress').textContent(),
    '3 / 3 rivals beaten · Journey complete. Replay any rival. Progress saves on this browser.',
  );
  await page.screenshot({ path: '.inspection/journey-complete.png' });
  assert.deepEqual(errors, []);
  console.log(
    'Passed: mouse and touch drag, invalid return, tap/keyboard, pointer cancel, resize cancel, rectangular board, circular pawns, all rival workers, unlocks and reload deduplication.',
  );
} finally {
  await browser.close();
}
