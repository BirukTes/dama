import { chromium, expect } from '@playwright/test';
import { strict as assert } from 'node:assert';
const browser = await chromium.launch({channel:'msedge',headless:true});
const page = await browser.newPage({viewport:{width:390,height:844}});
await page.addInitScript(()=>{if(!localStorage.getItem('dama-settings-v1')) localStorage.setItem('dama-settings-v1',JSON.stringify({motion:true,sound:false,soundPreferenceSet:true}));});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.locator('#start-button').click();
  await page.locator('[data-node="2"]').click();await page.locator('[data-node="4"]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('dama-session-v1')).state.turns>=2 && !document.querySelector('.traveller'));
  const saved=await page.evaluate(()=>localStorage.getItem('dama-session-v1'));
  assert.equal(await page.locator('#undo-button').isHidden(),true);
  await page.locator('#undo-button').evaluate(el=>el.click());
  assert.equal(await page.evaluate(()=>localStorage.getItem('dama-session-v1')),saved);
  await page.reload();assert.equal(await page.locator('#undo-button').isHidden(),true);
  await page.locator('#home-button').click();await page.locator('label:has(#track-free-play)').click();
  await page.locator('#start-button').click();await page.locator('#confirm-new').click();
  await page.locator('[data-node="2"]').click();await page.locator('[data-node="4"]').click();
  await expect(page.locator('#undo-button')).toBeEnabled();await page.locator('#undo-button').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dama-session-v1')).state.turns),0);
  assert.deepEqual(errors,[]);
  console.log('Passed Journey undo protection, reload and direct-handler guard; Free play undo.');
} finally {await browser.close();}
