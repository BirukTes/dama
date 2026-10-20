import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  colorScheme: 'light',
  hasTouch: true,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem('appearance-fixture');
  if (fixture) {
    localStorage.setItem('dama-session-v1', fixture);
    sessionStorage.removeItem('appearance-fixture');
    sessionStorage.setItem('dama-screen', 'play');
  }
});
await page.goto('http://localhost:5173/');
assert.equal(await page.locator('body').getAttribute('data-theme'), 'light');
await page.locator('#settings-button').click();
await page.locator('#theme').selectOption('dark');
await page.locator('#settings .primary').click();
assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
await page.reload();
assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
await page.locator('#help-button').click();
assert.equal(await page.locator('.rule-demo').count(), 4);
await page.screenshot({ path: '.inspection/help-dark.png', fullPage: true });
await page.locator('#help .primary').click();
await page.locator('#settings-button').click();
await page.locator('#theme').selectOption('system');
await page.locator('#settings .primary').click();
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForFunction(() => document.body.dataset.theme === 'dark');
await page.emulateMedia({ colorScheme: 'light' });
await page.waitForFunction(() => document.body.dataset.theme === 'light');
await page.locator('#local-button').click();
await page.locator('#home-button').click();
const layouts = [];
async function fits(label, selectors) {
  const dimensions = await page.evaluate(() => ({
    w: innerWidth,
    h: innerHeight,
    scrollY,
    scrollX,
  }));
  for (const selector of selectors) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(
      box &&
        box.x >= -1 &&
        box.y >= -1 &&
        box.x + box.width <= dimensions.w + 1 &&
        box.y + box.height <= dimensions.h + 1,
      `${label}: ${selector} clipped: ${JSON.stringify(box)} in ${JSON.stringify(dimensions)}`,
    );
  }
  await page.mouse.wheel(0, 700);
  assert.equal(await page.evaluate(() => scrollY), 0);
}
for (const viewport of [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 761, height: 752 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
]) {
  await page.setViewportSize(viewport);
  await fits(`home ${viewport.width}x${viewport.height}`, [
    '#home-button',
    '#track-select',
    '#lobby-title',
    '#opponent-cards',
    '#settings-button',
    '#continue-button',
    '#start-button',
    '#local-button',
    '#help-button',
  ]);
  if (await page.locator('#opponent-profile').isVisible())
    await fits(`profile ${viewport.width}x${viewport.height}`, ['#opponent-profile']);
  if (await page.locator('#home-actions').isVisible())
    await fits(`primary action ${viewport.width}x${viewport.height}`, [
      '#home-actions',
      '.home-main-action:visible',
    ]);
  // The segments themselves must fit the border, not merely the outer control.
  for (const selector of ['#difficulty-select', '#map-select', '#track-select']) {
    const control = await page.locator(selector).boundingBox();
    for (const segment of await page.locator(`${selector} label > span`).all()) {
      const box = await segment.boundingBox();
      assert.ok(
        box.x >= control.x && box.x + box.width <= control.x + control.width,
        `${selector} segment escapes its border at ${viewport.width}: ${JSON.stringify({ box, control })}`,
      );
    }
  }
  await page.locator('#continue-button').click();
  await fits(`standard ${viewport.width}x${viewport.height}`, [
    '#board',
    '#pause-button',
    '#view-control',
    '#blue-score',
    '#coral-score',
    '#status',
    '#undo-button',
  ]);
  const standard = await page.locator('#board').boundingBox();
  await page.locator('label:has(#view-focus)').click();
  assert.equal(await page.locator('#view-focus').isChecked(), true);
  await fits(`focus ${viewport.width}x${viewport.height}`, [
    '#board',
    '#pause-button',
    '#view-control',
    '#blue-score',
    '#coral-score',
    '#status',
    '#undo-button',
  ]);
  const focused = await page.locator('#board').boundingBox();
  if (viewport.width === 390) {
    await page.locator('#view-focus').focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#view-standard').isChecked(), true);
    assert.equal(await page.locator('#immersive').isChecked(), false);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#view-focus').isChecked(), true);
    assert.equal(await page.locator('#immersive').isChecked(), true);
  }
  assert.ok(focused.width >= standard.width, `Focus board is smaller at ${viewport.width}`);
  layouts.push({
    viewport,
    standardBoard: Math.round(standard.width),
    focusedBoard: Math.round(focused.width),
  });
  if (viewport.width === 844)
    await page.screenshot({ path: '.inspection/focus-landscape.png', fullPage: true });
  await page.locator('label:has(#view-standard)').click();
  await page.locator('#home-button').click();
}
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('#settings-button').click();
await page.locator('#theme').selectOption('dark');
await page.locator('#immersive').check();
await page.locator('#settings .primary').click();
await page.screenshot({ path: '.inspection/home-dark.png', fullPage: true });
await page.reload();
assert.equal(await page.locator('#theme').inputValue(), 'dark');
assert.equal(await page.locator('#immersive').isChecked(), true);
assert.equal(await page.locator('#view-focus').isChecked(), true);
await page.locator('#continue-button').click();
await page.screenshot({ path: '.inspection/focus-dark.png', fullPage: true });
// Deliver a non-final Blue pawn: verify edge arrival, score flight, and clear feedback.
await page.evaluate(async () => {
  const { key } = await import('/src/game/rules.ts');
  const state = {
    board: [null, 'coral', null, null, 'blue', null, null, 'coral', null],
    delivered: { blue: 2, coral: 1 },
    turn: 'blue',
    turns: 0,
    history: [],
    result: null,
  };
  // Use one delivered Blue pawn and two active ones to avoid finishing this fixture.
  state.board[8] = 'blue';
  state.delivered.blue = 1;
  state.history = [key(state)];
  sessionStorage.setItem(
    'appearance-fixture',
    JSON.stringify({
      version: 1,
      state,
      mode: 'local',
      difficulty: 'standard',
      undo: [],
      starter: 'blue',
    }),
  );
});
await page.reload();
await page.locator('[data-node="4"]').click();
await page.locator('[data-node="0"]').click();
await page.waitForSelector('.traveller');
assert.equal(await page.locator('#blue-count').textContent(), '1 / 3');
await page.waitForFunction(
  () =>
    document.querySelector('#blue-count').textContent === '2 / 3' &&
    document.querySelector('.traveller'),
);
assert.match(await page.locator('#delivery-notice').textContent(), /Blue pawn delivered/);
await page.waitForFunction(() => !document.querySelector('.traveller'));
assert.equal(await page.locator('#blue-score .filled').count(), 2);
await page.screenshot({ path: '.inspection/delivery-dark.png', fullPage: true });
// Reduced motion still explains scoring without moving the pawn across the screen.
await page.locator('#settings-button').click();
await page.locator('#motion').check();
await page.locator('#settings .primary').click();
await page.reload();
assert.equal(await page.locator('#motion').isChecked(), true);
await page.evaluate(async () => {
  const { key } = await import('/src/game/rules.ts');
  const state = {
    board: [null, 'coral', null, null, 'blue', null, null, 'coral', null],
    delivered: { blue: 2, coral: 1 },
    turn: 'blue',
    turns: 0,
    history: [],
    result: null,
  };
  state.history = [key(state)];
  sessionStorage.setItem(
    'appearance-fixture',
    JSON.stringify({
      version: 1,
      state,
      mode: 'local',
      difficulty: 'standard',
      undo: [],
      starter: 'blue',
    }),
  );
});
await page.reload();
await page.locator('[data-node="4"]').click();
await page.locator('[data-node="0"]').click();
assert.equal(await page.locator('.traveller').count(), 0);
assert.equal(await page.locator('#blue-count').textContent(), '3 / 3');
assert.match(await page.locator('#delivery-notice').textContent(), /Blue pawn delivered/);
assert.equal(await page.locator('#result-panel[open]').count(), 1);
assert.deepEqual(errors, []);
console.log(
  JSON.stringify(
    {
      checks: [
        'light/dark/system theme and persistence',
        'illustrated rules',
        'all home actions fit without scrolling',
        'standard and focus layouts',
        'portrait and landscape',
        'score arrival and flight',
        'delivery feedback',
        'reduced-motion preference',
      ],
      layouts,
      pageErrors: errors,
    },
    null,
    2,
  ),
);
await browser.close();
