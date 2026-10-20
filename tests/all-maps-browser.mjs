import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 761, height: 752 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
];
try {
  for (const id of [
    'ring-road',
    'twin-bridges',
    'long-crossing',
    'islands',
    'diamond',
    'weave',
    'switchyard',
  ]) {
    const context = await browser.newContext({ viewport: viewports[1], hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem(
        'dama-settings-v1',
        JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
      );
    });
    await page.goto('http://localhost:5173');
    await page.locator('label:has(#track-free-play)').click();
    await page.locator(`label:has(#map-${id})`).click();
    assert.equal(await page.locator('[data-rival="guardian"]').isDisabled(), false);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const issues = await page.evaluate(() => {
        const failures = [];
        for (const selector of [
          '#map-select',
          '#difficulty-select',
          '#start-button',
          '#local-button',
          '#puzzles-button',
        ]) {
          const r = document.querySelector(selector).getBoundingClientRect();
          if (r.left < 0 || r.right > innerWidth + 1 || r.top < 0 || r.bottom > innerHeight + 1)
            failures.push(selector + ' outside viewport ' + JSON.stringify(r));
        }
        const parent = document.querySelector('#map-select').getBoundingClientRect();
        for (const el of document.querySelectorAll('#map-select label')) {
          const r = el.getBoundingClientRect();
          if (r.left < parent.left || r.right > parent.right + 1 || r.bottom > parent.bottom + 1)
            failures.push('map choice outside control');
        }
        return failures;
      });
      assert.deepEqual(issues, [], `${id} lobby ${JSON.stringify(viewport)}`);
    }
    if (id === 'long-crossing') await page.screenshot({ path: '.inspection/maps-home.png' });
    await page.setViewportSize(viewports[1]);
    await page.locator('[data-rival="guardian"]').click();
    await page.locator('#start-button').click();
    const shape = await page.evaluate(
      async (id) => (await import('/src/game/maps.ts')).mapFor(id),
      id,
    );
    assert.equal(await page.locator('#board [data-node]').count(), shape.points.length);
    assert.equal(await page.locator('#board line').count(), shape.edges.length);
    const move = await page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
      return (await import('/src/game/rules.ts')).legalMoves(s)[0];
    });
    // Direct press-and-slide must work on each topology without first selecting a pawn.
    const from = await page.locator(`[data-node="${move.from}"]`).boundingBox();
    const to = await page.locator(`[data-node="${move.to}"]`).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForFunction(
      () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2,
    );
    await page.waitForFunction(() => !document.querySelector('.traveller'));
    const after = await page.evaluate(
      () => JSON.parse(localStorage.getItem('dama-session-v1')).state,
    );
    assert.equal(after.map, id);
    await page.reload();
    assert.deepEqual(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state),
      after,
    );
    await page.locator('#undo-button').click();
    await page.waitForFunction(
      () => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns === 0,
    );
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const focus of ['standard', 'focus']) {
        await page.locator(`label:has(#view-${focus})`).click();
        const problems = await page.evaluate(() => {
          const nodes = [...document.querySelectorAll('#board [data-node]')].map((n) =>
            n.getBoundingClientRect(),
          );
          const result = [];
          for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i];
            if (a.left < 0 || a.right > innerWidth + 1 || a.top < 0 || a.bottom > innerHeight + 1)
              result.push('node outside screen ' + i);
            for (let j = i + 1; j < nodes.length; j++) {
              const b = nodes[j];
              if (
                Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
              )
                result.push('overlapping targets ' + i + ',' + j);
            }
          }
          return result;
        });
        assert.deepEqual(problems, [], `${id}, ${focus}, ${JSON.stringify(viewport)}`);
      }
    }
    if (id === 'islands') await page.screenshot({ path: '.inspection/islands-focus.png' });
    await page.setViewportSize(viewports[1]);
    await page.locator('label:has(#view-standard)').click();
    if (id === 'long-crossing')
      await page.screenshot({ path: '.inspection/long-crossing-phone.png' });
    await page.locator('#home-button').click();
    await page.locator('#local-button').click();
    if (await page.locator('#restart[open]').count()) await page.locator('#confirm-new').click();
    for (let n = 0; n < 101; n++) {
      const move = await page.evaluate(async () => {
        const s = JSON.parse(localStorage.getItem('dama-session-v1')).state;
        return s.result
          ? null
          : (await import('/src/ai/search.ts')).chooseMove(s, 'standard', () => 0.5, 'runner');
      });
      if (!move) break;
      await page.locator(`[data-node="${move.from}"]`).click();
      await page.locator(`[data-node="${move.to}"]`).click();
      await page.waitForFunction(() => !document.querySelector('.traveller'));
    }
    await page.waitForSelector('#result-panel[open]');
    assert.ok(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state.result),
    );
    const starter = await page.evaluate(
      () => JSON.parse(localStorage.getItem('dama-session-v1')).starter,
    );
    await page.locator('#play-again').click();
    assert.equal(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state.map),
      id,
    );
    assert.notEqual(
      await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).starter),
      starter,
    );
    assert.equal(await page.locator('#board [data-node]').count(), shape.points.length);
    assert.deepEqual(errors, []);
    console.log(
      `Passed ${id}: drag, Guardian worker, undo/reload, complete local game, nine map choices and non-overlapping targets at five sizes in both views.`,
    );
    await context.close();
  }
} finally {
  await browser.close();
}
