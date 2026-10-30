---
title: "Per-Tenant Theming in a White-Label Portal Without Rebuilds"
description: "How to theme a white-label portal per tenant without rebuilds: store brands as validated tokens, apply CSS custom properties at runtime, check contrast."
pubDate: 2026-10-29
category: "building"
author: "Orvi"
readingTime: 8
tags: ["per tenant theming", "white label portal", "css custom properties", "multi-tenant saas", "client portal", "design tokens", "wcag contrast", "agency software"]
featured: false
---

Per tenant theming in a white label portal works by storing each brand as validated data and applying it as CSS custom properties at runtime. No build runs when a client changes a color or a logo. The mechanism is the easy part. Knowing the result is still legible is harder.

A common mistake is to treat theming as a styling problem. Colors and logos look like CSS, so the work gets filed under CSS, and CSS work gets solved by compiling. Then the second client asks for a different green, and the pipeline quietly grows a branch.

## Can you theme a white-label portal without a rebuild?

Yes. Store each tenant's brand as a small set of tokens in the database, load them per request, and write them to custom properties on the root element. The stylesheet only references variables, so the values can change without a build. The W3C's CSS Custom Properties Level 1 spec defines custom properties whose values any other property can read through `var()`. Its latest published snapshot is dated 16 June 2022 ([W3C, CSS Custom Properties for Cascading Variables Module Level 1](https://www.w3.org/TR/css-variables-1/)).

## Why not just compile a stylesheet per client?

Because each client becomes a branch you maintain. The per-client build looks safe: static CSS, reviewed once, shipped with a known output. Each of those branches is code nobody reviews again until it breaks, the same drift described in [the vibe-coding technical debt essay](https://www.robatdasorvi.com/chapters/building/how-to-build-with-ai-without-losing-track-of-what-you-are-actually-building).

The strongest counterargument is that build-time themes are safer because they're static and reviewed. I think that's right about the default theme and wrong about everything else. Review covers the colors someone typed into the repo last quarter. It never sees the values a tenant enters in month fourteen. Those need a check that runs on the value itself, at save time, which is what a runtime validator does. Static review doesn't reach them, so it doesn't deliver the safety it promises.

## Isn't letting tenants supply their own CSS the obvious move?

It's the most flexible option, and the one I'd avoid. Some admin frameworks do it. erupt, for example, looks up the tenant by the current host and applies that tenant's logo, CSS and JS, with lookups backed by an LRU cache ([erupt docs, tenant domain](https://docs.erupt.xyz/en/modules/pro/erupt-tenant/domain)). Arbitrary CSS can restyle your login and billing screens, and arbitrary JS is worse. The fix is to make tenant input data rather than code: an allowlist of tokens, each with a type.

## Do CSS variables validate themselves?

No. A custom property accepts almost any token sequence, so validation is your job. The obvious escape hatch is `CSS.registerProperty()`, which types a custom property and gives it a default. It only became Baseline in July 2024, and it checks syntax, not contrast, so it can't replace your own validator ([MDN, CSS.registerProperty()](https://developer.mozilla.org/en-US/docs/Web/API/CSS/registerProperty_static)).

So the validator lives in your code, and it checks the pairs that matter rather than each color in isolation:

```ts
// tenant_theme.ts: tenant input is data, never CSS
import { contrastRatio } from './contrast'; // WCAG relative-luminance ratio
const HEX = /^#[0-9a-f]{6}$/i;
const TOKENS = ['--brand', '--brand-text', '--surface', '--ink'] as const;

export function parseTheme(raw: Record<string, unknown>) {
  const theme: Record<string, string> = {};
  for (const key of TOKENS) {
    const value = raw[key];
    if (typeof value !== 'string' || !HEX.test(value)) {
      throw new Error(`invalid token ${key}`);
    }
    theme[key] = value;
  }
  // Check the pair, not the colors: text must read on its own background
  if (contrastRatio(theme['--brand-text'], theme['--brand']) < 4.5) {
    throw new Error('brand text fails 4.5:1 against brand');
  }
  if (contrastRatio(theme['--ink'], theme['--surface']) < 4.5) {
    throw new Error('ink fails 4.5:1 against surface');
  }
  return theme;
}

// emitted inside a nonce'd <style> block, not a style attribute
export function themeRule(theme: Record<string, string>) {
  return `:root{${TOKENS.map((k) => `${k}:${theme[k]}`).join(';')}}`;
}
```

The hex regex matters more than it looks. A value containing a semicolon can break out of the declaration you wrote into a style attribute, so the allowlist is what keeps tenant input from becoming CSS. The sketch is illustrative. It isn't a description of how [AgencyHandy](https://agencyhandy.com), the client portal I build, handles theming.

Writing tokens into a style attribute has a CSP cost. A strict `style-src` policy blocks inline style attributes unless you allow 'unsafe-inline' or 'unsafe-hashes', so either emit a nonce'd `<style>` block that sets `:root`, or set the properties from script with `style.setProperty()` ([MDN, Content-Security-Policy style-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src)).

The 4.5:1 threshold isn't my invention. WCAG 2.2 sets it as the AA minimum for normal text ([W3C, Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)). Checking it on save means a tenant can't publish brand text that fails the rule, even if nobody on the team ever looks at that tenant.

## What a token validator can't see

Here's the structural blind spot. The token check sees hex strings and the contrast ratio between the pairs I declared. It can't see a logo. A white logo on a transparent PNG, placed on a tenant's white header, passes every rule in the validator and renders as nothing. I've seen this failure shape before in a different system: for about six weeks my X growth bot logged every run as a success while four hardcoded target accounts that no longer existed absorbed 88% of its daily comment attempts. Every check passed because every check looked at the wrong thing.

So a valid config is not the same thing as a correct theme. Logs can prove the config was applied. They can't prove the portal looks right. Correctness has to be checked against the rendered result: load each tenant's portal with its theme applied, screenshot the header and primary buttons, and compare them with what the tenant expects. Playwright's `toHaveScreenshot()` does the pixel comparison against a stored baseline per tenant ([Playwright docs, Visual comparisons](https://playwright.dev/docs/test-snapshots)); I've used Playwright the same way for [end-to-end tests on the ScreenGuard extension](https://www.robatdasorvi.com/chapters/building/end-to-end-testing-a-manifest-v3-chrome-extension-with-playwright-simulating-screen-share-in-screenguard). That's a slower, heavier check than a token validator, and it's the only one that can see the logo.

## Can a token check ever see a logo?

Not from the token table. You could sample the pixels behind a logo's bounding box and compare them with the header color, which would catch the white-on-white case. That's a render-time check with its own false positives, and nobody has published how often a check like that flags a logo that's fine.

Several things are still open. It isn't obvious whether the rendered check should run on every save or in a nightly job. The answer depends on how often tenants change their themes. Cache invalidation is unresolved too. If a tenant changes a token and a CDN keeps serving the old root styles, the portal is wrong in a way the database will never show. And there's a first-paint problem. If tenant tokens are fetched on the client after the default theme renders, the page flashes the wrong brand for a moment. The nonce'd `<style>` block described above, rendered server-side, avoids the flash.

Tenant resolution by hostname, which decides whose theme loads in the first place, is covered in [the white-label custom domains essay](https://www.robatdasorvi.com/chapters/building/white-label-client-portals-on-custom-domains-automating-tls-for-agency-subdomains-in-agencyhandy). Keeping one tenant's data from leaking into another's portal is a separate problem, and [the Postgres row-level security essay](https://www.robatdasorvi.com/chapters/building/postgres-row-level-security-for-a-multi-tenant-agency-client-portal-design-and-pitfalls) covers that side. The open problem is the same one I keep hitting elsewhere: it's easy to prove a theme was applied, and much harder to prove it was seen.