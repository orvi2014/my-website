---
title: "White-Label Client Portal on a Custom Domain: Automating SSL"
description: "A white-label client portal on a custom domain needs SSL issued and renewed for every agency. Here is where that automation fails silently."
pubDate: 2026-10-16
category: "building"
author: "Orvi"
readingTime: 9
tags: ["white label client portal", "custom domain ssl", "TLS automation", "client portal software", "Let's Encrypt", "Caddy", "SaaS architecture", "agent engineering"]
featured: false
---

A white-label client portal on a custom domain needs an SSL certificate issued, validated and renewed for every agency that uses it, and most of the work is in the renewals, not the first certificate. Setup is a renewal schedule, not a one-time task. I learned what silent failure costs from a different system: on 2026-07-21 a lockout check in my X bot returned True, the caller skipped one action, and the loop ran for 3.5 more days. The certificate is the easy part. The hard part is the day it quietly stops being valid, and the system gives you no reason to look.

## Is a custom-domain portal worth the extra work?

Yes, for a client-facing product, but only once the certificate step runs without a human. A portal on a branded hostname tells a client who is behind it, and that's the whole reason agencies ask for one. The expensive part isn't the first certificate. It's every certificate after it.

[AgencyHandy](https://agencyhandy.com) is client portal software for agencies. It covers services, clients, projects, tasks, files, invoices, and payments in one place. Its public description doesn't mention custom domains or certificate handling, so I won't claim that's shipped here. What follows is the problem any portal of this shape has to solve, and where I think the trade-offs actually sit.

## Why doesn't a CNAME make the portal secure?

A CNAME sends traffic to the right server. It doesn't produce a certificate. The certificate needs proof that the agency controls the hostname, and that proof has to be made again as the rules change.

The rules are tightening. The CA/Browser Forum's ballot SC-081 steps down the maximum validity of public TLS certificates: 200 days from 15 March 2026, 100 days from 15 March 2027, and 47 days from 15 March 2029. The ballot was approved in April 2025 ([DNSimple's summary of the schedule](https://support.dnsimple.com/articles/announcement-ssl-certificate-validity-changes/)), and its text is on the [CA/Browser Forum site](https://cabforum.org/). The 200-day cap is already in force as of March 2026, and the same ballot shrinks how long a domain-validation result can be reused, down to 10 days by 2029, so ownership proof has to be repeated too.

Treat that as an operations change, not a security footnote. Under the 200-day cap already in force, a certificate is no longer something you issue once and forget; by 2029 it is a monthly job. Renewal becomes the normal path: Let's Encrypt recommends renewing at about two-thirds of a certificate's lifetime ([Let's Encrypt integration guide](https://letsencrypt.org/docs/integration-guide/)), so a 47-day certificate renews roughly every month per hostname.

## How many certificates will your platform actually issue?

Platform subdomains need one wildcard certificate via DNS-01. Each agency custom domain needs its own certificate and its own renewals. So for a multi-tenant portal, issuance volume grows with the number of custom domains, while the per-domain limit mostly does not. Let's Encrypt allows 50 certificates per registered domain every 7 days, and that limit is global across all accounts. Its exact-set limit is 5 certificates per identical set of identifiers every 7 days. Renewals using ACME Renewal Info are exempt from all rate limits, and other renewals with the exact same identifiers are exempt from the per-domain limit ([Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/)).

The design consequence is the part people miss, and it depends on which kind of hostname you issue for. Platform subdomains like agency.yourportal.com can use one wildcard certificate, obtained via DNS-01, so per-tenant issuance does not apply. Agency-owned custom domains are each their own registered domain, so the per-domain limit rarely applies to them. The limit that does apply is per account: Let's Encrypt caps new orders at 300 per account every 3 hours, which a bulk import or a retry loop can hit ([Let's Encrypt rate limits](https://letsencrypt.org/docs/rate-limits/)).

The other objection is that rate limits rarely matter at small scale. Mostly true: renewals are exempt, so the realistic risk is a burst of new hostnames under one registered domain, such as a bulk import or a retry loop that re-requests on every failure.

## Who decides which hostnames get a certificate?

The safe pattern is to make issuance pull-based and gated by your own database. Caddy's on-demand TLS works this way. Caddy calls an internal "ask" endpoint with the hostname, and the endpoint has to return HTTP 200 before issuance proceeds. Caddy's documentation says to reject domains you don't recognize ([Caddy on-demand TLS](https://caddyserver.com/on-demand-tls)).

That gate is the important part. Without it, anyone who points a hostname at your server can make you request certificates for it. With it, you only issue for hostnames an agency has registered and verified. The ask endpoint is also the single place where a problem can become a log line someone actually reads, which matters later.

## Should you just outsource TLS?

This is the strongest counterargument, and the honest answer is that it's often the right call. Cloudflare for SaaS handles custom hostnames and certificates for you. Its documentation separates hostname ownership checks from certificate validation, and it recommends TXT or HTTP validation before traffic reaches the edge. HTTP validation needs only a customer CNAME, but the hostname can start routing to Cloudflare before its certificate is active. If the certificate has to be live before the DNS change, you need TXT validation or Delegated DCV. Wildcards cannot use HTTP validation at all ([Cloudflare hostname validation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/domain-support/hostname-validation/)).

So outsourcing doesn't remove the failure modes. It renames them. You still choose a validation method, you still depend on the customer's DNS cooperating, and the same documentation warns that another CDN in front of the customer's hostname can make validation fail. You trade your renewal job for a dependency whose error messages you can't read from your own logs. For a small agency portal, that trade is usually worth making. Make it knowing what you gave up, not because the problem went away.

## What fails silently, and how do you notice?

A failed renewal fails silently: the portal keeps serving a valid certificate until the expiry date, then every visitor gets a browser warning while your dashboard stays green. You notice only if something checks each hostname's expiry on a schedule and pages a human when a renewal has not succeeded.

The Telegram Skip button did nothing for months, so every skipped item was counted as a timeout, and the approval statistics were wrong for that whole period. The article lane lost 8 of 20 generations to JSON parse errors, and each failure quietly burned a 48-hour slot.

A failed certificate renewal looks exactly like a working portal until the expiry date. The customer sees a browser warning, while your dashboard stays green because nothing in your system ever asked, "When does this expire?" A better log message won't fix that. You need a hard gate: a renewal that doesn't succeed must page a human, and the expiry date of every hostname must be a number your system checks on a schedule, not a fact it remembers from the day it issued the certificate. Alert on the symptom a customer would see, not only on internal causes, as Google's SRE book recommends for symptom-based alerting ([Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)).

This is the same problem agent engineering keeps running into. An autonomous process that can keep going after its own safety check has fired isn't safe. The check has to be able to stop the process, and the process has to be unable to skip it. Anthropic's guidance on [building effective agents](https://www.anthropic.com/engineering/building-effective-agents) likewise recommends stopping conditions and human checkpoints. My fix for the bot was a process exit plus a sentinel file only a human can clear, because launchd KeepAlive respawned a plain exit. For the product decisions behind AgencyHandy more broadly, see [what I would do differently if I started AgencyHandy today](https://www.robatdasorvi.com/chapters/building/what-i-would-do-differently-if-i-started-agencyhandy-today).

On 2026-09-22 the same lockout check never fired at all, because the page matched none of its known selectors; I stopped the bot by hand. An expiry monitor that only looks for the failure modes you predicted has the same blind spot.

## What can block issuance on the agency's side?

Three things commonly block issuance on the agency's side: CAA records on the agency's domain that don't authorize your CA, an existing CDN or proxy in front of the hostname, and DNS changes that haven't propagated. Each makes issuance fail with no error the agency can see.

Check CAA before you accept a hostname. A CAA record that excludes your CA will block issuance, and you can look it up before the agency ever points DNS at you. Use a TXT ownership record that is separate from the routing CNAME, so proving control of the name doesn't depend on traffic already flowing. Show the agency the validation status in plain language that says what is missing and what to change, rather than a generic failure. The CAA rules are defined in [RFC 8659](https://www.rfc-editor.org/rfc/rfc8659), and Let's Encrypt explains how it applies in its [CAA documentation](https://letsencrypt.org/docs/caa/).

## What's still unsolved?

Three design questions are still open, and I don't have settled answers to them.

Where should issuance live: inside the portal application, or in a separate component that only answers the ask question? Keeping it separate limits the blast radius of a bad renewal, but it adds a moving part to every deploy.

How early should you warn? Under today's 200-day cap a 30-day warning is generous. Under the 47-day cap due in 2029, a cert renewed at day 31 has only 16 days left, so a 30-day threshold fires on every healthy certificate and a 10-day one is one missed weekend from an outage.

What should a customer see when their own DNS is wrong? A broken portal is honest and unhelpful. Falling back to a shared hostname is helpful and quietly undermines the reason they asked for a custom domain.

## What should you do before promising a client a custom domain?

Before you promise a client a branded domain, write down the expiry date of every certificate you'll issue, and decide who gets woken up when a renewal fails. For a solo founder that is always you, which I wrote about in [the real cost of building a SaaS with no co-founder](https://www.robatdasorvi.com/chapters/building/the-real-cost-of-building-a-saas-with-no-co-founder). If you can't name that person, you aren't finished, and the portal will keep looking fine right up until the day it doesn't.