import { Metadata } from 'next';
import { OpenGraphType } from 'next/dist/lib/metadata/types/opengraph-types';
import { getGameGlobal } from '~src/components/game/get-game';
import { getGlobalUser } from '~src/lib/get-global-user';
import { safeDecodeURI } from './uri';

declare type OpenGraphImage = {
    url: string | URL;
    secureUrl?: string | URL;
    alt?: string;
    type?: string;
    width?: string | number;
    height?: string | number;
};

export interface MetadataProps {
    title?: string;
    absoluteTitle?: string;
    description: string;
    keywords?: string[];
    type?: OpenGraphType;
    images?: OpenGraphImage[];
    index?: boolean;
    follow?: boolean;
}

/**
 * Builds a Metadata object for pages.
 * @param props
 * @returns
 */
export default function buildMetadata(props?: MetadataProps): Metadata {
    const defaultImageUrl =
        'https://therun.gg/therun-no-url-with-black-background.png';
    const title =
        safeDecodeURI(props?.absoluteTitle || '') ||
        `The Run | ${
            safeDecodeURI(props?.title || '') || 'Speedrun Statistics'
        }`;
    const description =
        props?.description ||
        'The Run - a free tool for speedrun statistics. Explore leaderboards, check out live runs, and easily manage your own speedrun data!';

    // Resolving Twitter images
    let twitterImages: string[] = [];

    props?.images?.map((image: OpenGraphImage) => {
        if (image.url) twitterImages.push(image.url.toString());
    });

    if (twitterImages.length === 0) twitterImages = [defaultImageUrl];

    return {
        metadataBase: new URL('https://therun.gg'),
        title,
        description,
        keywords: props?.keywords || ['therun', 'Speedrun', 'Statistics'],
        manifest: '/site.webmanifest',
        referrer: 'strict-origin-when-cross-origin',
        icons: {
            icon: [
                {
                    url: '/favicon-32x32.png',
                    sizes: '32x32',
                    type: 'image/png',
                },
                {
                    url: '/media/favicon/dark-theme/favicon-32x32.png',
                    sizes: '32x32',
                    type: 'image/png',
                    media: '(prefers-color-scheme: dark)',
                },
                {
                    url: '/favicon-16x16.png',
                    sizes: '16x16',
                    type: 'image/png',
                },
                {
                    url: '/media/favicon/dark-theme/favicon-16x16.png',
                    sizes: '16x16',
                    type: 'image/png',
                    media: '(prefers-color-scheme: dark)',
                },
            ],
        },
        other: {
            'msapplication-TileColor': '#007c00',
        },
        openGraph: {
            title,
            description,
            url: '/',
            siteName: 'The Run',
            locale: 'en_US',
            type: props?.type || 'website',
            images: props?.images || {
                url: defaultImageUrl,
                secureUrl: defaultImageUrl,
                alt: 'The Run logo',
                type: 'image/png',
                width: 800,
                height: 600,
            },
        },
        twitter: {
            title,
            description,
            siteId: '1482414005138477061',
            creator: '@therungg',
            creatorId: '1482414005138477061',
            card: 'summary_large_image',
            images: twitterImages,
        },
        robots: {
            index: props?.index || true,
            follow: props?.index || true,
            googleBot: {
                index: props?.index || true,
                follow: props?.index || true,
            },
        },
    };
}

export async function getUserProfilePhoto(
    username: string,
): Promise<OpenGraphImage[] | undefined> {
    // Call the lib directly — fetching our own /api proxy here doubled every
    // user-page view into a second Vercel invocation.
    let data: { picture?: string } | undefined;
    try {
        data = await getGlobalUser(username);
    } catch (e) {
        console.log(e);
        return undefined;
    }

    if (!data?.picture) return undefined;

    return [
        {
            url: data.picture,
            secureUrl: data.picture,
            alt: `Profile photo of ${username}`,
            type: 'image/png',
        },
    ];
}

export async function getGameImage(
    game: string,
): Promise<OpenGraphImage[] | undefined> {
    // getGameGlobal does its own URI encoding.
    let data: { image?: string } | undefined;
    try {
        data = await getGameGlobal(game);
    } catch (e) {
        console.error(e);
        return undefined;
    }

    if (!data?.image) return undefined;

    return [
        {
            url: data.image,
            secureUrl: data.image,
            alt: `${game} cover`,
            type: 'image/png',
        },
    ];
}
