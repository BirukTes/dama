import { chromium, expect } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const primary = () => page.locator('#home-actions .home-main-action:visible');
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')));
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem('hierarchy-fixture');
  if (fixture) {
    localStorage.setItem('dama-session-v1', fixture);
    sessionStorage.removeItem('hierarchy-fixture');
  }
  if (!localStorage.getItem('dama-settings-v1'))
    localStorage.setItem(
      'dama-settings-v1',
      JSON.stringify({ motion: false, sound: false, soundPreferenceSet: true }),
    );
});
try {
  await page.goto('http://localhost:5173');
  await expect(primary()).toHaveCount(1);
  await expect(primary()).toHaveText('Play Coral →');
  await page.locator('label:has(#map-crossroads)').click();
  await page.locator('label:has(#difficulty-gentle)').click();
  await expect(page.locator('#home-action-context')).toContainText('Crossroads · Gentle');
  await page.locator('#start-button').click();
  assert.equal((await saved()).state.map, 'crossroads');
  assert.equal((await saved()).difficulty, 'gentle');
  assert.equal(await page.locator('#home-actions').isHidden(), true);
  await page.locator('#home-button').click();
  assert.equal(await primary().getAttribute('id'), 'continue-button');
  await expect(page.locator('#home-action-context')).toContainText('Saved Journey · Crossroads');
  await page.locator('label:has(#track-free-play)').click();
  await page.locator('label:has(#map-classic)').click();
  await page.locator('[data-rival="runner"]').click();
  assert.equal(await primary().getAttribute('id'), 'continue-button');
  await page.locator('#continue-button').click();
  await expect(page.locator('#board-map-label')).toContainText('Crossroads');
  await page.locator('#home-button').click();
  await page.locator('#start-button').click();
  assert.equal((await saved()).opponent, 'runner');
  assert.equal((await saved()).track, 'free-play');
  await page.locator('[data-node="8"]').click();
  assert.ok(await page.locator('#legal-connections line').count());
  await page.locator('[data-node="0"]').click();
  await expect(page.locator('#instruction')).toContainText('turn is unchanged');
  assert.equal((await saved()).state.turns, 0);
  await page.locator('label:has(#view-focus)').click();
  await page.locator('[data-node="0"]').click();
  await expect(page.locator('#move-notice')).toBeVisible();
  await page.locator('label:has(#view-standard)').click();
  await page.locator('#home-button').click();
  await page.locator('#puzzles-button').click();
  assert.equal(await primary().getAttribute('id'), 'pack-start');
  await primary().click();
  await page.locator('[data-node="7"]').click();
  await page.locator('[data-node="6"]').click();
  await page.waitForFunction(() => !document.querySelector('.traveller'));
  assert.equal(await page.locator('#result-panel').isVisible(), false);
  await expect(page.locator('#status')).toHaveText('Puzzle solved!');
  await expect(page.locator('#result-panel')).toBeVisible();
  await expect(page.locator('#result-panel .primary:visible')).toHaveCount(1);
  assert.equal(await page.locator('#next-puzzle').getAttribute('class'), 'primary');
  await page.locator('#result-panel .go-home').click();
  await page.locator('#pack-start').click();
  await page.locator('#home-button').click();
  assert.equal(await primary().getAttribute('id'), 'resume-puzzle');
  await page.locator('label:has(#pack-islands)').click();
  assert.equal(await primary().getAttribute('id'), 'pack-start');
  await expect(primary()).toContainText('The left landing');
  await expect(page.locator('#resume-puzzle')).toContainText('Classic');
  const match = JSON.stringify(await saved());
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(primary()).toHaveCount(1);
    assert.equal(
      await page
        .locator('#home-actions')
        .evaluate((el) => el.querySelector('button:not([hidden])').id),
      await primary().getAttribute('id'),
    );
    const r = await primary().boundingBox();
    assert.ok(r.y + r.height <= viewport.height + 1 && r.height >= 44);
    assert.equal(await page.locator('#home-actions [id="start-button"]').count(), 1);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator('#home-actions')).toBeHidden();
  assert.equal(await page.locator('.lobby-heading #continue-button').count(), 1);
  assert.equal(await page.locator('.lobby-controls #start-button').count(), 1);
  assert.equal(JSON.stringify(await saved()), match);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#home-actions')).toBeVisible();
  await page.screenshot({ path: '.inspection/hierarchy-puzzles.png' });
  await page.evaluate(async () => {
    const { puzzleState, puzzleFor } = await import('/src/game/puzzles.ts');
    const { applyMove } = await import('/src/game/rules.ts');
    const state = applyMove(puzzleState(puzzleFor('last-step')), { from: 7, to: 6 });
    sessionStorage.setItem(
      'hierarchy-fixture',
      JSON.stringify({
        version: 1,
        state,
        mode: 'solo',
        track: 'free-play',
        difficulty: 'standard',
        starter: 'blue',
        opponent: 'coral',
        undo: [],
        matchId: 'review-hierarchy',
      }),
    );
    const choice = JSON.parse(localStorage.getItem('dama-home-choice-v1'));
    localStorage.setItem(
      'dama-home-choice-v1',
      JSON.stringify({ ...choice, track: 'free-play', map: 'classic' }),
    );
    sessionStorage.setItem('dama-screen', 'home');
  });
  await page.reload();
  assert.equal(await primary().getAttribute('id'), 'start-button');
  await expect(page.locator('#continue-label')).toContainText('Review');
  assert.equal(await page.locator('#continue-button').getAttribute('class'), 'quiet');
  await page.locator('#start-button').click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'dama-session-v1') throw new Error('storage unavailable');
      return original.call(this, k, v);
    };
  });
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(() => !document.querySelector('.traveller'));
  await expect(page.locator('#save-status')).toContainText('KEEP THIS TAB OPEN');
  await page.locator('#pause-button').click();
  await expect(page.locator('#pause-save-note')).toContainText('Saving is unavailable');
  assert.deepEqual(errors, []);
  console.log(
    'Passed mobile primary hierarchy, saved/setup isolation, puzzle actions, resize without duplicated controls, silent invalid-move feedback, final delivery reveal and unavailable-save messaging.',
  );
} finally {
  await browser.close();
}
