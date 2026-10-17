import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const base = process.env.DAMA_TEST_URL || 'http://localhost:5173';
await page.addInitScript(() =>
  localStorage.setItem(
    'dama-settings-v1',
    JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
  ),
);
const node = (n) => page.locator(`#lesson-board [data-lesson="${n}"]`);
async function move(from, to) {
  await node(from).click();
  await node(to).click();
}
async function drag(from, to) {
  const a = await node(from).boundingBox(),
    b = await node(to).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.up();
}
async function snapshot() {
  return page.evaluate(() =>
    Object.fromEntries(
      Object.keys(localStorage)
        .filter((k) => /session|progress|puzzles/.test(k))
        .map((k) => [k, localStorage.getItem(k)]),
    ),
  );
}
async function open() {
  if (await page.locator('#help-button').isVisible()) await page.locator('#help-button').click();
  else {
    await page.locator('#pause-button').click();
    await page.locator('#pause-help').click();
  }
  await page.locator('#tutorial-start').click();
  await page.waitForSelector('#tutorial[open]');
}
try {
  await page.goto(base);
  const empty = await snapshot();
  await open();
  assert.equal(await page.locator('dialog[open]').count(), 1);
  assert.equal(await page.locator('#lesson-next').isDisabled(), true);
  await move(2, 4);
  assert.match(await page.locator('#lesson-feedback').textContent(), /move has not been used/);
  assert.equal(await node(2).getAttribute('aria-label'), 'top right: blue pawn');
  await drag(2, 6);
  assert.equal(await page.locator('#lesson-next').isDisabled(), true);
  await page.waitForTimeout(520);
  await drag(2, 1);
  assert.equal(await page.locator('#lesson-next').isDisabled(), false);
  await page.locator('#lesson-retry').click();
  assert.equal(await page.locator('#lesson-next').isDisabled(), true);
  await node(2).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#lesson-next').isDisabled(), false);
  await page.locator('#lesson-next').click();
  await move(5, 3);
  assert.equal(await page.locator('#lesson-next').isDisabled(), true);
  await move(5, 4);
  await page.locator('#lesson-next').click();
  await move(4, 3);
  assert.match(await page.locator('#lesson-score').textContent(), /2 \/ 3/);
  await page.locator('#lesson-back').click();
  assert.match(await page.locator('#lesson-title').textContent(), /centre/);
  await move(5, 4);
  await page.locator('#lesson-next').click();
  await move(4, 3);
  await page.locator('#lesson-next').click();
  await move(4, 5);
  await page.locator('#lesson-next').click();
  await move(5, 4);
  assert.match(await page.locator('#lesson-score').textContent(), /Coral passed. Blue moves again/);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    for (const selector of [
      '#tutorial',
      '#lesson-board',
      '#lesson-feedback',
      '#lesson-next',
      '#lesson-back',
    ]) {
      const r = await page.locator(selector).boundingBox();
      assert.ok(
        r &&
          r.x >= 0 &&
          r.y >= 0 &&
          r.x + r.width <= viewport.width + 1 &&
          r.y + r.height <= viewport.height + 1,
        `${selector} ${JSON.stringify(r)} in ${JSON.stringify(viewport)}`,
      );
    }
    await page.screenshot({ path: `.inspection/tutorial-${viewport.width}.png` });
    assert.equal(
      await page.locator('#tutorial').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      true,
      `Lesson scrolls at ${JSON.stringify(viewport)}`,
    );
    await page.screenshot({ path: `.inspection/tutorial-${viewport.width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#lesson-next').click();
  await move(4, 3);
  assert.match(await page.locator('#lesson-score').textContent(), /3 \/ 3.*Blue wins/);
  await page.locator('#lesson-next').click();
  assert.match(await page.locator('#lesson-title').textContent(), /know the way/);
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-tutorial-v1')).completed),
    true,
  );
  await page.locator('#lesson-next').click();
  assert.deepEqual(await snapshot(), empty);
  await page.reload();
  await page.locator('#help-button').click();
  assert.match(await page.locator('#tutorial-start').textContent(), /Replay/);
  await page.locator('#tutorial-start').click();
  assert.match(await page.locator('#lesson-progress').textContent(), /1 \/ 6/);
  await page.locator('#tutorial .close').click();
  // Opening from a paused game must return to Pause and keep the computer stopped.
  await page.locator('#start-button').click();
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="4"]').click();
  await page.locator('#pause-button').click();
  await page.locator('#pause-help').click();
  await page.locator('#tutorial-start').click();
  const paused = await snapshot();
  await page.waitForTimeout(800);
  await move(2, 1);
  assert.deepEqual(await snapshot(), paused);
  await page.locator('#tutorial .close').click();
  await page.waitForSelector('#pause[open]');
  assert.equal(await page.locator('dialog[open]').count(), 1);
  await page.waitForTimeout(600);
  assert.deepEqual(await snapshot(), paused);
  await page.locator('#pause .primary').click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2,
  );
  await page.waitForFunction(() => !document.querySelector('.traveller'));
  const match = await snapshot();
  await open();
  await move(2, 1);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#tutorial').open);
  assert.deepEqual(await snapshot(), match);
  await page.waitForFunction(
    () => document.querySelectorAll('#lesson-board [data-lesson]').length === 0,
  );
  if (await page.locator('#pause[open]').count()) await page.locator('#pause .primary').click();
  await page.locator('#home-button').click();
  await page.locator('#puzzles-button').click();
  await page.locator('[data-puzzle="last-step"]').click();
  const puzzle = await snapshot();
  await open();
  await move(2, 1);
  await page.locator('#tutorial .close').click();
  assert.deepEqual(await snapshot(), puzzle);
  assert.deepEqual(errors, []);
  console.log(
    'Passed: six interactive lessons, wrong moves, drag/invalid drop, keyboard, back/reset, delivery/pass/win feedback, completion/replay, four layouts, Escape, paused AI, and match/puzzle/progress isolation.',
  );
} finally {
  await browser.close();
}
