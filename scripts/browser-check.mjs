import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname, sep } from 'node:path';
// Serve dist with GitHub Pages directory semantics; no Astro development fallback.
const prefix = (process.env.BASE_PATH || '/kardiologas_lt').replace(/\/$/, '');
const root = resolve('dist');
const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};
const server = process.env.PREVIEW_URL
  ? null
  : createServer(async (req, res) => {
      try {
        const path = decodeURIComponent(
          new URL(req.url, 'http://localhost').pathname,
        );
        if (prefix && !path.startsWith(prefix + '/')) {
          res.writeHead(404).end();
          return;
        }
        let file = resolve(root, '.' + path.slice(prefix.length));
        if (file !== root && !file.startsWith(root + sep)) {
          res.writeHead(403).end();
          return;
        }
        if ((await stat(file)).isDirectory())
          file = resolve(file, 'index.html');
        res.setHeader(
          'Content-Type',
          mime[extname(file)] || 'application/octet-stream',
        );
        res.end(await readFile(file));
      } catch {
        res
          .writeHead(404, { 'Content-Type': 'text/html' })
          .end(await readFile(resolve(root, '404.html')));
      }
    });
if (server) await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base =
  process.env.PREVIEW_URL ||
  `http://127.0.0.1:${server.address().port}${prefix}/`;
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // External embeds are covered by URL checks; don't load third-party players in tests.
  await context.route(/https:\/\/(www\.)?(youtube\.com|google\.com)\//, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><title>External embed</title></html>',
    }),
  );
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('.slide-pause').click();
  await page
    .locator('img')
    .evaluateAll((images) =>
      images.forEach((image) => (image.loading = 'eager')),
    );
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete),
  );
  await page.waitForTimeout(2800);
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
  });
  assert.equal(await page.locator('.slide.is-active').count(), 1);
  await page.locator('[data-slide="1"]').click();
  assert.equal(
    await page.locator('.slide-2').getAttribute('aria-hidden'),
    'false',
  );
  await page.locator('[data-slide="2"]').click();
  assert(await page.locator('.hero-map').getAttribute('src'));
  await page.locator('[data-slide="0"]').click();
  await page.locator('.faq details').nth(1).locator('summary').click();
  assert(
    await page
      .locator('.faq details')
      .nth(1)
      .evaluate((e) => e.open),
  );
  assert(
    !(await page
      .locator('.faq details')
      .first()
      .evaluate((e) => e.open)),
  );
  await page.locator('.video-launch').click();
  assert(await page.locator('.video-dialog').evaluate((e) => e.open));
  await page.keyboard.press('Escape');
  assert(!(await page.locator('.video-dialog').evaluate((e) => e.open)));
  await page.locator('.video-container iframe').waitFor({ state: 'detached' });
  await page.locator('.submenu-toggle').first().focus();
  await page.keyboard.press('Enter');
  assert.equal(
    await page.locator('.submenu-toggle').first().getAttribute('aria-expanded'),
    'true',
  );
  const routes = JSON.parse(await readFile('docs/route-manifest.json', 'utf8'));
  for (const route of routes) {
    const response = await page.goto(base + route.path.replace(/^\//, ''), {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200, route.path);
    const broken = await page
      .locator('img')
      .evaluateAll((images) =>
        images
          .filter((i) => i.complete && i.naturalWidth === 0)
          .map((i) => i.src),
      );
    assert.deepEqual(broken, [], `Broken images ${route.path}`);
    assert(await page.locator('h1').count(), route.path);
  }
  await page.goto(base + 'kardiologas-kontaktai/');
  await page.locator('#contact-form button').click();
  assert.equal(await page.locator('#contact-form input:invalid').count(), 2);
  await page.locator('input[name="name"]').blur();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(900);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    'Contact overflow',
  );
  await page.screenshot({
    path: 'test-results/contact-desktop.png',
    fullPage: true,
  });
  await page.goto(base + 'paieska/?s=Holterio');
  await page.waitForSelector('#search-results article');
  assert((await page.locator('#search-results article').count()) > 0);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await page.waitForTimeout(250);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Home overflow at ${width}`,
    );
    if (width === 390) {
      await page.waitForTimeout(2800);
      await page.screenshot({
        path: 'test-results/home-mobile.png',
        fullPage: true,
      });
      await page.screenshot({ path: 'test-results/home-mobile-fold.png' });
      await page.locator('.menu-toggle').click();
      assert(await page.locator('#main-navigation').isVisible());
      await page.locator('.submenu-toggle').first().click();
      await page.locator('#services-menu a').first().click();
      assert(page.url().includes('/kardiologo-konsultacija/'));
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of routes) {
    await page.goto(base + route.path.replace(/^\//, ''));
    await page.waitForTimeout(850);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Mobile overflow: ${route.path}`,
    );
  }
  for (const path of [
    '3781-2/',
    '3792-2/',
    'feed/',
    'feed.xml',
    'puslapio-nera/',
  ]) {
    const missing = await page.goto(base + path);
    assert.equal(missing.status(), 404, path);
    assert(
      await page
        .getByRole('heading', { name: 'Puslapis nerastas' })
        .isVisible(),
    );
  }
  const reduced = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(base);
  assert.equal(
    await reducedPage.locator('.slide-pause').getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(
    await reducedPage
      .locator('.letter')
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
    'none',
  );
  await reduced.close();
  const nojs = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const nojsPage = await nojs.newPage();
  await nojsPage.goto(base);
  assert(await nojsPage.locator('.slide-1 h1').isVisible());
  assert(await nojsPage.locator('#main-navigation').isVisible());
  await nojs.close();
  assert.deepEqual(errors, []);
  await writeFile(
    'test-results/browser-report.json',
    JSON.stringify(
      {
        routes: routes.length,
        widths: [390, 768, 1024, 1440],
        checks: [
          'slider',
          'map',
          'faq',
          'video dialog',
          'keyboard menu',
          'mobile menu',
          'required form fields',
          'search',
          'reduced motion',
          'no JavaScript',
          'no page errors',
        ],
      },
      null,
      2,
    ),
  );
  console.log('Browser checks passed. Screenshots and report: test-results/');
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
