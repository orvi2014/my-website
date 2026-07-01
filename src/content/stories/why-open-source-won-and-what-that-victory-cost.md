---
title: "Why Is Open Source Maintenance Unpaid?"
description: "Open source won the technical argument. The people keeping critical infrastructure running are often unpaid volunteers, a cost nobody budgeted for."
pubDate: 2026-06-10
category: "technology"
author: "Orvi"
readingTime: 9
tags: ["open source", "software history", "linux", "developer culture", "tech economics", "software sustainability", "programming", "open source funding"]
featured: false
---

I grew up in Bangladesh writing software on pirated Windows. Not proudly, just practically. Legitimate licenses cost more than a month's household income, and there was no legal pathway that made sense for a teenager in Dhaka who wanted to learn programming. So you patched what you could, cracked what you couldn't, and felt vaguely guilty about all of it.

Then I found Linux. And then the entire ecosystem sitting underneath it: Apache, Python, GCC, MySQL, Firefox. Software that was just *there*, for free, with source code you could actually read. It felt like someone had left the library door unlocked overnight.

That feeling didn't last forever. But the movement it introduced me to changed everything, not just for me, but for every company building software today, whether they acknowledge it or not. The open source model won the technical argument. What it never quite figured out is the economic one.

## How did a bunch of hackers actually beat Microsoft?

Open source didn't beat Microsoft through strategy or funding. It beat them because the software kept getting better, and eventually there was no honest argument left that proprietary was superior.

The longer story starts with Richard Stallman in 1983. He wanted to fix a bug in the firmware for a Xerox printer at MIT, got refused access to the source code, and decided the entire model of proprietary software was ethically broken. His response was to announce he'd write a free Unix-compatible operating system from scratch. The GNU Project.

It took about a decade before that project had a kernel worth running. Linus Torvalds provided it in 1991, almost by accident: a Finnish computer science student posting to a newsgroup that he was "doing a (free) operating system (just a hobby, won't be big and professional like gnu)." The understatement of the decade.

By the mid-nineties, Eric S. Raymond had published "The Cathedral and the Bazaar," an essay that tried to explain why this chaotic, distributed model of software development actually worked. His argument was that given enough eyeballs, all bugs are shallow. [The essay](http://www.catb.org/~esr/writings/cathedral-bazaar/cathedral-bazaar/) became something like a founding document of the open source movement, and it was persuasive enough that Netscape released the source code to their browser shortly after reading it.

What Microsoft thought about all this leaked in 1998 through what became known as the Halloween Documents: internal memos where Microsoft engineers acknowledged that Linux was a genuine competitive threat and debated strategies to counter it. The recommended approach involved spreading fear about licensing and legal risk. It didn't work. Or rather, it worked for a while, and then the market moved on without them.

The deeper thing the Halloween Documents revealed is that Microsoft understood exactly what they were dealing with. They just couldn't figure out how to fight it within the constraints of their own business model. You can't undercut free.

## When did open source stop being radical?

Open source stopped being radical when companies realized that giving software away could be more profitable than selling it.

Somewhere around 2010, something shifted. Open source stopped being a movement and became the default. You can pinpoint it a few ways: Google's Android shipped on Linux. Facebook open-sourced React. Amazon built AWS on top of open source infrastructure and then sold it back to the world at a margin. The rebellious fringe became the industrial foundation.

By 2024, roughly [96% of the world's servers run Linux](https://www.zdnet.com/article/linux-dominates-the-server-world/). The web layer is dominated by open source databases, runtimes, and frameworks. When a startup raises a seed round and starts building, they are almost certainly standing on PostgreSQL, Node.js, Redis, Kafka, or some combination thereof. These tools are free to use, and the companies that depend on them are not small.

The irony is thick. Stallman's original enemy was the proprietary software company that hoarded code for profit. Forty years later, the world's most profitable companies, Google, Amazon, Microsoft itself, are built on free software. They contribute back, selectively, when it suits them. They also extract at a scale that would have been unimaginable to anyone writing GPL-licensed code in a university basement in 1983.

This isn't a conspiracy. It's just economics. Nobody planned for the bazaar to get a corporate sponsor. It happened because open source was better, and once it was better enough to rely on, capital showed up. The question nobody wanted to answer was: what does that mean for the people who built the foundation?

## What does winning actually look like from the inside?

Winning looks like this: the infrastructure that runs the modern internet is maintained, in significant part, by people working for free or close to it.

In April 2014, a vulnerability called Heartbleed was disclosed in OpenSSL, the cryptographic library used by roughly two-thirds of HTTPS websites at the time. The bug had existed for two years. It allowed attackers to read memory from servers, potentially exposing passwords, private keys, and session tokens. The scope was staggering. And when journalists started reporting on it, they discovered that OpenSSL was maintained by a tiny team, operating on a budget of roughly $2,000 per year in donations, while protecting an estimated $200 billion worth of internet commerce annually. [The reporting at the time](https://www.wired.com/2014/04/heartbleed/) made the economics look almost comical, except it wasn't funny.

Log4Shell in 2021 exposed a critical vulnerability in Log4j, a Java logging library used in enormous portions of enterprise software worldwide. Within 72 hours of disclosure, [Check Point Research recorded over 800,000 exploitation attempts globally](https://blog.checkpoint.com/security/the-numbers-behind-a-cyber-pandemic-detailed-dive/), with attackers targeting an estimated 44% of corporate networks worldwide. The maintainers were again unpaid volunteers who suddenly had to deal with an avalanche of abuse and demands from companies whose infrastructure was on fire. None of those companies had ever paid anything for Log4j. Most of them probably didn't even know it was in their stack.

Then in early 2024, a sophisticated attacker spent nearly two years cultivating trust in the xz-utils project under a fake identity before inserting a backdoor into the codebase. A supply chain attack, patient and precise. It was caught almost accidentally: a Microsoft engineer named Andres Freund noticed SSH logins were taking 500ms longer than expected and decided to investigate why. [That investigation](https://www.openwall.com/lists/oss-security/2024/03/29/4) is now a minor legend in security circles. If Freund hadn't been curious on a Friday afternoon, that backdoor might have shipped in mainstream Linux distributions across the world.

These aren't arguments against open source. They're arguments about what sustaining a victory actually requires, and who's been carrying that weight.

## Is the business model just broken?

The business model isn't broken exactly. It was never designed. It emerged, and emergence doesn't produce clean economics.

There have been genuine attempts to fix this. GitHub Sponsors, Open Collective, and Tidelift let developers accept money for their work, but the money mostly hasn't followed the need. [Tidelift's 2021 survey](https://tidelift.com/about/press-releases/survey-finds-many-open-source-maintainers-are-stressed-out-and-underpaid-but-persist-so-they-can-make-a-positive-impact) of nearly 400 open source maintainers found that 46% were not paid anything at all for their maintenance work. Some projects found sustainable models: Red Hat built a billion-dollar company selling support for open source software and got acquired by IBM for $34 billion. Elastic, HashiCorp, and MongoDB built commercial open source businesses that kept the core code available while restricting what cloud providers could do with it commercially.

That last strategy has caused real friction. When HashiCorp relicensed Terraform in 2023, moving it from the Mozilla Public License to the Business Source License, it felt to many contributors like a rug pull. You build something together under one set of terms, and then the company changes the terms once the software becomes valuable enough to protect. [The resulting fork, OpenTofu](https://opentofu.org/), became the Linux Foundation's fastest-growing project within months of launch. The open source community, when it feels betrayed, turns out to be very good at forking.

What makes this genuinely hard is that the people complaining loudest about relicensing are often companies who were never paying for the software in the first place. There's a particular kind of moral indignation that large organizations deploy when a small team of maintainers tries to capture even a fraction of the value they created, as if the original gift of open source comes with a contractual obligation to remain broke forever.

I've been on the receiving end of that dynamic at a much smaller scale. You write something useful, you open-source it, and then someone from a company with 200 engineers submits an issue demanding you fix it immediately as if you are their employee. It's a specific flavor of entitlement that the movement, in its idealism, didn't really anticipate. Stallman was angry about printer drivers. He probably wasn't anticipating billion-dollar cloud businesses filing support tickets against unpaid maintainers.

The economic structure that emerged is essentially a massive transfer of value: developers build the commons, large companies extract from it, and the gap between what's extracted and what flows back to maintainers is not a rounding error. It's the operating model.

## Who's actually funding the commons now?

Some money is flowing back. The question is whether it's going to the right places.

The Linux Foundation, Apache Software Foundation, and similar organizations pool corporate contributions and distribute them across projects. The OpenSSF (Open Source Security Foundation), launched in 2020, specifically targets security work on critical open source projects. After Heartbleed, there was a genuine attempt to address the "critical infrastructure maintained by volunteers" problem, and the Alpha-Omega Project now funds security improvements at scale. [Alpha-Omega launched in February 2022](https://openssf.org/press-release/2022/02/01/openssf-announces-the-alpha-omega-project-to-improve-software-supply-chain-security-for-10000-oss-projects/) with $5 million from Microsoft and Google, later growing to $8.5 million after Amazon joined. It's real money. It's also a rounding error against the value the commons generates every year.

But the distribution is uneven. High-profile projects get attention. The libraries sitting three layers below the thing you actually use, the ones that nobody thinks about until they fail, tend not to make it onto anyone's priority list until something explodes.

I've started paying for open source tools I use seriously. Not because I'm obligated to, but because the alternative, a world where critical infrastructure runs on volunteer goodwill and corporate inertia, seems genuinely fragile. The xz incident was stopped by luck. The next one might not be.

## So what did the victory actually cost?

Open source won the technical argument decades ago. The software is often better, the development model works, and the accumulated commons of freely available code is one of the most remarkable things humanity has produced through voluntary cooperation. I mean that without irony. When I was a teenager in Dhaka who couldn't afford a Windows license, the existence of Linux was not a small thing.

What the movement hasn't won is the economic argument. The cost of the victory is distributed unevenly: enormous wealth for companies that build on top of the commons, intermittent burnout and financial precarity for the people maintaining the foundation. The library door is still unlocked. What nobody budgeted for is keeping the lights on inside.

I don't have a clean resolution to offer, and I'd be suspicious of anyone who does. The movement wasn't built on clean resolutions. It was built on stubbornness and idealism and, occasionally, spite. Maybe that's still enough. Maybe the xz incident produces better supply chain tooling. Maybe the Heartbleed money eventually flows toward the next critical library before it fails.

Or maybe we keep learning the same lesson every few years, just with a different CVE number attached, and a different group of unpaid maintainers staring at their inbox wondering what they signed up for.

The library door is still unlocked. I'm still glad it is. I just think about the person who has to keep the lights on inside.