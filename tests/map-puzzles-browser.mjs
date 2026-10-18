import { chromium, expect } from '@playwright/test';
import { strict as assert } from 'node:assert';
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
try {
  await page.goto('http://localhost:5173');
  await page.locator('#local-button').click();
  await page.locator('#home-button').click();
  const match = await page.evaluate(() => localStorage.getItem('dama-session-v1'));
  await page.locator('#puzzles-button').click();
  for (const map of ['crossroads', 'ring-road', 'twin-bridges', 'long-crossing', 'islands']) {
    await page.locator(`label:has(#pack-${map})`).click();
    assert.equal(await page.locator('[data-puzzle]').count(), 3);
    for (let number = 1; number <= 3; number++) {
      await page.locator(`[data-puzzle="${map}-${number}"]`).click();
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('dama-puzzle-session-v1')).state.map,
        ),
        map,
      );
      for (let guard = 0; guard < 5; guard++) {
        const next = await page.evaluate(async () => {
          const s = JSON.parse(localStorage.getItem('dama-puzzle-session-v1'));
          const { puzzleFor, puzzleOutcome } = await import('/src/game/puzzles.ts');
          const { puzzleSolver } = await import('/src/game/puzzle-solver.ts');
          const p = puzzleFor(s.puzzleId),
            outcome = puzzleOutcome(s.state, p, s.undo.length);
          return outcome
            ? { outcome }
            : { move: puzzleSolver().winningMoves(s.state, p.moves - s.undo.length)[0] };
        });
        if (next.outcome) {
          assert.equal(next.outcome, 'solved');
          break;
        }
        assert.ok(next.move);
        await page.locator(`[data-node="${next.move.from}"]`).click();
        await page.locator(`[data-node="${next.move.to}"]`).click();
        await page.waitForFunction(() => {
          const s = JSON.parse(localStorage.getItem('dama-puzzle-session-v1'));
          return (
            !document.querySelector('.traveller') && (s.state.result || s.state.turn === 'blue')
          );
        });
      }
      await expect(page.locator('#result-title')).toHaveText('Puzzle solved!');
      if (number === 3) {
        assert.equal(await page.locator('#next-puzzle').isHidden(), true);
        await expect(page.locator('#achievement-notice')).toContainText('solver');
      }
      await page.locator('#result-panel .go-home').click();
    }
    await expect(page.locator('#pack-progress')).toHaveText('3 / 3 solved');
  }
  assert.equal(
    await page.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('dama-puzzles-v1'))).length,
    ),
    15,
  );
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-session-v1')), match);
  await page.reload();
  assert.equal(await page.locator('#pack-islands').isChecked(), true);
  await page.locator('#settings-button').click();
  await page.locator('#achievements-settings summary').click();
  assert.equal(await page.locator('.achievement.earned').count(), 6);
  await expect(page.locator('#achievements-count')).toContainText('6 / 16');
  await page.locator('#settings .primary.close').click();
  await page.locator('label:has(#pack-classic)').click();
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(size);
    for (const selector of ['#track-select', '#puzzle-pack-select', '#puzzle-list']) {
      const r = await page.locator(selector).boundingBox();
      assert.ok(
        r &&
          r.x >= 0 &&
          r.y >= 0 &&
          r.x + r.width <= size.width + 1 &&
          r.y + r.height <= size.height + 1,
        `${selector} clipped at ${JSON.stringify(size)}: ${JSON.stringify(r)}`,
      );
    }
  }
  await page.screenshot({ path: '.inspection/puzzle-packs.png' });
  assert.deepEqual(errors, []);
  console.log(
    'Passed 15 new puzzle solutions with real defence worker, map saves, pack completion, match isolation, persistence and four layouts.',
  );
} finally {
  await browser.close();
}
