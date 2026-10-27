import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';

// Built from the stories collection so every new essay is listed. The old
// hand-curated public/llms.txt stopped at ten articles and never picked up
// anything the content bot published after it was written.

const SITE = 'https://www.robatdasorvi.com';

const SECTIONS: [string, string][] = [
  ['ai-agents', 'AI agent engineering'],
  ['building', 'Build logs'],
  ['ai-automation', 'AI-assisted development and automation'],
];

const HEAD = `# Robat Das Orvi — AI Agent Engineering

> Robat Das Orvi writes about building, securing, and operating AI agents in production: tool use, authorization, reliability, state, evaluation, and cost controls. The site also publishes essays on software products, startups, psychology, philosophy, travel, and football.

## Author

Robat Das Orvi (Orvi) is a software builder and writer who has been coding since 2013. He co-created OneThread and AgencyHandy and builds developer tools including NoBurn, baar-core, ApiDiffGuard, and hatswap. His writing combines engineering experience with research and cited incident reports.

- [Author profile](https://www.robatdasorvi.com/profile): Background, selected work, and social profiles.
- [About Robat](https://www.robatdasorvi.com/about): His engineering focus, products, and approach to writing.
- [Contact](https://www.robatdasorvi.com/contact): Email hello@robatdasorvi.com.
- [LinkedIn](https://www.linkedin.com/in/robatdasorvi-productdev/), [X](https://x.com/orvi_onethread), [GitHub](https://github.com/orvi2014).`;

const TAIL = `## Products and projects

- [NoBurn](https://noburn.dev): Financial guardrails for LLM API calls.
- [baar-core](https://baar.robatdasorvi.com): Pre-flight budget enforcement for LLM agents.
- [ApiDiffGuard](https://apidiffguard.com): Detects breaking API response changes.
- [hatswap](https://www.robatdasorvi.com/hatswap): Open-source CLI for managing multiple Claude Code accounts.
- [OneThread](https://www.onethreadapp.com): Project management software for teams.
- [AgencyHandy](https://agencyhandy.com): Client workflow software for agencies.
- [All projects](https://www.robatdasorvi.com/store).

## Explore

- [AI agents](https://www.robatdasorvi.com/chapters/ai-agents): Agent engineering, security, and reliability articles.
- [AI and automation](https://www.robatdasorvi.com/chapters/ai-automation): AI-assisted development, evaluation, and automation.
- [All chapters](https://www.robatdasorvi.com/chapters): Technical writing and essays across the site.
- [Glossary](https://www.robatdasorvi.com/glossary): Definitions of terms used across the site.
- [Sitemap](https://www.robatdasorvi.com/sitemap-index.xml): Complete list of site pages.

## Attribution

Articles are original work by Robat Das Orvi. Citation with attribution is welcome; articles link to underlying sources where applicable.`;

export const GET: APIRoute = async () => {
  const stories = (await getCollection('stories'))
    .sort((a: CollectionEntry<'stories'>, b: CollectionEntry<'stories'>) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  const line = (s: CollectionEntry<'stories'>) =>
    `- [${s.data.title}](${SITE}/chapters/${s.data.category}/${s.slug}): ${s.data.description}`;

  const sections = SECTIONS.map(([slug, heading]) => {
    const list = stories.filter((s: CollectionEntry<'stories'>) => s.data.category === slug);
    return list.length ? `## ${heading}\n\n${list.map(line).join('\n')}` : '';
  }).filter(Boolean);

  const others = stories.filter((s: CollectionEntry<'stories'>) => !SECTIONS.some(([slug]) => slug === s.data.category));
  const optional = others.length ? `## Optional\n\nEssays outside the site's engineering focus.\n\n${others.map(line).join('\n')}` : '';

  const body = [HEAD, ...sections, TAIL, optional].filter(Boolean).join('\n\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
