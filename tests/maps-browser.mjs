import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')));
const settled = () => page.waitForFunction(() => !document.querySelector('.traveller'));
async function fits(selectors) {
  for (const s of selectors) {
    const r = await page.locator(s).boundingBox(),
      v = page.viewportSize();
    assert.ok(
      r && r.x >= -1 && r.y >= -1 && r.x + r.width <= v.width + 1 && r.y + r.height <= v.height + 1,
      `${s}: ${JSON.stringify(r)} in ${JSON.stringify(v)}`,
    );
  }
}
try {
  await page.addInitScript(() => {
    if (!localStorage.getItem('dama-settings-v1'))
      localStorage.setItem(
        'dama-settings-v1',
        JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
      );
  });
  await page.goto('http://localhost:5173');
  assert.equal(await page.locator('[data-rival="guardian"]').isDisabled(), true);
  await page.locator('#map-select').selectOption('crossroads');
  assert.equal(await page.locator('[data-rival="guardian"]').isDisabled(), false);
  await page.locator('[data-rival="guardian"]').click();
  await page.locator('#start-button').click();
  assert.equal(await page.locator('#board line').count(), 12);
  assert.match(await page.locator('#board-map-label').textContent(), /Crossroads/);
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="4"]').click();
  assert.equal((await saved()).state.turns, 0);
  assert.equal(await page.locator('.node.legal').count(), 1);
  await page.locator('[data-node="1"]').click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2,
  );
  await settled();
  const cross = await saved();
  assert.equal(cross.state.map, 'crossroads');
  await page.reload();
  assert.deepEqual((await saved()).state, cross.state);
  assert.equal(await page.locator('#board line').count(), 12);
  await page.locator('#new-button').click();
  await page.locator('#confirm-new').click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turn === 'blue',
  );
  await settled();
  assert.equal((await saved()).state.map, 'crossroads');
  await page.locator('#home-button').click();
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await fits([
      '#map-select',
      '#difficulty-select',
      '#puzzles-button',
      '#start-button',
      '#local-button',
      '#continue-button',
    ]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const unfinished = await saved();
  await page.locator('#puzzles-button').click();
  await page.locator('[data-puzzle="last-step"]').click();
  assert.equal(await page.locator('#board line').count(), 16);
  assert.match(await page.locator('#board-map-label').textContent(), /Classic/);
  await page.locator('#home-button').click();
  assert.deepEqual((await saved()).state, unfinished.state);
  await page.locator('#map-select').selectOption('classic');
  assert.equal(await page.locator('[data-rival="guardian"]').isDisabled(), true);
  await page.locator('#continue-button').click();
  assert.equal(await page.locator('#board line').count(), 12);
  await page.locator('#home-button').click();
  await page.locator('#local-button').click();
  if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
  assert.equal(await page.locator('#board line').count(), 16);
  await page.locator('#home-button').click();
  await page.locator('#map-select').selectOption('crossroads');
  await page.locator('#local-button').click();
  if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('label:has(#view-focus)').click();
  await fits(['#board', '#board-map-label', '#pause-button']);
  await page.screenshot({ path: '.inspection/crossroads-focus.png' });
  await page.locator('label:has(#view-standard)').click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (let turn = 0; turn < 101; turn++) {
    const next = await page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
      if (s.result) return null;
      const { chooseMove } = await import('/src/ai/search.ts');
      return chooseMove(s, 'standard', () => 0.5, 'runner');
    });
    if (!next) break;
    await page.locator(`[data-node="${next.from}"]`).click();
    await page.locator(`[data-node="${next.to}"]`).click();
    await settled();
  }
  assert.ok((await saved()).state.result);
  await page.waitForSelector('#result-panel[open]');
  assert.equal((await saved()).state.map, 'crossroads');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('dama-progress-v1')));
  assert.ok(!progress || Object.values(progress.wins).every((n) => n === 0));
  assert.deepEqual(errors, []);
  console.log(
    'Passed: Crossroads selection, unlocked practice rivals, diagonal rejection, real AI worker, rematch/reload, map switching protection, Classic puzzles, complete match, layouts and Focus.',
  );
} finally {
  await browser.close();
}
