---
title: "Why Does Nobody Use My Open Source Project? 3 Months, Zero Users"
description: "Why nobody uses your open source project, what the adoption data actually says, and how to tell the difference between a dead repo and a normal one. Three months, zero users, and the belief I got wrong."
pubDate: 2026-09-06
category: "building"
author: "Orvi"
readingTime: 10
tags: ["open source", "developer tools", "building in public", "npm", "software distribution", "maintainers", "shipping", "documentation"]
featured: false
---

It's 1:40 in the morning and I'm typing *open source zero users launch* into a search bar. Again. The traffic panel on my repo says 14 unique visitors in 90 days and I'm fairly sure eleven of them were me. Tests pass. CI badge is green. Nobody has opened an issue. I've reached the stage where I'm checking whether the download counter is broken, because a broken counter would be better news than the alternative.

I refreshed that panel for three months. What I want to write down is what I actually believed while I was doing it, because I'd held the belief for years and it was wrong in a way I found too embarrassing to say out loud until now.

## Why does nobody use my open source project?

Because adoption happens when someone hits the problem, not when you publish the solution. Publishing puts your library in a catalog. Getting used means being the first adequate answer sitting there when the pain shows up.

Here's what I shipped: a small tool that diffed two OpenAPI schemas and printed the breaking changes between them. Around 2,400 lines, 91% test coverage, a real CONTRIBUTING file. It worked. After 74 days it had 4 stars (three of them from people whose phone numbers I have) and zero issues.

For most of my career I assumed the sequence was build, announce, adopt, and that when it broke, it broke at *announce*. That belief is comfortable because it puts the fix outside you. You didn't fail, you just weren't seen. So you go write a better tweet.

The scale problem underneath it is worth stating in numbers, because it reframes the silence. Sonatype's [2024 State of the Software Supply Chain](https://www.sonatype.com/state-of-the-software-supply-chain/introduction) estimated developers would request over six trillion open source packages across the four largest ecosystems in that year alone. Enormous demand exists. Almost none of it is browsing. It is resolving names it already decided on, mostly automatically, mostly without a human present.

The embarrassing part isn't that I was wrong about which step carried the weight. It's that I watched stars instead of downloads, and I knew why I was doing it. Stars can go up without a single person using your library. Downloads by unique installer can't. I picked the metric that let the work feel like it was landing, and I picked it again every night for a quarter.

## Is three months of zero users normal?

Yes. It's the median outcome, not the failure case. New repositories get created at a rate that makes silence the statistically expected result, and most of them are dead inside four years.

GitHub's [Octoverse 2025 report](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/) counted 121 million new repositories created in that year alone, against 395 million public repositories total, growing 19% year over year. A new developer now joins the platform roughly every second.

The survival numbers are worse. In a 2022 study presented at the Mining Software Repositories conference, Adem Ait, Javier Luis Cánovas Izquierdo and Jordi Cabot [tracked 1,127 repositories](https://dl.acm.org/doi/10.1145/3524842.3527941) created in 2016 across npm packages, R packages, WordPress plugins and Laravel packages, and found that more than half died within their first four years, with under a 50% chance of surviving past year five. They also described the typical shape of a project's life: short bursts of intense coding, followed by long stretches of nothing.

Put those two together and the arithmetic stops being personal. If a nine-figure number of repositories appears every year and the median one is inactive before its fourth birthday, then zero users at ninety days isn't a signal about your code. It's the base rate. You are reading a distribution and feeling a verdict.

Burst, then silence. From the inside that looks like death. Mostly it's just how these things breathe.

## How do developers actually find open source libraries?

Mostly they don't. A dependency arrives because something else pulled it in, because a colleague already used it, or because someone searched the exact phrasing of a problem they were stuck on at that moment. Deliberate discovery of a new library is the rare path, not the default one.

This is the part I had backwards for years. I pictured a developer evaluating options, comparing READMEs, choosing the best one. That happens occasionally, for large decisions: a framework, an ORM, a test runner. For a 2,400-line utility, nobody convenes a committee. Someone hits a wall at 6 p.m. and types the wall into a search bar.

The dependency data says the same thing from the other side. Black Duck's [Open Source Security and Risk Analysis](https://www.blackduck.com/blog/open-source-trends-ossra-report.html) reports have found for several years running that over 90% of scanned commercial codebases contain open source, with hundreds of components in a typical application. No engineer picked hundreds of things. The large majority came in transitively, dragged along by a handful of direct choices. Most open source "adoption" is not adoption at all. It's inheritance.

Which leaves two honest routes to being used. Either you become a direct dependency of something that is itself widely installed, which is slow and mostly outside your control, or you become the thing that ranks when a person types their bad afternoon into a search box. I had optimized for neither. I had optimized for looking good to a developer who was already on my repository page, a person who, in ninety days, essentially did not exist.

## Does launching on Hacker News get you users?

Rarely, and not the way you're imagining. A launch converts existing demand into installs. It does not manufacture the moment of need that makes someone install anything.

I want to take this objection seriously, because I believed it hardest and it's the one your friends will hand you. The argument goes: distribution is the bottleneck, so go buy attention. Show HN, three subreddits, a launch post, a demo GIF. I did all of it, following the [Show HN guidelines](https://news.ycombinator.com/showhn.html) to the letter. My post got 3 points and fell off `/newest` in about nineteen minutes. Obvious conclusion: I botched the launch.

So run the counterfactual where I didn't. Say the post hits the front page and sends 8,000 developers to the repository. All 8,000 land on a README. GitHub's [2017 Open Source Survey](https://opensourcesurvey.org/2017/), 5,500 randomly sampled respondents drawn from more than 3,800 repositories, found that 93% identified incomplete or confusing documentation as a pervasive problem, while 60% of contributors said they rarely or never write any. A traffic spike doesn't survive contact with a page that can't convert it. You'd be spending the one lottery ticket you get on a landing surface you never fixed.

And underneath that, the harder problem: those 8,000 people aren't currently diffing OpenAPI schemas. Attention that arrives at a moment of no need converts at roughly zero, however good the code is. Front-page traffic is a single afternoon. The need it would have to coincide with is spread across every afternoon of the next two years.

Look at what actually wins. The Linux Foundation and Harvard's Laboratory for Innovation Science published [Census II in 2022](https://www.linuxfoundation.org/blog/blog/a-summary-of-census-ii-open-source-software-application-libraries-the-world-depends-on), aggregating over half a million observations of open source usage inside production applications at thousands of companies. The most-depended-on npm packages, version-agnostic, were: lodash, react, axios, debug, @babel/core, express, semver, uuid, react-dom, jquery. Eight of those ten are boring chores. Nobody launched `semver`. Nobody wrote a manifesto for `uuid`. The same report noted that a striking number of the world's most-used packages sit on individual personal accounts with weaker security practices than any enterprise would tolerate, which tells you polish and promotion aren't the gate. Being the earliest adequate answer to a recurring chore is.

The counterargument loses on its own best case. A louder launch buys a taller spike over the same flat line.

## Does better documentation get you more users?

It doesn't create demand. It stops you losing the demand you already have, which for most of us is a much smaller number than we'd like to admit.

On day 84 someone opened issue #1. Not a bug report. One line: does this work with JSON Schema draft-07? The answer was no, because I'd built the version that was interesting to build rather than the version people were standing in front of.

I went back and read the first sentence of my README honestly. It described what the library *was*: the architecture, the zero dependencies, the parser. It said nothing about the thing it replaced, which was a person at 6 p.m. manually eyeballing two YAML files before a deploy and hoping they hadn't just broken a customer's integration.

Nobody searches for your library. They search for their error message, or for the sentence that describes their bad afternoon. My README contained neither. That's not a marketing failure. That's me writing for the version of myself who wanted to be admired for the parser.

There's a second-order cost too, and the 2017 survey numbers make it concrete: if 93% of people report documentation as a pervasive problem while 60% of contributors rarely write any, then documentation is where the entire ecosystem is thin. Being clear is one of the few advantages still lying on the ground. It's just that clarity is a conversion multiplier, not a traffic source. Multiply zero visitors by any factor you like.

I rewrote it to open with the exact failure it prevents and the exact command you'd otherwise run by hand. Traffic didn't explode. But the two people who turned up after that both installed it, and one of them is still on it.

## When should I kill my open source project?

Kill it when you stop reaching for it yourself. Not at a star threshold, not on a date. The moment you'd rather solve the problem some other way than use your own tool, the project is over and you already know it.

Everything else is a slower version of that. Tidelift's 2024 survey of over 400 maintainers found that [60% of open source maintainers are unpaid](https://dev.to/tidelift/60-of-maintainers-are-still-not-paid-for-their-work-35jo), unchanged from prior years, and close to 60% have quit or considered quitting a project they maintain. That's the base rate you're operating inside. You are not deciding whether to be unusually persistent. You are deciding how long to keep paying an unfunded cost that most people in your position eventually stop paying.

The exit rarely arrives as a decision, either. In "Why Do People Give Up FLOSSing?", Courtney Miller, David Gray Widder, Christian Kästner and Bogdan Vasilescu [surveyed established contributors in 2019](https://www.cs.cmu.edu/~ckaestne/pdf/oss19.pdf) and found the most commonly cited reason for disengagement wasn't failure or conflict. It was a transition. A new job. Leaving academia. Life moved and the project got left where it stood. If you don't make the call, circumstance makes it for you and everyone agrees to call it burnout.

What I had wrong for years, stated plainly: I thought open source publishing was a funnel with a leak at the top. It isn't a funnel. It's inventory. You're putting a part on a shelf, and the only question that matters is whether someone walks down that aisle holding that exact broken thing, and whether your label is readable from three feet away in the four seconds they'll give it.

Three months isn't the measurement window. It isn't even the warm-up. That 2022 survival data is measured in years because years are the unit adoption moves in.

---

So, concretely.

Open the repository tonight and delete the first paragraph of your README. Put the error message there instead, or the manual command the person is running at the moment they need you. Then stop looking at stars and watch one number: did *you* reach for your own library this week, for real work, without forcing it?

If yes, keep going quietly, and give it eighteen months instead of three. Ship the version people are standing in front of rather than the one that was fun to build.

If no, archive it today, write down which part of building it you actually enjoyed, and put that part at the center of the next thing.

Both of those are fine outcomes. The only losing move is the one I was making at 1:40 in the morning, which is refreshing.