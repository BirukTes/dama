import { chromium, expect } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  if (!localStorage.getItem('dama-settings-v1'))
    localStorage.setItem(
      'dama-settings-v1',
      JSON.stringify({ motion: true, sound: false, soundPreferenceSet: true }),
    );
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.locator('#start-button').click();
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="4"]').click();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem('dama-session-v1')).state.turns >= 2 &&
      !document.querySelector('.traveller'),
  );
  const saved = await page.evaluate(() => localStorage.getItem('dama-session-v1'));
  assert.equal(await page.locator('#undo-button').isHidden(), true);
  await page.locator('#undo-button').evaluate((el) => el.click());
  assert.equal(await page.evaluate(() => localStorage.getItem('dama-session-v1')), saved);
  await page.reload();
  assert.equal(await page.locator('#undo-button').isHidden(), true);
  await page.locator('#home-button').click();
  await page.locator('label:has(#track-free-play)').click();
  await page.locator('#start-button').click();
  await page.locator('#confirm-new').click();
  await page.locator('[data-node="2"]').click();
  await page.locator('[data-node="4"]').click();
  await expect(page.locator('#undo-button')).toBeEnabled();
  await page.locator('#undo-button').click();
  assert.equal(
    await page.evaluate(() => JSON.parse(localStorage.getItem('dama-session-v1')).state.turns),
    0,
  );
  await page.locator('#pause-button').click();
  await page.locator('#pause-settings').click();
  await page.locator('#backup-settings summary').click();
  assert.equal(await page.locator('#backup-restore').isDisabled(), true);
  await page.locator('#settings .primary.close').click();
  await page.locator('#pause .primary').click();
  await page.locator('#home-button').click();
  await page.locator('#settings-button').click();
  const download = page.waitForEvent('download');
  await page.locator('#backup-export').click();
  const text = await readFile(await (await download).path(), 'utf8'),
    backup = JSON.parse(text);
  assert.equal(backup.format, 'dama-backup');
  await page.locator('#backup-file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{invalid'),
  });
  await expect(page.locator('#backup-status')).toContainText('not a readable');
  await page.locator('#theme').selectOption('dark');
  const file = { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) };
  await page.locator('#backup-file').setInputFiles(file);
  await expect(page.locator('#backup-preview')).toBeVisible();
  assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
  await page.locator('#backup-cancel').click();
  assert.equal(await page.locator('body').getAttribute('data-theme'), 'dark');
  await page.locator('#backup-file').setInputFiles(file);
  await expect(page.locator('#backup-restore')).toBeEnabled();
  await Promise.all([page.waitForNavigation(), page.locator('#backup-restore').click()]);
  assert.equal(
    await page.evaluate(() => localStorage.getItem('dama-session-v1')),
    backup.entries['dama-session-v1'],
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem('dama-settings-v1')),
    backup.entries['dama-settings-v1'],
  );
  await page.locator('#local-button').click();
  assert.equal(await page.locator('#board [tabindex="0"]').count(), 1);
  await page.locator('#board .node.blue').first().focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#board [aria-pressed="true"]').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#board [aria-pressed="true"]').count(), 0);
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).not.toBeVisible();
  assert.equal(await page.locator('#board [tabindex="0"]').count(), 1);
  const focused = await page.evaluate(() => document.activeElement.dataset.node);
  await page.keyboard.press('ArrowDown');
  assert.notEqual(await page.evaluate(() => document.activeElement.dataset.node), focused);
  await page.locator('#home-button').click();
  await page.locator('label:has(#difficulty-gentle)').click();
  await page.locator('#help-button').click();
  await expect(page.locator('#help-challenge-note')).toContainText('Gentle uses shorter lookahead');
  await page.locator('#help .primary.close').click();
  assert.deepEqual(errors, []);
  console.log(
    'Passed Journey undo protection, Free play undo, backup download, malformed rejection, preview/cancel and restore with saved state/preferences.',
  );
} finally {
  await browser.close();
}
