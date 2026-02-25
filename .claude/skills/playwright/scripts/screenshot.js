#!/usr/bin/env node
/**
 * Playwright screenshot + interaction script.
 *
 * Usage:
 *   node screenshot.js <url> [options]
 *
 * Options:
 *   --output <path>        Screenshot output path (default: screenshot.png)
 *   --wait-for <selector>  Wait for CSS selector before screenshot
 *   --click <selector>     Click element before screenshot (repeatable)
 *   --fill <selector=val>  Fill input field, e.g. --fill "#email=test@test.com" (repeatable)
 *   --full-page            Capture full page (default: viewport only)
 *   --width <px>           Viewport width (default: 1280)
 *   --height <px>          Viewport height (default: 800)
 *   --delay <ms>           Wait N ms after page load (default: 0)
 *   --timeout <ms>         Navigation timeout (default: 30000)
 *
 * Examples:
 *   node screenshot.js http://localhost:3000 --output home.png --full-page
 *   node screenshot.js http://localhost:3000/login --click "#sign-in" --output after-click.png
 *   node screenshot.js http://localhost:3000 --wait-for ".hero-title" --output hero.png
 *   node screenshot.js http://localhost:3000/form --fill "#email=a@b.com" --fill "#pw=secret" --click "[type=submit]" --output submitted.png
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Auto-locate playwright from the npx cache if not resolvable normally
function resolvePlaywright() {
  try {
    return require('playwright');
  } catch (_) {}
  // Search npx cache
  const npxCache = path.join(process.env.HOME || '~', '.npm', '_npx');
  if (fs.existsSync(npxCache)) {
    for (const entry of fs.readdirSync(npxCache)) {
      const candidate = path.join(npxCache, entry, 'node_modules');
      if (fs.existsSync(path.join(candidate, 'playwright'))) {
        try {
          return require(path.join(candidate, 'playwright'));
        } catch (_) {}
      }
    }
  }
  throw new Error(
    'playwright not found. Install it with: npm install -g playwright  OR  npx playwright install'
  );
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node screenshot.js <url> [options]\nSee file header for full options.');
    process.exit(0);
  }

  const url = args[0];
  const opts = parseArgs(args.slice(1));

  const output = opts.output || 'screenshot.png';
  const width = parseInt(opts.width || '1280', 10);
  const height = parseInt(opts.height || '800', 10);
  const timeout = parseInt(opts.timeout || '30000', 10);
  const delay = parseInt(opts.delay || '0', 10);
  const fullPage = 'full-page' in opts;

  const { chromium } = resolvePlaywright();

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);

  console.log(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout });

  if (opts['wait-for']) {
    console.log(`Waiting for selector: ${opts['wait-for']}`);
    await page.waitForSelector(opts['wait-for']);
  }

  // --fill (repeatable)
  const fills = [opts['fill']].flat().filter(Boolean);
  for (const spec of fills) {
    const eqIdx = spec.indexOf('=');
    if (eqIdx === -1) throw new Error(`--fill requires "selector=value", got: ${spec}`);
    const selector = spec.slice(0, eqIdx);
    const value = spec.slice(eqIdx + 1);
    console.log(`Filling "${selector}" = "${value}"`);
    await page.fill(selector, value);
  }

  // --click (repeatable)
  const clicks = [opts['click']].flat().filter(Boolean);
  for (const selector of clicks) {
    console.log(`Clicking: ${selector}`);
    await page.click(selector);
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  if (delay > 0) {
    console.log(`Waiting ${delay}ms ...`);
    await page.waitForTimeout(delay);
  }

  const absOutput = path.resolve(output);
  await page.screenshot({ path: absOutput, fullPage });
  console.log(`Screenshot saved: ${absOutput}`);

  await browser.close();
}

/** Parse --key value flags into an object; repeated keys become arrays. */
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!key.startsWith('--')) continue;
    const name = key.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      result[name] = true; // boolean flag
    } else {
      if (name in result) {
        result[name] = [result[name]].flat().concat(next);
      } else {
        result[name] = next;
      }
      i++;
    }
  }
  return result;
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
