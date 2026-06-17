---
title: "Internet Fragmentation: What the Splinternet Means for Developers"
description: "The global internet is fracturing into regional segments — and what that means for builders and users who never had much power over it to begin with."
pubDate: 2026-05-16
category: "future"
author: "Orvi"
readingTime: 7
tags: ["internet fragmentation", "splinternet", "balkanization", "geopolitics", "open web", "digital sovereignty", "censorship", "future of the internet"]
featured: false
---

There's a particular experience you have growing up online in Bangladesh. You get used to things just... not working. A payment gateway that only supports cards issued in the US. A streaming service that says your country isn't supported. A developer tool that works fine until you notice the pricing page lists a separate, worse tier for your region. You assume this is just the normal friction of being on the periphery of things.

What I didn't fully understand until recently is that the internet was always heading toward more of this, not less. The fracturing isn't a bug in global connectivity. Increasingly, it looks like the destination.

## What Does "Balkanization" Even Mean Here?

Balkanization of the internet — often called the splinternet — is the breakup of one open, global network into separate regional internets, each with its own laws, infrastructure, and access controls. The term is borrowed from history: the Balkan Peninsula, which spent a century splintering into smaller, mutually suspicious states after empires collapsed.

The term gets borrowed from history — the Balkan Peninsula, which spent a century splintering into smaller, mutually suspicious states after empires collapsed. Applied to the internet, it describes a similar process: a network that was supposed to be borderless, singular, and open fragmenting into regional fiefdoms, each with its own rules, infrastructure, and walls.

The word choice is doing a lot of work, and not everyone likes it. But the underlying process is real regardless of what you call it. Governments are asserting control over data flows. Companies are building infrastructure that respects those assertions. Users are increasingly experiencing different internets depending on where they live.

China built the obvious case first. The Great Firewall isn't just censorship — it's an entire parallel ecosystem. WeChat instead of WhatsApp. Weibo instead of Twitter. Baidu instead of Google. Alipay doing what Visa does in other countries. For the 1.4 billion people inside it, the western internet is a rumor. For the western internet, China is a massive market that's essentially inaccessible through normal channels. That's not friction. That's a wall. And the wall is measurable: a 2020 study by the GFWatch project found the Great Firewall was actively blocking roughly 311,000 domains, around 41,000 of them apparently by accident ([The Record](https://therecord.media/chinas-great-firewall-is-blocking-around-311k-domains-41k-by-accident)).

Russia has spent years trying to build something similar with Runet — a nationally controlled internet infrastructure capable of operating in isolation from the global network. Russia's "sovereign internet" law took effect on November 1, 2019, and from June 15 to July 15, 2021 the country ran a month of disconnection exercises that authorities declared a success ([The Moscow Times](https://www.themoscowtimes.com/2021/07/22/russia-successfully-disconnected-from-world-wide-web-in-tests-rbc-a74581)). Whether it actually works as intended is another question, but the ambition itself is telling. A national kill switch for internet traffic used to sound like paranoid fiction. Now it's an explicit policy goal for multiple governments.

## Why Did Europe Make Things More Complicated Than I Expected?

Europe fragments the internet through regulation rather than censorship: laws like the GDPR and the Digital Markets Act force any company that wants European users to deploy a distinct, compliant version of itself for the bloc. It doesn't come from authoritarian impulse — it comes from something closer to principle.

Europe's version is stranger and more interesting to me, because it doesn't come from authoritarian impulse. It comes from something closer to principle.

The General Data Protection Regulation. The Digital Markets Act. Ongoing fights about data localization. The EU has built what amounts to a regulatory fence around its digital space — not by blocking content, but by requiring companies that want European users to play by European rules. The rules are often reasonable. But the effect is the same as any other fragmenting force: a company now has to think about which version of itself to deploy in which jurisdiction. And the enforcement has teeth: cumulative GDPR fines passed €5.88 billion ($6.17 billion) by January 2025 ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2025/01/dla-piper-gdpr-fines-and-data-breach-survey-january-2025)), led by a record €1.2 billion penalty against Meta in May 2023 for transferring European user data to the US ([European Data Protection Board](https://www.edpb.europa.eu/news/news/2023/12-billion-euro-fine-facebook-result-edpb-binding-decision_en)).

Freedom House tracks this every year in their [Freedom on the Net](https://freedomhouse.org/report/freedom-on-the-net) report. The data isn't cheerful. Internet freedom declined globally for the fourteenth consecutive year in their 2024 assessment. Governments across the political spectrum — democracies included — are building more tools to monitor, control, and occasionally shut down their portions of the network.

What's notable is that these aren't all the same kind of control. China's model is about political containment. Russia's is about strategic infrastructure independence. Europe's is ostensibly about user rights and market fairness. India has its own data localization ambitions. The United States has its own export controls on chips and software that shape what technology can legally exist in other countries.

They're fragmenting the internet through completely different philosophies, which makes the result harder to reason about. There's no unified splinternet. There are multiple competing visions of what a controlled internet should look like, all happening simultaneously.

## What Does a Developer Actually Do With This?

You pick a lane. In practice, fragmentation means choosing which legal regimes, data jurisdictions, and regional payment and CDN stacks you can realistically support — because serving every market at once is no longer affordable for a small team.

I've been building on the web for years now. The practical experience of internet fragmentation is less dramatic than the geopolitical framing suggests, but it compounds in annoying ways.

You think about it when you're choosing a payment processor and realize that covering Southeast Asia requires an entirely different stack than covering Europe. You think about it when a user in a sanctioned country files a bug report for software they shouldn't technically be able to access. You think about it when you're evaluating a CDN and realize that some of their nodes are inside jurisdictions with data-sharing agreements you don't fully trust.

The Economist ran an extended piece on exactly this problem — the practical engineering reality of building for a fragmented network — and their conclusion was roughly that the companies with enough scale to maintain parallel infrastructure will thrive, and the companies without that scale will increasingly have to pick a lane. [Their Technology Quarterly coverage](https://www.economist.com/technology-quarterly) has tracked this for years. Pick a legal regime. Pick a data jurisdiction. Pick which users you can realistically serve.

For a solo developer or a small team in Dhaka or Lagos or Bogotá, "pick a lane" is a polite way of saying "accept that your market is smaller than you thought." The fragmented internet is, functionally, more expensive to build for than the open one was. The costs of compliance, legal review, and infrastructure redundancy don't scale down to small teams. They favor incumbents.

## Is This Actually Irreversible?

Probably, at least for now. The new barriers are laws and economic incentives rather than technical faults, and the internet's famous ability to route around damage can't route around a legal requirement.

I keep wondering this. The internet's original architecture was deliberately resistant to centralized control — that was a design choice, famously made with nuclear-war resilience in mind. Data would find paths around blockages. The network would route around damage.

What's happened is that the blockages have gotten smarter. They're not technical failures the network routes around. They're human-enforced rules with economic teeth. If you want to do business in China, you comply with Chinese internet rules. If you want to serve European users, you comply with GDPR. The technical architecture of the internet can't route around a law the way it routes around a broken router.

The Council on Foreign Relations [published analysis on this](https://www.cfr.org/report/confronting-reality-cyberspace) that makes a point I find genuinely uncomfortable: the open, borderless internet was always partly a fiction maintained by the dominance of a small number of countries — primarily the US — that preferred it that way for their own interests. The "open web" was never neutral. It just had a hegemon whose interests happened to align with openness for a few decades.

As that alignment weakens, we're not watching the internet break. We're watching it reveal its actual political nature.

## What Comes After the Splinternet?

Not one clean thing. The most plausible outcome isn't a tidy split into three or four rival internets, but a single network that still technically connects while more and more content, infrastructure, and functionality quietly becomes invisible or inaccessible depending on where you are.

The scenario I find most plausible isn't a clean split into three or four competing internets — though that framing is useful shorthand. It's something messier: a global network that technically still connects, but where an increasing amount of content, infrastructure, and functionality is invisible or inaccessible depending on where you are.

VPNs will proliferate. Tor will see more usage. Mirror sites will multiply. Technical workarounds will chase policy restrictions in an exhausting arms race. Most people, in most countries, will just experience a slightly more annoying and limited version of the internet without fully understanding why.

For developers who build things that are meant to work globally, the work gets harder. More legal research. More infrastructure decisions. More thinking about what version of your product exists in which jurisdiction.

For users in countries with weaker bargaining power — which is most countries — the trajectory probably means slower access to new technology, fewer services, and more intermediaries deciding what reaches them and what doesn't.

---

I grew up thinking the internet's openness was a force of nature. It turns out it was a policy choice, made by people with specific interests, at a specific moment in history. That moment is ending. The question isn't whether the internet fragments — it's which fragments you end up in, and whether you had any say about it.

Most of us didn't. Most of us still don't.
