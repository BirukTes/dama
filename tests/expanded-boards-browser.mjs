import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() =>
  localStorage.setItem(
    'dama-settings-v1',
    JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
  ),
);
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')));
async function start(id, local = false) {
  await page.locator('label:has(#track-free-play)').click();
  await page.locator(`label:has(#map-${id})`).click();
  await page.locator('label:has(#movement-one-retreat)').click();
  await page.locator(local ? '#local-button' : '#start-button').click();
  if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
}
async function move(preferBackward = false) {
  const next = await page.evaluate(async (prefer) => {
    const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
    const { legalMoves, isBackward } = await import('/src/game/rules.ts');
    const options = legalMoves(s);
    return {
      before: s.turns,
      move: (prefer && options.find((m) => isBackward(s, s.turn, m))) || options[0],
    };
  }, preferBackward);
  assert.ok(next.move);
  await page.locator(`[data-node="${next.move.from}"]`).click();
  await page.locator(`[data-node="${next.move.to}"]`).click();
  await page.waitForFunction(
    (before) =>
      JSON.parse(localStorage.getItem('dama-session-v1')).state.turns > before &&
      !document.querySelector('.traveller'),
    next.before,
  );
}
try {
  await page.goto('http://localhost:5173');
  await expect(page.locator('#movement-field')).toBeHidden();
  await expect(page.locator('#map-select input')).toHaveCount(9);
  for (const [id, nodes] of [
    ['diamond', 9],
    ['weave', 12],
    ['switchyard', 11],
  ]) {
    await start(id);
    await expect(page.locator('#board [data-node]')).toHaveCount(nodes);
    assert.deepEqual((await saved()).state.retreats, { blue: 1, coral: 1 });
    await expect(page.locator('#board-map-label')).toContainText('One retreat');
    await move();
    await page.waitForFunction(() => {
      const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
      return (
        s.turns >= 2 && (s.turn === 'blue' || s.result) && !document.querySelector('.traveller')
      );
    });
    const before = await saved();
    await page.reload();
    assert.deepEqual((await saved()).state, before.state);
    await expect(page.locator('#blue-retreat')).toBeVisible();
    await page.locator('#home-button').click();
    await start(id, true);
    for (let i = 0; i < 4; i++) await move(true);
    assert.deepEqual((await saved()).state.retreats, { blue: 0, coral: 0 });
    await expect(page.locator('#blue-retreat')).toHaveText('↶ 0 left');
    await page.locator('#undo-button').click();
    assert.equal(
      Object.values((await saved()).state.retreats).reduce((a, b) => a + b, 0),
      1,
    );
    await page.locator('#pause-button').click();
    await expect(page.locator('#match-rules')).toContainText('One Retreat');
    await page.locator('#pause .primary.close').click();
    for (const size of [
      { width: 320, height: 568 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(size);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await expect(page.locator('#blue-retreat')).toBeInViewport();
      await expect(page.locator('#coral-retreat')).toBeInViewport();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `.inspection/${id}-retreat.png` });
    await page.locator('#new-button').click();
    await page.locator('#confirm-new').click();
    assert.deepEqual((await saved()).state.retreats, { blue: 1, coral: 1 });
    await page.locator('#home-button').click();
    await page.locator('label:has(#track-journey)').click();
    await expect(page.locator('#movement-field')).toBeHidden();
    await page.locator('#start-button').click();
    assert.equal((await saved()).state.retreats, undefined);
    await page.locator('#home-button').click();
    await page.locator('#puzzles-button').click();
    await page.locator(`label:has(#pack-${id})`).click();
    await expect(page.locator('[data-puzzle]')).toHaveCount(3);
    await page.locator(`[data-puzzle="${id}-1"]`).click();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('dama-puzzle-session-v1')).state.retreats,
      ),
      undefined,
    );
    await page.locator('#home-button').click();
  }
  assert.deepEqual(errors, []);
  console.log(
    'Expanded boards: limited-movement AI, both allowances, save/reload, undo/rematch, counters, mobile/landscape and unrestricted Journey/puzzles passed.',
  );
} finally {
  await browser.close();
}
