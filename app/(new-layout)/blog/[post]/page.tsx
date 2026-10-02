import type { Metadata } from 'next';
import { JsonLd } from '~src/components/json-ld';
import buildMetadata from '~src/utils/metadata';
import { Post } from './post';

const posts = [
    'welcome-to-the-run',
    'twitch-extension',
    'the-run-live',
    'the-run-racing',
    'leaderboards-speedruncom',
];

interface PostSeo {
    title: string;
    description: string;
    keywords: string[];
    published: string;
}

// The posts themselves live in a client component, so the page metadata for
// search engines and link previews is kept here.
const seo: Record<string, PostSeo> = {
    'leaderboards-speedruncom': {
        title: 'Leaderboards and speedrun.com’s new terms of service',
        description:
            'speedrun.com replaced its terms of use on 1 October 2026 and dropped the Creative Commons licence. What changed, why it matters for runners and community tools, and what you can do.',
        keywords: [
            'speedrun.com',
            'speedrun.com terms of service',
            'speedrun.com terms of use',
            'speedrun.com Creative Commons',
            'speedrun.com API',
            'Elo Entertainment',
            'speedrun leaderboards',
            'speedrunning',
        ],
        published: '2026-10-02T14:00:00Z',
    },
};

export async function generateMetadata(props: {
    params: Promise<{ post: string }>;
}): Promise<Metadata> {
    const { post } = await props.params;
    const meta = seo[post];
    if (!meta) return {};

    const url = `/blog/${post}`;
    const base = buildMetadata({
        absoluteTitle: meta.title,
        description: meta.description,
        keywords: meta.keywords,
        type: 'article',
        canonical: url,
    });
    return {
        ...base,
        authors: [{ name: 'Joey', url: 'https://therun.gg' }],
        openGraph: {
            ...base.openGraph,
            url,
            type: 'article',
            publishedTime: meta.published,
            authors: ['Joey'],
        },
    };
}

export default async function PostPage(props: {
    params: Promise<{ post: string }>;
}) {
    const params = await props.params;
    const { post } = params;
    const postIndex = posts.findIndex((blog) => blog === post);
    const meta = seo[post];
    return (
        <>
            {meta && (
                <JsonLd
                    data={{
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        headline: meta.title,
                        description: meta.description,
                        datePublished: meta.published,
                        dateModified: meta.published,
                        url: `https://therun.gg/blog/${post}`,
                        mainEntityOfPage: `https://therun.gg/blog/${post}`,
                        keywords: meta.keywords.join(', '),
                        inLanguage: 'en',
                        author: {
                            '@type': 'Person',
                            name: 'Joey',
                            url: 'https://therun.gg',
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'The Run',
                            url: 'https://therun.gg',
                            logo: 'https://therun.gg/therun-no-url-with-black-background.png',
                        },
                    }}
                />
            )}
            <Post index={postIndex} />
        </>
    );
}
