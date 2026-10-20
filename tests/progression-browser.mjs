import { chromium, expect } from '@playwright/test';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem('progression-fixture');
  if (fixture) {
    localStorage.setItem('dama-session-v1', fixture);
    sessionStorage.removeItem('progression-fixture');
    sessionStorage.setItem('dama-screen', 'play');
    sessionStorage.setItem('dama-active-puzzle', 'false');
  }
  localStorage.setItem(
    'dama-settings-v1',
    JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
  );
});
const ids = ['classic', 'crossroads', 'ring-road', 'twin-bridges', 'long-crossing', 'islands'];
const key = (id) => (id === 'classic' ? 'dama-progress-v1' : `dama-progress-${id}-v1`);
const progress = (id) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key(id));
async function finish(id, opponent, track = 'journey', mode = 'solo') {
  const move = await page.evaluate(
    async ({ id, opponent, track, mode }) => {
      const { mapFor } = await import('/src/game/maps.ts');
      const { initialState, key } = await import('/src/game/rules.ts');
      const map = mapFor(id),
        s = initialState('blue', id);
      const to = map.goals.blue.find((n) =>
        map.neighbours[n].some((m) => !map.goals.blue.includes(m)),
      );
      const from = map.neighbours[to].find((n) => !map.goals.blue.includes(n));
      s.board.fill(null);
      s.board[from] = 'blue';
      const enemy = map.points.findIndex(
        (_, n) => n !== to && n !== from && !map.goals.coral.includes(n),
      );
      s.board[enemy] = 'coral';
      s.delivered = { blue: 2, coral: 2 };
      s.history = [key(s)];
      sessionStorage.setItem(
        'progression-fixture',
        JSON.stringify({
          version: 1,
          state: s,
          opponent,
          track,
          mode,
          starter: 'blue',
          difficulty: 'standard',
          undo: [],
          matchId: `${id}-${opponent}-${track}-${mode}`,
        }),
      );
      sessionStorage.setItem('dama-screen', 'play');
      sessionStorage.setItem('dama-active-puzzle', 'false');
      return { from, to };
    },
    { id, opponent, track, mode },
  );
  await page.reload();
  await page.locator(`[data-node="${move.from}"]`).click();
  await page.locator(`[data-node="${move.to}"]`).click();
  await page.waitForSelector('#result-panel[open]');
}
try {
  await page.goto('http://localhost:5173');
  assert.equal(await page.locator('#track-journey').isChecked(), true);
  for (const id of ids) {
    await page.locator(`label:has(#map-${id})`).click();
    assert.equal(await page.locator('[data-rival="runner"]').isDisabled(), true);
    assert.equal(await page.locator('[data-rival="guardian"]').isDisabled(), true);
    for (const opponent of ['coral', 'runner', 'guardian']) {
      await finish(id, opponent);
      assert.equal((await progress(id)).wins[opponent], 1);
      await page.reload();
      await page.waitForSelector('#result-panel[open]');
      assert.equal((await progress(id)).wins[opponent], 1);
      if (opponent !== 'guardian') {
        const next = opponent === 'coral' ? 'runner' : 'guardian';
        await page.locator('#next-opponent').click();
        assert.equal(await page.locator(`#map-${id}`).isChecked(), true);
        assert.equal(await page.locator(`#track-journey`).isChecked(), true);
        assert.equal(await page.locator(`[data-rival="${next}"]`).isDisabled(), false);
        assert.equal(
          await page.locator(`[data-rival="${next}"]`).getAttribute('aria-pressed'),
          'true',
        );
      } else {
        assert.match(await page.locator('#journey-result').textContent(), /journeys? complete/);
        if (id !== 'islands') {
          assert.match(await page.locator('#next-opponent').textContent(), /Explore/);
          await page.locator('#next-opponent').click();
          assert.equal(await page.locator(`#map-${ids[ids.indexOf(id) + 1]}`).isChecked(), true);
        } else await page.locator('#result-panel .go-home').click();
        assert.match(await page.locator(`[data-map-progress="${id}"]`).textContent(), /3 \/ 3/);
      }
    }
  }
  const journeys = await page.evaluate(
    (keys) => keys.map((k) => localStorage.getItem(k)),
    ids.map(key),
  );
  await finish('islands', 'guardian');
  await page.locator('#practice-rival').click();
  assert.equal(await page.locator('#track-free-play').isChecked(), true);
  assert.equal(await page.locator('#map-islands').isChecked(), true);
  assert.equal(await page.locator('[data-rival="guardian"]').getAttribute('aria-pressed'), 'true');
  await page.locator('label:has(#track-free-play)').click();
  for (const rival of ['coral', 'runner', 'guardian'])
    assert.equal(await page.locator(`[data-rival="${rival}"]`).isDisabled(), false);
  await page.locator('label:has(#map-long-crossing)').click();
  await page.locator('[data-rival="guardian"]').click();
  await page.locator('#start-button').click();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).track),
    'free-play',
  );
  await page.locator('#home-button').click();
  await page.locator('label:has(#track-journey)').click();
  await page.locator('#continue-button').click();
  assert.match(await page.locator('#board-map-label').textContent(), /Free play/);
  await finish('long-crossing', 'guardian', 'free-play');
  assert.equal(await page.locator('#next-opponent').isVisible(), false);
  assert.match(await page.locator('#journey-result').textContent(), /do not affect Journey/);
  await finish('islands', 'coral', 'free-play', 'local');
  assert.deepEqual(
    await page.evaluate((keys) => keys.map((k) => localStorage.getItem(k)), ids.map(key)),
    journeys,
  );
  await page.locator('#result-panel .go-home').click();
  await page.locator('#puzzles-button').click();
  assert.equal(await page.locator('#pack-classic').isChecked(), true);
  await page.locator('[data-puzzle="last-step"]').click();
  await page.locator('[data-node="7"]').click();
  await page.locator('[data-node="6"]').click();
  await page.waitForSelector('#result-panel[open]');
  assert.deepEqual(
    await page.evaluate((keys) => keys.map((k) => localStorage.getItem(k)), ids.map(key)),
    journeys,
  );
  await page.locator('#result-panel .go-home').click();
  await page.locator('label:has(#track-free-play)').click();
  await page.reload();
  assert.equal(await page.locator('#track-free-play').isChecked(), true);
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 761, height: 752 },
    { width: 844, height: 390 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    for (const mode of ['journey', 'free-play']) {
      await page.locator(`label:has(#track-${mode})`).click();
      for (const selector of [
        '#track-select',
        '#opponent-cards',
        '#map-select',
        '#start-button',
        '#continue-button',
        '#puzzles-button',
      ]) {
        const r = await page.locator(selector).boundingBox();
        assert.ok(
          r &&
            r.x >= 0 &&
            r.y >= 0 &&
            r.x + r.width <= viewport.width + 1 &&
            r.y + r.height <= viewport.height + 1,
          `${mode} ${selector} ${JSON.stringify(viewport)} ${JSON.stringify(r)}`,
        );
      }
      // Short screens may scroll setup vertically; navigation and Play stay accessible.
      await page.locator('#difficulty-field').scrollIntoViewIfNeeded();
      await expect(page.locator('#difficulty-field')).toBeInViewport();
      await expect(page.locator('.lobby-heading')).toBeInViewport();
      await expect(page.locator('#start-button')).toBeInViewport();
      assert.equal(
        await page.locator('#home-screen').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        true,
        `Home scrolls horizontally: ${mode} ${JSON.stringify(viewport)}`,
      );
      assert.equal(await page.evaluate(() => scrollY), 0);
      await page.locator('#home-screen').evaluate((el) => (el.scrollTop = 0));
    }
  }
  await page.screenshot({ path: '.inspection/game-structure-home.png' });
  assert.deepEqual(errors, []);
  console.log(
    'Passed: six independent journeys, 18 real delivery/unlock results, reload deduplication, next-rival/map navigation, Free play isolation and persistence, and Classic puzzle pack.',
  );
} finally {
  await browser.close();
}
