---
name: screen-recorder
description: Records browser screen videos of user-specified flows using Playwright. Use when the user asks to record a video, screen capture, or visual evidence of a browser interaction flow, or mentions gravar, record, video, screen capture, or evidência visual.
---

## When to Use

- User asks to record a video of a browser flow
- User asks for visual evidence of a feature working
- User wants to capture a screen recording for PR evidence or QA
- User says "gravar", "record", "video", "screen capture", "evidencia visual"

## How It Works

Generate and run a Playwright script that:
1. Launches a headed Chromium browser with video recording enabled
2. Executes the user-specified flow step by step
3. Saves the video to `./test-videos/`

## Process

### Step 1: Understand the Flow

Ask the user (if not already clear) the following:

1. **URL**: What URL to start from?
2. **Steps**: What actions to perform? (click, fill, navigate, wait, etc.)
3. **Auth**: Does the flow require login or signup? If so, what credentials?
4. **Success criteria**: How to know the flow succeeded? (URL redirect, text on page, element visible, etc.)
5. **Environment**: Which environment? (localhost, staging, production)

If the user already provided all this in their message, skip the questions and proceed directly.

### Step 2: Generate the Script

Create a script at `scripts/screen-record-<flow-name>.mjs` following this template:

```js
import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    recordVideo: { dir: './test-videos', size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  try {
    // --- FLOW STEPS HERE ---
    // Each step should have a console.log describing what's happening
    // Use page.waitForTimeout() between steps for visual clarity in the video

    console.log('\nRESULT: PASS\n');
  } catch (err) {
    console.error('\nRESULT: FAIL -', err.message, '\n');
    // Take a screenshot on failure for debugging
    await page.screenshot({ path: './test-videos/failure-screenshot.png' });
  } finally {
    await context.close();
    await browser.close();
    console.log('Video saved to: ./test-videos/');
  }
}

run().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
```

### Step 3: Run the Script

```bash
mkdir -p test-videos
NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/screen-record-<flow-name>.mjs
```

Use `NODE_TLS_REJECT_UNAUTHORIZED=0` to avoid SSL issues with staging/dev environments.

### Step 4: Report Results

Tell the user:
- Whether the flow passed or failed
- Where the video file is saved (`./test-videos/*.webm`)
- File size of the video
- If it failed, show the error and the failure screenshot

## Script Guidelines

- **Always use `headless: false`** — headed mode produces better videos and avoids reCAPTCHA/bot detection issues
- **Add `console.log` for every step** — helps correlate video timestamps with actions
- **Add small waits between steps** (`page.waitForTimeout(500)`) — makes the video easier to follow
- **Use `waitForURL` or `waitForSelector`** after navigation — don't rely on fixed timeouts
- **Handle cookie consent dialogs** — many pages show these on first visit
- **Take screenshot on failure** — helps debug without re-watching the whole video
- **Use `try/finally` with `context.close()`** — ensures the video is finalized when context closes

## Prerequisites

The `playwright` package must be installed. If not:

```bash
npm install --no-save playwright
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright install chromium
```

## Cleanup

After the user confirms they have the video, offer to delete:
- The generated script in `scripts/`
- The video files in `test-videos/`
- The `playwright` package from `node_modules` (if installed with `--no-save`)
