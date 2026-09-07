import assert from 'node:assert/strict';

export default {
  name: 'lantern-path-hd2d',
  viewport: { width: 390, height: 844 },
  async run({ page, baseUrl, check, screenshot }) {
    await page.goto(`${baseUrl}?seed=1`);
    await check('perspective hybrid scene initializes without rendering errors', async () => {
      await page.locator('#modal-action:enabled').waitFor({ timeout: 30000 });
      assert.equal(await page.locator('#app').getAttribute('data-presentation'), 'perspective-hybrid');
      assert.equal(await page.locator('#app').getAttribute('data-area'), 'lantern');
    });
    await page.locator('#modal-action').click();
    await page.waitForFunction(() => document.querySelector('#app').dataset.state === 'playing');
    await page.waitForTimeout(500);
    await screenshot('lantern-entrance-mobile');
    await check('player walks beneath the volumetric gate and up the raised approach', async () => {
      const before = Number(await page.locator('#app').getAttribute('data-z'));
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(1600);
      await page.keyboard.up('KeyW');
      const after = Number(await page.locator('#app').getAttribute('data-z'));
      assert.ok(after < 51.1, `${before} -> ${after}`);
      assert.equal(await page.locator('#app').getAttribute('data-area'), 'lantern');
    });
    await screenshot('beneath-gate-mobile');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(350);
    await screenshot('lantern-desktop');
  },
};
