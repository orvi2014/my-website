---
title: "The Hardest Part of Building a Second Product When the First One Still Needs You"
description: "Every second SaaS product founder counts the risk of the new build. Almost nobody counts what staying on call for the first one costs."
pubDate: 2026-09-15
category: "building"
author: "Orvi"
readingTime: 8
tags: ["second SaaS product", "SaaS founder", "bootstrapping", "context switching", "attention residue", "maintenance mode", "solo founder", "focus"]
featured: false
---

It's 10:40 on a Tuesday night and you have two tabs open. On the left is the new product's repo: three commits, the latest one eleven days old, message "wip auth". On the right is Gmail. A customer of your first product has written, all lowercase, that the CSV export is dropping rows again. Your tea went cold a while ago with the bag still in it. The fix should take twenty minutes. It takes seventy, because first you have to work out how past-you wrote the export. By then it's midnight and the left tab hasn't moved.

If you're a second SaaS product founder, most of your days look like this. You've probably spent weeks on the risks of the new product. Will anyone pay for it? Will it eat your time? You've spent almost no time pricing the option that feels safe: keep the first product exactly as responsive as it is today, and build the second one in whatever time is left over.

That's the most expensive option you have. You pay for it in hours you never log.

## Should I build a second SaaS product while my first one still needs me?

Yes, but probably not the way you're doing it now. The risk isn't the second product. It's running both with no limit on interruptions, which lets the first one claim you at any hour it likes.

Most founders frame this as a choice between two risks: neglect a product that works, or never start the next one. That framing hides the path almost everyone ends up on by default. You keep answering everything on product one, fit product two into the gaps, and promise yourself you'll really focus once things calm down.

Things don't calm down. A product with paying customers generates work in proportion to how many customers it has, and your plans for the next product don't change that. The default path feels conservative because nothing visibly breaks, and that's why it's dangerous. You don't see the costs until the second product is eighteen months late and the first hasn't shipped a meaningful feature in a year.

I run three products, AgencyHandy, NoBurn and APIDiffGuard, so I've paid for the default path myself.

## How much productivity do you lose working on two products at once?

Roughly 20% of your total time, and that's before a single customer interrupts you. Interruptions push it higher, and most of the loss lands on whichever product needs deep work.

Gerald Weinberg's project-switching estimates, published in *Quality Software Management* in 1992, put the overhead of a second concurrent project at 20% of total working time, rising to 40% at four projects. Jeff Atwood's [summary of Weinberg's calculation](https://blog.codinghorror.com/the-multi-tasking-myth/) spells out the uncomfortable part: adding one project costs you a fifth of your time. On a 50-hour week, that's 10 hours that belong to neither product.

Weinberg's figure came from practice, not a lab, but the lab evidence agrees with him. In 2009, Sophie Leroy published two experiments in *Organizational Behavior and Human Decision Processes* showing that people who switch away from an unfinished task do worse on the next one, because part of their attention stays behind. She called it [attention residue](https://ideas.repec.org/a/eee/jobhdp/v109y2009i2p168-181.html). A support ticket you've read but haven't resolved is a textbook unfinished task. So is a half-written auth flow.

Then there's the interruption itself. Gloria Mark of UC Irvine studied information workers in the field. In a [2006 interview with Gallup](https://news.gallup.com/businessjournal/23146/too-many-interruptions-work.aspx), she said interrupted work was resumed on average 23 minutes and 15 seconds later, with about two other tasks done in between. The same people switched "working spheres" every 10 minutes and 29 seconds.

Run those numbers on your Tuesday. Say product one interrupts you six times in a day, and each interruption costs 23 minutes to come back from. That's 2 hours and 18 minutes gone before you've fixed anything. Take Weinberg's 20% off the rest of a 10-hour day and you're left with about six hours of real work to split between two products. The one without customers loses every time, since nobody is emailing you about it. On a bad day it gets nothing.

So you don't get a 50/50 split. You get something closer to 40/40, and the switching eats the other 20.

## Isn't a second product a way to reduce risk?

Only if the two products fail independently, and they don't. Both run on one scarce input, your attention, so trouble in either one drains the other.

This is the best argument for the default path, so it deserves a straight answer. A portfolio spreads risk: if product one stalls, product two carries you. That works for index funds because the holdings are uncorrelated. A solo founder's products are perfectly correlated on the one input that matters. When product one has an outage, product two gets nothing that week. That isn't diversification. You've just put more surface area on the same single point of failure.

The best-documented example is a company with a lot more people than you have. In February 2014, 37signals ran Basecamp, Highrise, Campfire, Backpack and several smaller tools. On Basecamp's tenth birthday it [announced](https://signalvnoise.com/posts/3714-big-news) it would rename itself Basecamp and focus on that one product. Here's Jason Fried's explanation, [reported by Tech.co](https://tech.co/news/jason-fried-37signals-basecamp-2014-02): "We've become a bit scattered, a bit diluted. Nobody does their best work when they're spread too thin." Highrise was spun out that year. According to the [company's history](https://en.wikipedia.org/wiki/37signals), it came back in-house in 2018 and closed to new signups the same year. The company launched a second flagship, HEY, in June 2020 and took back the 37signals name in May 2022.

If a company with a whole team felt diluted, a solo founder with two products has no reason to expect better.

None of this means you should never build two products. 37signals built a second one, but only after deciding, explicitly, what the first would and wouldn't get.

## What does it cost to keep my first product in reactive mode?

Your first product stops growing and your second one stalls. Reactive mode feels like maintenance, but it works like a slow decline.

Subscription revenue doesn't sit still. Customers leave every month for reasons that have nothing to do with your code: they close their businesses, switch tools, lose budget. Replacing them takes acquisition work, and that's the first thing to go when your spare hours are split between tickets and the second build. At 3% monthly churn with no new customers, a product keeps 69% of its customers after 12 months (0.97 to the twelfth power is 0.69). The product you think you're protecting loses almost a third of its customers in a year. Just staying flat takes real work.

The second cost hits your judgement. Attention residue runs both ways, so the unfinished new product leaks into the hours you give the old one. You answer tickets less carefully and ship fixes with less testing. Customers notice and send more tickets, and those take still more hours away from the new product. Working later mostly makes the loop spin faster.

The third cost lasts longest. The second product's market window doesn't care about your inbox. Every month the repo sits at "wip auth" gives someone else another month to ship first.

If nobody ever decided to put the first product into maintenance mode, it isn't being maintained. It's being abandoned slowly, one interruption at a time.

## How do I put my first SaaS product into maintenance mode without losing customers?

Write down what the first product gets, in hours and response times, and make its interruptions wait for fixed windows. A response time you've published is easy to keep. The one customers infer from your late-night replies is much harder.

Start with a written service level. Something like: outages and security issues within two hours, bugs within two business days, feature requests reviewed monthly. Put it on the support page. Once it's published, an open-ended obligation becomes a finite one, and customers stop setting their expectations by the time you replied at 12:15 a.m.

Then batch. Mark's workers weren't only interrupted by other people. About 44% of the time they interrupted themselves, and checking product one's inbox just in case counts. Two support windows a day at fixed times handle both kinds, so six 23-minute recoveries become two.

Next, decide what the first product stops getting. When 37signals set its non-core products aside, it described maintenance mode as [security updates and bug fixes, with no new feature development](https://thenextweb.com/news/37signals-rebrands-as-basecamp-puts-all-its-resources-into-the-project-management-tool). That one sentence is the whole policy. If you never write yours, the first product keeps getting everything, including your guilt about its roadmap.

Finally, use what Leroy found. In her experiments, finishing the first task under time pressure is what let attention move cleanly to the next one. Give every product-one window a hard stop. When it ends, write down what's still open so the unfinished work lives on paper and not in your head.

## What should I do if the first product really can't run without me?

Treat that as a bug in the first product, not a fact about your life. If it can't get by on two support windows a day, some specific part of it is broken, and you fix that before you build the second product's first feature.

Pull the last 60 days of support email and sort it by cause. You're looking for the few problems behind most of the volume, like a flaky import or a billing screen nobody understands. Fix those and it won't need you as often.

If we had one minute before you went back to that Tuesday night, here's what I'd tell you.

You aren't choosing between your first product and your second. You're choosing between deciding what the first one gets and letting it decide for you at 10:40 every night. Write the response times down tonight and put them on the support page tomorrow. Answer email at 10 and at 4. Give the new repo the first three hours of every day, before you open either inbox. When the old product breaks that rule, fix whatever made it break the rule, then close the tab. The export bug will still be there at 10 a.m. The second product won't wait for you like that.