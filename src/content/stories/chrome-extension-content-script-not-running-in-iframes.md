---
title: "Chrome Extension Content Script Not Running in Iframe"
description: "Chrome content scripts skip iframes unless all_frames is true; sandboxed, srcdoc and about:blank frames need more. The manifest fix and Chrome 133 change."
pubDate: 2026-11-19
category: "building"
author: "Orvi"
readingTime: 8
tags: ["chrome extension", "content scripts", "manifest v3", "iframes", "browser extensions", "debugging", "chrome.scripting"]
featured: false
---

Your content script runs on the top page and quietly skips the iframe. That's the default, and it's documented, which is cold comfort. A content script does not run inside an iframe unless you tell it to, because the manifest key `all_frames` defaults to `false` and only the top frame gets matched. Set `"all_frames": true` in `content_scripts`, add `"match_about_blank": true` for `about:blank` and `srcdoc` frames, and `"match_origin_as_fallback": true` for sandboxed frames and `data:`, `blob:` and `filesystem:` frames. Chrome's `chrome.scripting` API has used the fallback behavior by default since Chrome 133, but the manifest key still defaults to top frame only.

Most extension bugs announce themselves. A content script that never runs in a frame usually doesn't. Nothing throws, nothing logs, and the element you meant to change just isn't there. An extension can pass every test on a single top-level page and have proven only that its top frame works. The content that most needs protecting often sits one frame down.

## Why does my content script skip the iframe?

The default is a deliberate scope limit. The content-script manifest reference says `all_frames` "defaults to `false`, meaning that only the top frame is matched" ([Chrome for Developers, content_scripts manifest reference](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)). Until you opt in, every iframe on the page is outside the script's reach.

Opting in isn't the end of it. Chrome checks each frame's URL on its own. The same reference says that with `all_frames` set to true, "each frame is checked independently for URL requirements." So a frame whose URL doesn't match your `matches` pattern gets skipped, even when its parent matched.

Frames whose URLs match no scheme pattern need separate keys. That covers `about:blank`, `data:`, `blob:`, and `filesystem:`, and sandboxed frames, whose origin is opaque. The reference says `match_about_blank` covers `about:blank` frames whose parent URL matches, and that `match_origin_as_fallback` should be set to true to reach `data:`, `blob:`, and `filesystem:` frames. So the fix is three flags:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "all_frames": true,
      "match_about_blank": true,
      "match_origin_as_fallback": true,
      "run_at": "document_idle"
    }
  ]
}
```

With `match_origin_as_fallback` set, Chrome requires the path in every match pattern to be a wildcard.

If you inject programmatically instead, the equivalent call targets every frame in the tab:

```js
// Requires the "scripting" permission and host permissions for the target page.
await chrome.scripting.executeScript({
  target: { tabId, allFrames: true },
  files: ["content.js"],
});
```

Programmatic injection is easier to debug. You can list frames with `chrome.webNavigation.getAllFrames` and inject by `frameIds` when one frame is the problem. The manifest approach is declarative and fires on navigation, which is what most extensions want.

## How do I check whether the script ran in the iframe?

Open DevTools on the page and go to the Console. Use the JavaScript Context dropdown, which defaults to `top`, to select the iframe's browsing context. An injected content script appears under that frame with the extension's name, and if the extension's context is missing for that frame, the script was not injected there. Sources > Content scripts lists what was injected. The Console behavior is described in the [Chrome DevTools Console reference](https://developer.chrome.com/docs/devtools/console/reference).

## Doesn't setting all_frames: true fix it?

It fixes the default scope and leaves three failure modes open. The first is URL matching. A cross-site iframe whose origin isn't in your `matches` list is still skipped, because the frame's own URL gets checked. The second is timing. A frame created by script without a `src` may not exist yet when your script is injected; that's my inference, not something the reference states. The third is the one people miss: the frame's origin. The evidence for it below is the PSA on `chrome.scripting`, which is about programmatic injection, not manifest content scripts.

The Chromium developers' PSA on the `chrome.scripting` change makes the origin point concrete. Its example puts an `<iframe src="about:blank">` next to a sandboxed `<iframe srcdoc="...">`. Before the change, the PSA says, "the first frame would be matched but the second frame would not." After it, "both frames would be included by default" ([Chromium Extensions group, "PSA: Updated frame matching behavior in chrome.scripting API"](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/D8DcJARVM90/m/mj4U-XOCAAAJ), posted January 16, 2025).

So a sandboxed `srcdoc` frame was invisible to programmatic injection before Chrome 133, even when the author had asked for every frame. An extension author who set `allFrames: true`, saw the script work on the parent page, and moved on would reasonably assume the frame case was covered. It wasn't. For a manifest content script the same gap exists until you set `match_origin_as_fallback`; the PSA's change did not alter the manifest defaults.

## Didn't Chrome 133 already fix this?

Chrome 133 fixed one API, and the PSA is careful about its scope. Starting in Chrome 133, "`scripting.executeScript`, `scripting.insertCSS` and `scripting.removeCSS`" use `match_origin_as_fallback` by default. The PSA names only those three methods; it doesn't mention the manifest `content_scripts` keys, which keep their documented defaults.

So the fix you ship depends on how you inject. A declarative content script still defaults to top frame only and still needs `all_frames`. A programmatic injection now matches sandboxed and `about:blank` frames without being asked. Code written against the older behavior, or a `content_scripts` block copied from an old tutorial, keeps the old gaps. The PSA also keeps an escape hatch: "you can still use the `frameIds` key in the target selector" when you want specific frames only.

Browser behavior isn't uniform, either. MDN's WebExtensions reference for the `content_scripts` key describes `match_origin_as_fallback` as injecting into `about:`, `data:`, and `blob:` pages when their origin matches the pattern, even if the document origin is opaque because of CSP or an iframe sandbox ([MDN, manifest.json content_scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts)). An extension that ships to both browsers needs to test frame coverage in each one.

## Isn't frame coverage a niche edge case?

It's niche only when the frames don't matter, and the cost of a missed frame depends on what's inside it. A content script that adds a helper widget can ignore an embedded frame without much harm. An extension that redacts, blocks, or classifies content can't, because the frame is often where the sensitive value lives.

I have direct experience of this failure pattern, though not with iframes. For about six weeks, my approval-gated X growth agent sent comment attempts to four hardcoded target accounts that no longer existed. Those four absorbed 88% of the daily comment attempts. Every run logged success, and nothing raised an error. By every signal the bot emitted, it was healthy, and the work it existed to do was going nowhere. Frames have the same shape. An injection that matches nothing produces no error, so a log that says "script injected" only records the frames you asked for, not the frames that exist.

## What changes if you count frames?

[ScreenGuard](https://www.robatdasorvi.com/screenguard), the free Chrome extension I build for people who share their screen, blurs email addresses, phone numbers, card numbers and API keys in page text and form fields while you share your screen. Its test suite is built around false positives: 215 real websites must produce no UI, 77 adversarial look-alikes must stay clean, and 10 addiction-support services must never be blocked. A browser e2e suite checks real HTTP blocking and pre-paint redaction. A false-positive suite answers whether an extension flagged the wrong thing. Frame coverage is a separate question that neither kind of suite answers by itself: whether the script ran in the frame at all. It's the check I'd add to any redaction extension, mine included, and the recipe below is a proposal, not something I've published results for.

The practical change is to measure frame coverage as a number. In a test build, count the frames `chrome.webNavigation.getAllFrames` reports (this needs the `webNavigation` permission). Filter that list to frames whose URL your `matches` patterns cover, or that inherit a matching origin. Then count the frames your script reports as injected, and fail the test when the filtered list and the injected list differ. Pair that with a fixture containing a sandboxed `srcdoc` frame, an `about:blank` frame, and a cross-site frame, since those are the cases the default manifest is most likely to skip.

The same gap shows up in agent and automation engineering. Playwright, which browser agents and end-to-end tests drive, also scopes to one frame at a time: page-level interactions such as `click` are assumed to operate in the main frame, and an iframe has to be reached through `frameLocator()` or a frame object from `page.frame()` ([Playwright, Frames](https://playwright.dev/docs/frames)). Any tool acting on a page, whether an extension or an agent, has to enumerate frames rather than assume the top document is the page.

Extension teams should stop treating "it works on the page I tested" as a shipping criterion. An extension that touches content makes a claim about every frame the user can see, and the frames it silently skips are the ones nobody wrote a test for. For sensitive-content tools, a missed frame isn't a rendering bug. It's a value on a shared screen that the extension said it had covered.

For a worked example of testing a Manifest V3 extension end to end, see the [Playwright test of a Manifest V3 Chrome extension for ScreenGuard](https://www.robatdasorvi.com/chapters/building/end-to-end-testing-a-manifest-v3-chrome-extension-with-playwright-simulating-screen-share-in-screenguard).