import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
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
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 761, height: 752 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
];
const saved = () => page.evaluate(() => localStorage.getItem('dama-session-v1'));
async function fits() {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const selector of [
      '#track-select',
      '#puzzles-title',
      '#pack-progress',
      '[data-puzzle="last-step"]',
      '[data-puzzle="comeback"]',
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
    await page.screenshot({ path: `.inspection/modes-${viewport.width}.png` });
    assert.equal(
      await page.locator('#home-screen').evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      true,
      `Puzzles scrolls ${JSON.stringify(viewport)}`,
    );
  }
  await page.setViewportSize(viewports[1]);
}
try {
  await page.goto('http://localhost:5173');
  assert.equal(await page.locator('#track-select input').count(), 3);
  await page.locator('#track-journey').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#track-puzzles').isChecked(), true);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  assert.equal(await page.locator('#map-field').isVisible(), false);
  assert.equal(await page.locator('#opponent-cards').isVisible(), false);
  assert.equal(await page.locator('#difficulty-field').isVisible(), false);
  assert.equal(await page.locator('[data-puzzle]').count(), 6);
  await fits();
  await page.reload();
  assert.equal(await page.locator('#track-puzzles').isChecked(), true);
  await page.locator('#track-puzzles').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#track-free-play').isChecked(), true);
  assert.equal(await page.locator('#puzzle-home').isVisible(), false);
  await page.locator('label:has(#map-islands)').click();
  await page.locator('#start-button').click();
  await page.locator('[data-node="5"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  await page.locator('#home-button').click();
  const match = await saved();
  assert.match(await page.locator('#continue-label').textContent(), /Continue Free play/);
  assert.match(await page.locator('#continue-context').textContent(), /Islands/);
  await page.locator('#puzzles-button').click();
  await page.locator('[data-puzzle="centre-stop"]').click();
  await page.locator('[data-node="5"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-puzzle-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  const attempt = await page.evaluate(() => localStorage.getItem('dama-puzzle-session-v1'));
  await page.locator('#home-button').click();
  assert.equal(await saved(), match);
  assert.equal(await page.locator('#track-puzzles').isChecked(), true);
  assert.equal(await page.locator('#resume-puzzle').isVisible(), true);
  await fits();
  await page.locator('#resume-puzzle').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-puzzle-session-v1')), attempt);
  await page.locator('#home-button').click();
  await page.locator('#continue-button').click();
  assert.equal(await saved(), match);
  assert.match(await page.locator('#board-map-label').textContent(), /Islands.*Free play/);
  assert.deepEqual(errors, []);
  console.log(
    'Passed: three mode tabs, keyboard/persistence, direct puzzle pack, hidden match settings, explicit saved match context, separate puzzle resume and five layouts.',
  );
} finally {
  await browser.close();
}
