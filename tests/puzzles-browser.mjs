import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const attempt = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('dama-puzzle-session-v1')));
async function move(m) {
  await page.locator(`[data-node="${m.from}"]`).click();
  await page.locator(`[data-node="${m.to}"]`).click();
  await page.waitForFunction(() => !document.querySelector('.traveller'));
}
async function fits(selectors) {
  for (const s of selectors) {
    const r = await page.locator(s).boundingBox(),
      size = page.viewportSize();
    assert.ok(
      r &&
        r.x >= -1 &&
        r.y >= -1 &&
        r.x + r.width <= size.width + 1 &&
        r.y + r.height <= size.height + 1,
      `${s} clipped at ${JSON.stringify(size)}: ${JSON.stringify(r)}`,
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
  await page.locator('#local-button').click();
  await move({ from: 2, to: 4 });
  await page.locator('#home-button').click();
  const match = await page.evaluate(() => localStorage.getItem('dama-session-v1'));
  await page.locator('#puzzles-button').click();
  assert.equal(await page.locator('[data-puzzle]').count(), 6);
  await page.screenshot({ path: '.inspection/puzzle-collection.png' });
  await page.locator('[data-puzzle="last-step"]').click();
  assert.equal(await page.locator('dialog[open]').count(), 0);
  // A legal wrong move exhausts the budget without winning; reload must preserve failure.
  await move({ from: 7, to: 8 });
  await page.waitForSelector('#result-panel[open]');
  assert.equal(await page.locator('#result-title').textContent(), 'Try another route');
  await page.reload();
  assert.equal(await page.locator('#result-title').textContent(), 'Try another route');
  await page.locator('#play-again').click();
  assert.equal((await attempt()).undo.length, 0);
  await page.locator('#puzzle-hint').click();
  await page.waitForSelector('#puzzle-hint-dialog[open]');
  assert.match(await page.locator('#puzzle-hint-text').textContent(), /bottom middle/);
  await page.locator('#puzzle-hint-dialog .primary').click();
  // Check all layouts, including Focus, with the hint remembered.
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await fits(['#board', '#pause-button', '#puzzle-hint', '#undo-button', '#status']);
    await page.locator('label:has(#view-focus)').click();
    await fits(['#board', '#pause-button', '#puzzle-hint', '#undo-button', '#status']);
    if (viewport.width === 844) await page.screenshot({ path: '.inspection/puzzle-focus.png' });
    await page.locator('label:has(#view-standard)').click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // Home preserves the normal match; picking the same puzzle resumes the attempt.
  await page.locator('#home-button').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-session-v1')), match);
  await page.locator('#puzzles-button').click();
  await page.locator('[data-puzzle="last-step"]').click();
  assert.equal((await attempt()).puzzleHinted, true);
  const ids = [
    'last-step',
    'centre-stop',
    'right-order',
    'open-route',
    'between-guards',
    'comeback',
  ];
  for (let i = 0; i < ids.length; i++) {
    assert.equal((await attempt()).puzzleId, ids[i]);
    for (let guard = 0; guard < 12; guard++) {
      const next = await page.evaluate(async () => {
        const session = JSON.parse(localStorage.getItem('dama-puzzle-session-v1'));
        const { puzzleFor, puzzleOutcome } = await import('/src/game/puzzles.ts');
        const { puzzleSolver } = await import('/src/game/puzzle-solver.ts');
        const p = puzzleFor(session.puzzleId);
        const outcome = puzzleOutcome(session.state, p, session.undo.length);
        if (outcome) return { outcome };
        return {
          move: puzzleSolver().winningMoves(session.state, p.moves - session.undo.length)[0],
        };
      });
      if (next.outcome) {
        assert.equal(next.outcome, 'solved');
        break;
      }
      assert.ok(next.move);
      await move(next.move);
      await page.waitForFunction(() => {
        const s = JSON.parse(localStorage.getItem('dama-puzzle-session-v1'));
        return !!s.state.result || s.state.turn === 'blue';
      });
    }
    await page.waitForSelector('#result-panel[open]');
    assert.equal(await page.locator('#result-title').textContent(), 'Puzzle solved!');
    assert.ok(await page.locator('#journey-result').textContent());
    await page.reload();
    assert.equal(await page.locator('#result-title').textContent(), 'Puzzle solved!');
    if (i < ids.length - 1) await page.locator('#next-puzzle').click();
    else assert.equal(await page.locator('#next-puzzle').isVisible(), false);
  }
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('dama-puzzles-v1')));
  assert.equal(Object.keys(progress).length, 6);
  assert.equal(progress['last-step'].unassisted, false);
  assert.equal(progress.comeback.unassisted, true);
  const rivals = await page.evaluate(() => JSON.parse(localStorage.getItem('dama-progress-v1')));
  assert.ok(!rivals || Object.values(rivals.wins).every((n) => n === 0));
  await page.locator('#result-panel .go-home').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-session-v1')), match);
  assert.match(await page.locator('#pack-progress').textContent(), /6 \/ 6/);
  await page.locator('#continue-button').click();
  assert.equal(
    await page
      .locator('body')
      .getAttribute('class')
      .then((s) => s.includes('puzzling')),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    'Passed: six puzzle solutions, real defence worker, failure/retry, hint tracking, separate/resumable saves, completion reload, no rival unlocks, portrait/landscape and Focus fit.',
  );
} finally {
  await browser.close();
}
