      await navigationBehavior(page);
      await previewLoaded(page);
      for (const theme of ['light', 'dark']) {
        if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) await page.locator('[data-theme-toggle]').click();
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
          for (const view of viewIds) {
            await goView(page, view);
            const layout = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
            assert.ok(layout.content <= layout.viewport + 1, `${view}/${theme} horizontal overflow at ${width}px`);
            if (view === 'home') {
              const bounds = await page.locator('#home').boundingBox();
              assert.ok(bounds.height >= (width < 768 ? 844 : 1000) - (width <= 640 ? 72 : 80) - 1, 'Home must fill the initial viewport');
              assert.ok(!await page.locator('#work').isVisible(), 'Home must not reveal Work');
            }
            if (view === 'work') {
              await previewLoaded(page);
              const image = await page.locator('[data-preview-image]').boundingBox();
              assert.ok(image && image.width > 0 && image.x >= -1 && image.x + image.width <= width + 1, 'Project screenshot must remain in bounds');
              assert.ok(Math.abs(image.width / image.height - 1100 / 760) < .02, 'Project screenshot must preserve its aspect ratio');
            }
            if ([390, 1440].includes(width)) {
              await audit(page, `${name}-${width}-${view}`, theme);
              if (['home', 'work', 'experience'].includes(view)) {
                const path = resolve(resultsDir, `sections-${name}-${width}-${theme}-${view}.png`);
                await captureScreenshot(page, { path, fullPage: true });
                report.screenshots.push(path);
              }
            }
          }
        }
      }
