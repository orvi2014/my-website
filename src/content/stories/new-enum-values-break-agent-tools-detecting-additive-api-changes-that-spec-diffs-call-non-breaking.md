---
title: "Adding an API Enum Value Is a Breaking Change for Agent Tools"
description: "Adding an enum value is a breaking change for any API client or agent tool with a closed switch. Why spec diffs call it safe, and how to catch it."
pubDate: 2026-10-21
category: "ai-automation"
author: "Orvi"
readingTime: 9
tags: ["enums", "API versioning", "schema drift", "backward compatibility", "tolerant reader", "agent tools", "contract testing", "OpenAPI"]
featured: false
---

Adding a value to an API enum breaks any client that handles that enum with a closed switch. Calling the change "additive" in your changelog doesn't change what that client does when the new value arrives. If a spec diff told you the change was non-breaking, the diff was right about the schema and wrong about your consumers.

You're probably reading this because a diff tool marked a change as safe and something downstream fell over anyway. A client threw on the new status value. An agent's tool call started returning an error it had never returned before. You trusted the schema, and the schema wasn't what broke. The general case is in [When an Upstream API Changes, Your Agent's Tools Break Silently](https://www.robatdasorvi.com/chapters/ai-automation/when-an-upstream-api-changes-your-agent-s-tools-break-silently); this piece covers the one change most diff tools wave through: a new enum value.

## Is adding an enum value actually a breaking change?

Yes, for any consumer that throws on, drops, or mislabels a value it doesn't recognize. The change is additive for the producer and breaking for the reader, and the reader is the one who decides.

The tools don't agree, which is the first sign the question is underspecified. The swagger-spec-compatibility library treats an added enum value in a response as an error, since clients built on the old spec can't validate the response ([source](https://swagger-spec-compatibility.readthedocs.io/en/latest/_modules/swagger_spec_compatibility/rules/added_enum_value_in_response.html)). Smithy's changed-enum evaluator emits only a NOTE for a value appended at the end, and an ERROR for a value that is removed, renamed, or inserted mid-list ([source](https://smithy.io/javadoc/1.6.1/software/amazon/smithy/diff/evaluators/ChangedEnumTrait.html)). A json-schema-diff proposal in pull request #46 classifies adding a value as non-breaking and removing one as breaking ([source](https://github.com/getsentry/json-schema-diff/pull/46)). Three tools, three rules, one schema change.

## Why does my spec diff call it safe?

The diff tool sees two schemas. The break happens in code it can't read. It can tell you what the producer changed. It can't tell you what a consumer does with a value that wasn't in the consumer's copy of the enum.

Google's API Improvement Proposal 180 says enum values can be freely added to enums used only in request messages. For enums used in responses, it says the enum should document that it may grow. AIP-180 also warns that user code may not handle new values gracefully ([source](https://google.aip.dev/180)). Microsoft's guidance makes the same trade: add values despite "a small compatibility risk," because existing code might not handle them ([source](https://msdn.microsoft.com/library/ms229010(v=vs.90))). Both rules hand the decision to the consumer, and a spec diff never looks at the consumer.

## Has this been solved before?

Partly. HTTP and Protobuf both solved it by declaring the set open and telling readers what to do with unknown values. Most JSON APIs and generated clients never adopted the same rule. Postel's law, from [RFC 761](https://www.rfc-editor.org/rfc/rfc761) in 1980, says to be conservative in what you send and liberal in what you accept. Martin Fowler's "Tolerant Reader" post, published 9 May 2011, made the consumer half concrete: "be as tolerant as possible when reading data from a service" ([source](https://www.martinfowler.com/bliki/TolerantReader.html)). He also named the failure most teams still hit: generated classes from an XSD break when the provider adds a field. In his words, "Adding field to an interface like this shouldn't be a breaking change for anyone - but often does break these schemes."

HTTP already solved the enum version of this problem, and it's the closest precedent you have. RFC 7231, published in 2014, requires clients to treat an unrecognized status code as the x00 code of its class, so a new 471 gets handled as a 400-class error ([source](https://www.rfc-editor.org/rfc/rfc7231#section-6)). The same rule appeared in RFC 2068 in 1997. HTTP status codes are an open set, and the spec told clients to read the class instead of the exact code. Most enum-typed client code was never written that way.

Protobuf ran the experiment in public. Its enum documentation says closed enums send an unrecognized number to the unknown field set, so the accessor reports the field as unset and returns the default value. Proto3 made enums open "specifically because of the unexpected behavior that closed enums cause" ([source](https://protobuf.dev/programming-guides/enum)).

## What happens when a client sees a value it doesn't know?

It does one of three things. It crashes, it silently substitutes a default, or it preserves the value and leaves the decision to the code. Only the last is safe, and most generated clients default to one of the first two.

Onfido's February 2020 incident, titled "SDK Crashes," shows the crash case. A change to a public Onfido endpoint caused it to return values in a format the Android SDK couldn't handle, and about 90% of applicants using the Android SDK couldn't finish the media upload flow. The change was reverted at 17:58 UTC, about an hour after it went out at 16:55. A small percentage of affected users kept getting errors until a cache fix on 20 February, because a cache on their devices held an invalid value. The iOS and web SDKs had no issues ([source](https://status.onfido.com/incidents/m5py2jsgzw25)).

Dfinity's post-mortem for 27 March 2024 shows the persistence case. Removing and replacing error codes in a new replica version stopped two Internet Computer subnets from restarting after an upgrade, because the changed enum values were stored in checkpoints ([source](https://forum.dfinity.org/t/post-mortem-subnets-cv73p-and-4ecnw-failed-upgrade-process-on-march-27-2024/29841)). That was a removal, not an addition, but it shows how long an old enum value outlives the deploy that changed it. A checkpoint keeps the old reader and the new writer alive side by side.

## Isn't the consumer just wrong? Can't we patch it?

You can, but not on your schedule. The producer's change has to be safe for the consumer as it exists today.

The openapi-code-generator project made this argument in pull request #291: native mobile apps update on users' schedule, and strict enum validation that throws on unrecognized values makes it hard to add values safely ([source](https://github.com/mnahkies/openapi-code-generator/pull/291)). A small percentage of Onfido's Android users kept getting errors after the revert until a cache fix on 20 February. Calling the consumer wrong doesn't fix a device that's already crashing. It just assigns blame after the outage.

The GraphQL documentation makes the same point in its guidance on robust applications. It says GraphQL schemas can add new enum values at any time, and that if an application treats every enum value as exhaustively known, a new value from the server can cause crashes or silent data loss. Its recap says to always include a default branch for unknown enum values ([source](https://graphql.org/learn/robust-applications/)).

## Is this worth a separate check, or is it a code review issue?

It needs its own check, because the failure is silent when it happens. A code review reads your diff. It doesn't run the consumer's switch statement against the value you're about to ship.

I built an approval-gated X growth agent, and the same silent pattern showed up there several times. The closest one to an enum: when X suspended the account a second time on 2026-09-22, the lockout check matched none of its known selectors and never fired, so I stopped the bot by hand. A check built on a closed list of known states met a state outside the list and did nothing. For about six weeks, four hardcoded target accounts that no longer existed absorbed 88% of the bot's daily comment attempts. Every run logged success, and nothing raised an error. The Telegram Skip button did nothing for months, so every skipped item got counted as a timeout, and the approval statistics were wrong the whole time. The article lane lost 8 of 20 generations to JSON parse errors, and each failure quietly burned a 48-hour slot. None of these were enum changes, but they failed the same way: the code met a state it didn't expect, kept going, and raised no alarm.

The same pattern shows up between agents in [Agent Rule Conflicts: Why AI Pipelines Fail Silently](https://www.robatdasorvi.com/chapters/ai-automation/agent-rule-wars).

## How does a new enum value break an agent's tool call?

A new value in an API response that the tool wrapper validates against a closed enum returns a tool error, and the model may retry, route around it, or invent a result. A frozen enum in the tool's input schema blocks the new value until the tool definition is regenerated, so the agent can't use the new capability.

For agents, this is the same problem with a worse failure mode. The agent doesn't crash, which makes the failure harder to see. The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) defines a tool's `inputSchema` and, optionally, `outputSchema`. The tool wrapper should map unknown response enum values to an explicit 'unknown' result string the model can read, instead of throwing a validation error. The review side of the same silent failure is in [Silent AI Code Bugs: Passing Reviews, Failing in Production](https://www.robatdasorvi.com/chapters/ai-automation/what-happens-when-the-ai-gets-it-wrong-and-you-do-not-notice).

## What would I do before the next enum value ships?

Ask one question per consumer: what does your code do when it reads a value outside the enum it was built against? Answer that in code, not in a spec.

Start with three steps. Mark every response enum as open in your contract, so the contract tells consumers to expect growth. Inject an unknown value into each consumer's contract test, and fail the build if the consumer throws. Fowler's post points to consumer-driven contracts, where consumers send their tests to the provider ([source](https://www.martinfowler.com/bliki/TolerantReader.html)). Then check every cache and persisted store that holds the enum, because that's where the old reader and the new writer meet.

Where APIDiffGuard fits: it's a diff engine and a monitor. The README describes it as a way to "catch breaking API changes before your clients do," by monitoring API responses, detecting schema drift, comparing versions, and alerting developers ([apidiffguard.com](https://apidiffguard.com)). The diff engine is MIT-licensed as `@apidiffguard/diff`. A schema comparison can't tell you whether a given consumer has a closed switch. A monitor only sees a new value once a response carries it, which is after the deploy. So it's an alert, not prevention. Classifying enum additions per consumer is the part I haven't solved.

If you have one minute, do this. Find the client code that switches on your enum and look at its default branch. If the default throws, or doesn't exist, ship the default first, in the client, and only then ship the new value. The client's release cycle is the slowest link in your deploy, and you can't change it from the server.