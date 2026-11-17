const viewIds = ['home', 'work', 'experience', 'about', 'skills', 'contact'];
async function goView(page, id) {
  await page.evaluate((view) => { location.hash = view; }, id);
  await page.waitForFunction((view) => document.body.dataset.view === view, id);
  const shown = await page.locator('#main > section').evaluateAll((sections) => sections.filter((section) => section.getClientRects().length).map((section) => section.id));
  assert.deepEqual(shown, [id], 'Only the selected section should be displayed');
}
async function clickView(page, id) {
  const link = page.locator(`#primary-nav a[href="#${id}"]`);
  if (!await link.isVisible()) await page.locator('[data-menu-toggle]').click();
  await link.click();
  await page.waitForFunction((view) => document.body.dataset.view === view, id);
  assert.ok(await page.locator(`#${id} h1, #${id} h2`).first().evaluate((heading) => heading === document.activeElement), 'Navigation should focus the selected heading');
  assert.equal(await link.getAttribute('aria-current'), 'page', 'Navigation should identify the selected page');
  assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'), 'false', 'Navigation should close the mobile menu');
  const shown = await page.locator('#main > section').evaluateAll((sections) => sections.filter((section) => section.getClientRects().length).map((section) => section.id));
  assert.deepEqual(shown, [id]);
}
async function navigationBehavior(page) {
  await page.goto(url, { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'home', 'The initial page should show Home');
  for (const id of viewIds.slice(1)) assert.ok(!await page.locator(`#${id}`).isVisible(), `${id} must not appear on the initial Home screen`);
  const height = await page.locator('#home').evaluate((home) => ({ home: home.getBoundingClientRect().height, header: document.querySelector('.site-header').getBoundingClientRect().height, viewport: innerHeight }));
  assert.ok(height.home >= height.viewport - height.header - 1, 'Home should fill the viewport below the header');
  assert.ok(!await page.locator('.site-footer').isVisible(), 'The Home screen should not reveal the footer');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await clickView(page, 'work');
  await clickView(page, 'experience');
  await page.goBack();
  await page.waitForFunction(() => document.body.dataset.view === 'work');
  await page.goForward();
  await page.waitForFunction(() => document.body.dataset.view === 'experience');
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'experience', 'Reload should honor the selected section URL');
  for (const id of viewIds) await clickView(page, id);
  await page.goto(`${url}/#not-a-section`, { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'home', 'Invalid routes should fall back to Home');
  await page.goto(`${url}/#skills`, { waitUntil: 'networkidle' });
  assert.ok(await page.locator('#skills').isVisible(), 'Direct Skills links should work on first load');
  await page.setViewportSize({ width: 390, height: 844 });
  await clickView(page, 'experience');
  await page.locator('[data-menu-toggle]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-menu-toggle]').getAttribute('aria-expanded'), 'false');
  await page.locator('.skip-link').focus();
  await page.locator('.skip-link').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main', 'Skip link should focus the current main content');
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'experience');
}
