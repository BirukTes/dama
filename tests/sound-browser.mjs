import { chromium } from '@playwright/test';
import { strict as assert } from 'node:assert';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const legacy of [false, true]) {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript((legacy) => {
      if (legacy && !localStorage.getItem('dama-settings-v1'))
        localStorage.setItem('dama-settings-v1', JSON.stringify({ sound: false }));
      window.audioEvents = [];
      const NativeAudioContext = window.AudioContext;
      window.AudioContext = class extends NativeAudioContext {
        resume() {
          window.audioEvents.push({ kind: 'resume', active: navigator.userActivation.isActive });
          return super.resume();
        }
        createOscillator() {
          window.audioEvents.push({ kind: 'tone', state: this.state });
          return super.createOscillator();
        }
      };
    }, legacy);
    await page.goto('http://localhost:5173/');
    assert.equal(await page.locator('#sound').isChecked(), true);
    await page.locator('#local-button').click();
    await page.locator('[data-node="2"]').click();
    await page.locator('[data-node="4"]').click();
    await page.waitForFunction(() => window.audioEvents.some((e) => e.kind === 'tone'));
    assert.equal(
      await page.evaluate(() => window.audioEvents.some((e) => e.kind === 'resume' && e.active)),
      true,
    );
    assert.equal(
      await page.evaluate(() =>
        window.audioEvents.some((e) => e.kind === 'tone' && e.state === 'running'),
      ),
      true,
    );
    await page.locator('#settings-button').click();
    await page.locator('#sound').uncheck();
    await page.locator('#settings .primary').click();
    await page.reload();
    assert.equal(await page.locator('#sound').isChecked(), false);
    await page.locator('[data-node="0"]').click();
    await page.locator('[data-node="1"]').click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('dama-session-v1')).state.turns === 2 &&
        !document.querySelector('.traveller'),
    );
    assert.equal(
      await page.evaluate(() => window.audioEvents.filter((e) => e.kind === 'tone').length),
      0,
    );
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(
    'Passed: sound defaults on for fresh and legacy settings, audio resumes during user activation, move tone uses a running context, explicit mute persists and stays silent.',
  );
} finally {
  await browser.close();
}
