import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 374, height: 811 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() =>
  localStorage.setItem(
    'dama-settings-v1',
    JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
  ),
);
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')));
try {
  await page.goto('http://localhost:5173');
  await page.locator('#difficulty-standard').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#difficulty-expert')).toBeChecked();
  await expect(page.locator('#home-action-context')).toContainText('Expert');
  await expect(page.locator('#help-challenge-note')).toContainText('eight');
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-home-choice-v1')).difficulty),
    'expert',
  );
  await page.locator('#start-button').click();
  assert.equal((await saved()).difficulty, 'expert');
  assert.equal((await saved()).state.retreats, undefined);
  await page.locator('#home-button').click();
  await page.reload();
  await expect(page.locator('#difficulty-expert')).toBeChecked();
  await page.locator('label:has(#track-free-play)').click();
  await page.locator('[data-rival="guardian"]').click();
  const maps = [
    'classic',
    'crossroads',
    'ring-road',
    'twin-bridges',
    'long-crossing',
    'islands',
    'diamond',
    'weave',
    'switchyard',
  ];
  for (const [index, id] of maps.entries()) {
    await page.locator(`label:has(#map-${id})`).click();
    await page.locator(`label:has(#movement-${index % 2 ? 'one-retreat' : 'classic'})`).click();
    await page.locator('#start-button').click();
    if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
    const move = await page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
      return (await import('/src/game/rules.ts')).legalMoves(s)[0];
    });
    await page.locator(`[data-node="${move.from}"]`).click();
    await page.locator(`[data-node="${move.to}"]`).click();
    await page.waitForFunction(
      () => {
        const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
        return (
          s.turns >= 2 && (s.turn === 'blue' || s.result) && !document.querySelector('.traveller')
        );
      },
      null,
      { timeout: 20000 },
    );
    const snapshot = await saved();
    assert.equal(snapshot.difficulty, 'expert');
    assert.equal(!!snapshot.state.retreats, !!(index % 2));
    assert.equal(
      await page.evaluate(async () => {
        const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
        return (await import('/src/persistence/save.ts')).validState(s);
      }),
      true,
    );
    await page.reload();
    assert.deepEqual((await saved()).state, snapshot.state);
    await page.locator('#home-button').click();
  }
  const normal = JSON.stringify(await saved());
  await page.locator('#puzzles-button').click();
  await page.locator('label:has(#pack-classic)').click();
  await page.locator('[data-puzzle="last-step"]').click();
  await page.locator('[data-node="7"]').click();
  await page.locator('[data-node="6"]').click();
  await expect(page.locator('#result-panel')).toBeVisible();
  assert.equal(JSON.stringify(await saved()), normal);
  await page.locator('#result-panel .go-home').click();
  await page.locator('label:has(#track-free-play)').click();
  for (const size of [
    { width: 320, height: 568 },
    { width: 374, height: 811 },
    { width: 761, height: 752 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    const fit = await page.locator('#difficulty-select').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [...el.querySelectorAll('label')].every((label) => {
        const b = label.getBoundingClientRect();
        return b.height >= 44 && b.x >= r.x - 1 && b.right <= r.right + 1;
      });
    });
    assert.ok(fit, JSON.stringify(size));
    assert.ok(
      await page.locator('#home-screen').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'Expert: keyboard/preferences, unchanged rules, nine real worker replies, save/reload, puzzle isolation and five layouts passed.',
  );
} finally {
  await browser.close();
}
