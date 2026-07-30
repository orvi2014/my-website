import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export const prerender = true;

const SITE = 'https://www.robatdasorvi.com';

/**
 * Full-content RSS feed for the stories collection.
 *
 * This is the ingestion path for syndication: daily.dev pulls submitted sources
 * by RSS, and so do Feedly, Substack imports and Medium imports. Without it,
 * every article has to be shared manually one at a time.
 *
 * URL shape matches sitemap-index.xml.ts: /chapters/{category}/{slug}
 */
export async function GET(context: { site?: URL }) {
  const stories = await getCollection('stories');

  // Newest first. pubDate is a Date per the collection schema, but tolerate a
  // string in case a hand-written file slips through the generator.
  const sorted = stories.sort(
    (a: CollectionEntry<'stories'>, b: CollectionEntry<'stories'>) =>
      new Date(b.data.pubDate).valueOf() - new Date(a.data.pubDate).valueOf()
  );

  return rss({
    title: 'Robat Das Orvi',
    description:
      'Essays on building software without VC money — SaaS mechanics, AI systems, and the psychology underneath both.',
    site: context.site?.toString() ?? SITE,
    trailingSlash: false,
    items: sorted.map((story: CollectionEntry<'stories'>) => ({
      title: story.data.title,
      description: story.data.description,
      pubDate: new Date(story.data.pubDate),
      link: `/chapters/${story.data.category}/${story.slug}`,
      author: story.data.author,
      categories: story.data.tags ?? [story.data.category],
    })),
    customData: [
      '<language>en-us</language>',
      // Absolute self-reference. Aggregators use it to canonicalise a feed they
      // may have discovered under a different URL.
      `<atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ].join(''),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
  });
}
