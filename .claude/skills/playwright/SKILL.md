---
name: playwright
description: Navigate webpages and take screenshots using Playwright. Use when asked to screenshot a URL, verify a UI visually, capture page state after interactions (clicks, form fills, navigation), or validate that a running local service looks correct.
---

# Playwright

Use `scripts/screenshot.js` (Node.js, auto-detects Playwright from npx cache) to navigate pages and capture screenshots.

## Prerequisites

Chromium must be installed once:

```bash
npx playwright install chromium
```

## Usage

```bash
node .claude/skills/playwright/scripts/screenshot.js <url> [options]
```

| Option | Description |
|--------|-------------|
| `--output <path>` | Output path (default: `screenshot.png`) |
| `--full-page` | Capture full scrollable page |
| `--wait-for <selector>` | Wait for CSS selector before screenshot |
| `--click <selector>` | Click element (repeatable) |
| `--fill <selector=value>` | Fill input field (repeatable) |
| `--delay <ms>` | Extra wait after load |
| `--width <px>` / `--height <px>` | Viewport size (default: 1280×800) |
| `--timeout <ms>` | Navigation timeout (default: 30000) |

## Common Patterns

**Simple page screenshot:**
```bash
node .claude/skills/playwright/scripts/screenshot.js http://localhost:3000 --output home.png --full-page
```

**Wait for element to render:**
```bash
node .claude/skills/playwright/scripts/screenshot.js http://localhost:3000 --wait-for ".hero-title" --output hero.png
```

**Fill a form then submit:**
```bash
node .claude/skills/playwright/scripts/screenshot.js http://localhost:3000/login \
  --fill "#email=test@example.com" \
  --fill "#password=secret" \
  --click "[type=submit]" \
  --output after-login.png
```

**Click a button then screenshot:**
```bash
node .claude/skills/playwright/scripts/screenshot.js http://localhost:3000 \
  --click ".open-modal-btn" \
  --wait-for ".modal" \
  --output modal-open.png
```

## Viewing Screenshots

After capturing, read the image file with the Read tool to display it inline in the conversation.

## Workflow: Visual Verification

1. Run the script to capture the page
2. Read the output PNG with the Read tool to view it inline
3. Report what is visible and whether it matches expectations
