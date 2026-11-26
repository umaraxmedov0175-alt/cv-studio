import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function openStudio(page, { previewVisible = true } = {}) {
  await page.goto('/app/index.html');
  await page.keyboard.press('Escape');
  await expect(page.locator('#launch-overlay')).not.toHaveClass(/open/);
  if (previewVisible) await expect(page.locator('#preview-sheet')).toBeVisible();
}

test('studio has no serious WCAG 2.1 A/AA violations', async ({ page }) => {
  const expectAccessible = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = results.violations.filter(({ impact }) =>
      impact === 'critical' || impact === 'serious'
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  };

  await page.goto('/app/index.html');
  await expect(page.locator('#launch-overlay')).toHaveClass(/open/);
  await expectAccessible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#launch-overlay')).not.toHaveClass(/open/);
  await expectAccessible();
});

test('desktop studio layout matches its visual baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStudio(page);
  await expect(page).toHaveScreenshot('studio-desktop.png', { fullPage: false });
});

test('section editors follow CV replacement from the launch dialog', async ({ page }) => {
  await openStudio(page);
  await page.locator('#btn-open-launch').click();
  await page.locator('#btn-start-guided').click();
  await expect(page.locator('#p-first-name')).toHaveValue('');

  await page.locator('#btn-open-launch').click();
  await page.locator('#btn-start-sample').click();
  await expect(page.locator('#p-first-name')).toHaveValue('Alexander');
  await expect(page.locator('#experience-card-list [data-exp-f="position"]').first())
    .toHaveValue('Senior Full-Stack Engineer');
});

test('studio remains within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page, { previewVisible: false });
  await page.locator('#tab-mobile-preview').click();
  await expect(page.locator('#preview-sheet')).toBeVisible();
  await page.waitForFunction(() => {
    const sheet = document.querySelector('#preview-sheet').getBoundingClientRect();
    return sheet.left >= 0 && sheet.right <= window.innerWidth + 1;
  });

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
    sheet: document.querySelector('#preview-sheet').getBoundingClientRect()
  }));
  expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.sheet.width).toBeGreaterThan(0);
  expect(dimensions.sheet.left).toBeGreaterThanOrEqual(0);
  expect(dimensions.sheet.right).toBeLessThanOrEqual(dimensions.viewport + 1);
});

test('portrait uploads stay within the browser-storage budget', async ({ page }) => {
  await openStudio(page);
  const pngDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 1200;
    const context = canvas.getContext('2d');
    const image = context.createImageData(canvas.width, canvas.height);
    let seed = 1;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      image.data[i] = seed >>> 24;
      image.data[i + 1] = (seed >>> 16) & 255;
      image.data[i + 2] = (seed >>> 8) & 255;
      image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png');
  });
  const imageBuffer = Buffer.from(pngDataUrl.split(',')[1], 'base64');

  await page.locator('#p-photo-file').setInputFiles({
    name: 'portrait.png',
    mimeType: 'image/png',
    buffer: imageBuffer
  });
  await expect.poll(() => page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('european_cv_studio_v2'));
    return saved.personal.photoUrl.length;
  })).toBeGreaterThan(0);

  const savedPhotoLength = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('european_cv_studio_v2'));
    return saved.personal.photoUrl.length;
  });
  expect(savedPhotoLength).toBeLessThanOrEqual(180_000);
});

test('landing page does not depend on external font services', async ({ page }) => {
  const fontRequests = [];
  page.on('request', request => {
    if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(request.url())) {
      fontRequests.push(request.url());
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(fontRequests).toEqual([]);
});
