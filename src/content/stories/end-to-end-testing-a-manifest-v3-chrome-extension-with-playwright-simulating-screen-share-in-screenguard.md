---
title: "Playwright Test a Manifest V3 Chrome Extension: ScreenGuard Log"
description: "How to Playwright-test a Manifest V3 Chrome extension: load it in a persistent context, find the service worker, and test screen-share-only behavior."
pubDate: 2026-10-20
category: "building"
author: "Orvi"
readingTime: 9
tags: ["playwright", "chrome extension", "manifest v3", "end-to-end testing", "screen sharing", "browser testing"]
featured: false
---

To Playwright-test a Chrome extension built on Manifest V3, launch Chromium with launchPersistentContext, load the unpacked dist/ folder, and read the extension ID from the service worker URL. The hard part for [ScreenGuard](https://www.robatdasorvi.com/screenguard), the free open-source extension I built for people who share their screen, is that some of its behavior (blurring sensitive values and blocking personal pages) only happens while sharing is on.

ScreenGuard's repo ships `npm run test:e2e`, which the README describes as browser checks including real HTTP blocking and pre-paint redaction; the code below is an illustrative sketch of the technique, not that suite.

## Why does a Chrome extension need a real browser to test?

A Manifest V3 extension is typically a handful of cooperating pieces, such as a service worker, content scripts and extension pages, that only behave correctly inside Chrome's extension runtime. A unit test can check the classification logic. It can't tell you whether the content script actually runs on the page, or whether the service worker wakes up when the popup flips a switch.

The Playwright documentation describes the working setup: `chromium.launchPersistentContext` with `--disable-extensions-except` and `--load-extension` pointing at the built folder, then reading the extension ID from the service worker URL. The docs say extensions only work in Chromium when launched with a persistent context. That one sentence rules out the easy path of a fresh, throwaway browser per test.

A minimal fixture looks like this. It's an illustrative sketch of the approach from Playwright's docs, not a copy of ScreenGuard's test code:

```ts
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
  ],
});
let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const extensionId = worker.url().split('/')[2];
```

The `channel: 'chromium'` option matters. Playwright's docs say it lets extensions run headless, with headed mode as the alternative. That makes headless runs possible in CI, and headed mode stays available for debugging a failing test.

## What does ScreenGuard's test suite check?

The unit suite is built around false positives, with 215 real websites that must produce no UI, 77 adversarial look-alikes such as `essex.gov.uk` and `bet.com` that must stay clean, and 10 addiction-support services that must never be blocked, while `npm run test:e2e` covers real HTTP blocking and pre-paint redaction. The unit suite covers classification, policy, bypasses, storage, patterns and performance, but the blur and the personal-page block only apply while sharing is on, so the screen-share state is the part a browser test has to cover.

## What does "sharing my screen" actually change inside the extension?

Turning on "I'm sharing my screen" in the popup makes ScreenGuard blur emails, phone numbers, card numbers and API keys on the page and block personal pages such as webmail. A test therefore has to put the extension into the sharing state, reload the demo page, and assert what appears on screen. The README's test table checks risky-link warnings and blocks in steps 2 through 6, before the sharing toggle appears in step 7.

In Chrome, `getDisplayMedia` opens a picker, and an automated test has to get past it. The flags for the camera and microphone are well documented: `--use-fake-device-for-media-stream` replaces the camera, and `--use-fake-ui-for-media-stream` skips the permission prompt. A testRTC write-up covers manipulating `getUserMedia` and available devices for tests ([testRTC](https://testrtc.com/manipulating-getusermedia-available-devices/)). The switch commonly used to auto-pick a screen capture source is `--auto-select-desktop-capture-source`. I haven't confirmed how it behaves with ScreenGuard.

So "simulating screen share" is narrower than the title suggests. The test sets the sharing state the way the popup does, then checks what the extension does in that state. It doesn't prove the browser's own capture permission flow works.

## Isn't mocking the state just testing a fake?

Yes, and that's the strongest objection. A test that writes a hypothetical sharing flag directly into extension storage will pass even if the popup's real toggle is broken. The defense is to split the test in two.

One test drives the real popup. It clicks "I'm sharing my screen" through the extension's own page, then reloads the demo. That shows the toggle writes the state the rest of the extension reads. A second test seeds the state directly and covers blur, block, and warning behavior across many cases. The first test is slow and narrow. The second is fast and wide.

The reason to split isn't elegance. A mock can hide exactly the failure that matters. My Telegram Skip button did nothing for months. Every skipped item got counted as a timeout, so the approval statistics were wrong. A test that clicked the real button would have caught it on the first run. A test that seeded the outcome would have passed forever.

The reverse failure matters too. If the seeded test is the only one, the popup can rot and nothing turns red.

## How do you open the extension popup and assert the blur in Playwright?

The sketch below shows the general shape of the check. It is an illustrative sketch, not ScreenGuard's actual test code.

Start by opening the demo page at the path the README gives, `chrome-extension://<id>/demo.html`, using the extension ID read from the service worker. Before sharing is on, the demo should look untouched. Then click the "I'm sharing my screen" toggle in the popup, and reload the demo page, as the README's manual steps do. Finally, assert the visible result rather than any internal state. Playwright's `expect` retries the assertion until the chip appears or the timeout runs out, so the check waits without a fixed sleep.

```ts
import { expect } from '@playwright/test';

// Illustrative sketch, not ScreenGuard's actual test code.
// `popup` is assumed to be a Page already open on the extension popup.
const page = await context.newPage();
await page.goto(`chrome-extension://${extensionId}/demo.html`);

await popup.getByLabel("I'm sharing my screen").click();
await page.reload();

await expect(page.getByText('7 sensitive items hidden')).toBeVisible();
```

A stronger version would also check the computed `filter` style of a sensitive value, since that is the outcome the blur exists for:

```ts
// Illustrative assertion form only. `sensitiveValue` is a placeholder locator.
await expect(sensitiveValue).toHaveCSS('filter', /blur/);
```

## Why do the tests keep passing when the product is broken?

Because the selectors and assertions are written against the version you have, and the product changes underneath them. Y2K is the closest precedent: the defect only appeared on a date the test systems never produced. The same gap applies to a sharing session, which a normal test environment never reaches. When X suspended my approval-gated growth agent's account on 2026-07-21, the lockout check fired and returned True, but the caller skipped one action and the loop kept running for 3.5 more days. When X suspended it again on 2026-09-22, the check matched none of its known selectors and never fired, so the bot kept running until I stopped it by hand. A check that never runs looks identical to a check that passes. For how a suite can quietly stop checking what you think it checks, see [losing track of what your AI-built code actually does](https://www.robatdasorvi.com/chapters/building/how-to-build-with-ai-without-losing-track-of-what-you-are-actually-building).

For ScreenGuard, the README already lists what to verify by hand: toggle sharing, reload the demo, watch the values blur and the "7 sensitive items hidden" chip appear. The e2e tests should assert those same visible outcomes, not internal flags. If the test checks the blur or the chip, a broken popup fails loudly instead of quietly.

The counterargument I keep returning to is that browser tests are slow and flaky, so you should test everything in units and accept the gap. I think that's wrong for a privacy tool. The product's promise is about what appears on screen. A unit test can confirm that a classifier flags `paypa1.com` as a lookalike. It can't confirm that the lookalike warning is painted over the link a person is hovering. The README sets the stakes. The unit suite is built around false positives, because that's the failure that gets a privacy extension uninstalled. The browser test is the only place both are visible.

A retry that turns a flaky run green is another way a failing signal goes quiet; the [Playwright docs on test retries](https://playwright.dev/docs/test-retries) cover how retries are configured.

## What is still unresolved?

Three things, and I don't have answers yet.

First, I haven't verified how the real `getDisplayMedia` picker behaves under automation. `--auto-select-desktop-capture-source` is the commonly cited switch, but I haven't confirmed it with ScreenGuard, so this piece makes no claim that the real share flow is covered by automation.

Second, flakiness is the risk any headless extension suite has to watch. The README describes an `npm run test:e2e` command covering real HTTP blocking and pre-paint redaction. A flaky suite gets ignored, which is the same failure as a silent one. Comparing API responses has the same noise problem, and [ignoring dynamic fields so comparisons stay stable](https://www.robatdasorvi.com/chapters/building/cutting-noise-in-api-drift-alerts-how-apidiffguard-ignores-timestamps-ids-and-reordered-arrays) is one way to handle it.

Third, a browser extension has no fixed deadline and no clear test target. Chrome changes its extension APIs, and the tests will drift with them. A sharing-state test written today can't promise it will still reach the right branch after the next Chrome release. I'll probably learn that the way the bot taught me: when something important stops firing and nothing turns red.

This is the agent-engineering version of the same problem. For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of my approval-gated X growth agent's daily comment attempts. Every run logged success and nothing raised an error, so the failure stayed invisible. Google's SRE book makes a related argument in its [chapter on monitoring distributed systems](https://sre.google/sre-book/monitoring-distributed-systems/): watch the symptoms users see, not the internal signals. A test that asserts the visible outcome, the way the blur and the chip do, applies the same discipline to the browser.

Sources:
- [Playwright: Chrome extensions](https://playwright.dev/docs/chrome-extensions)
- [testRTC: Manipulating getUserMedia and Available Devices](https://testrtc.com/manipulating-getusermedia-available-devices/)
- [Playwright: Test retries](https://playwright.dev/docs/test-retries)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)