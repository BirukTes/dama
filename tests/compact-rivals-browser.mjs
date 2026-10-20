import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('.inspection', { recursive: true });
const b = await chromium.launch({ channel: 'msedge', headless: true });
const p = await b.newPage({ viewport: { width: 374, height: 811 }, hasTouch: true });
try {
  await p.goto('http://localhost:5173');
  await p.locator('[data-locked-rival="runner"]').click();
  await expect(p.locator('#rival-info-record')).toContainText('Beat Coral to unlock The Runner');
  await expect(p.locator('[data-rival="coral"]')).toHaveAttribute('aria-pressed', 'true');
  await p.locator('#rival-info .close').click();
  await expect(p.locator('[data-locked-rival="runner"]')).toBeFocused();
  await p.locator('#rival-info-button').click();
  await expect(p.locator('#rival-info-title')).toContainText('Coral');
  await p.locator('#rival-info .close').click();
  for (const width of [320, 374, 390]) {
    await p.setViewportSize({ width, height: 811 });
    const r = await p.locator('#opponent-cards').boundingBox();
    assert.ok(r.height <= 195);
    const fit = await p
      .locator('#opponent-cards .opponent-card')
      .evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(fit);
  }
  await p.setViewportSize({ width: 374, height: 811 });
  await p.locator('#lobby-title').click();
  await p.screenshot({ path: '.inspection/compact-rivals.png' });
  await p.locator('label:has(#track-free-play)').click();
  await expect(p.locator('.rival-unlock')).toHaveCount(0);
  await p.locator('[data-rival="guardian"]').click();
  await expect(p.locator('#rival-summary-text')).toContainText('Tight defence');
  console.log(
    'Compact rival heights, unlock explanation, unchanged selection, focus return and Free play selection passed.',
  );
} finally {
  await b.close();
}
