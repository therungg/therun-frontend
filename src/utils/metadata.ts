import { Metadata } from "next";
import { OpenGraphType } from "next/dist/lib/metadata/types/opengraph-types";
declare type OpenGraphImage = {
    url: string | URL;
    secureUrl?: string | URL;
    alt?: string;
    type?: string;
    width?: string | number;
    height?: string | number;
};

export interface MetadataProps {
    title: string;
    description: string;
    keywords?: string[];
    type?: OpenGraphType;
    images?: OpenGraphImage[];
    index?: boolean;
    follow?: boolean;
}

/**
 * Builds a Metadata object for child pages. This method is not suitable for the parent layout.tsx file.
 * @param props
 * @returns
 */
export default function buildMetadata(props: MetadataProps): Metadata {
    const defaultImageUrl = "/therun-no-url-with-black-background.png";

    // Resolving Twitter images
    let twitterImages: string[] = [];

    props.images?.map((image: OpenGraphImage) => {
        if (image.url) twitterImages.push(image.url.toString());
    });

    if (twitterImages.length === 0) twitterImages = [defaultImageUrl];

    return {
        title: props.title,
        description: props.description,
        keywords: props.keywords || ["TheRun", "Speedrun", "Statistics"],
        openGraph: {
            title: `The Run - ${props.title}`,
            description: props.description,
            type: props.type || "website",
            images: props.images || {
                url: defaultImageUrl,
                secureUrl: defaultImageUrl,
                type: "image/png",
                width: 800,
                height: 600,
            },
        },
        twitter: {
            title: `The Run - ${props.title}`,
            description: props.description,
            siteId: "1482414005138477061",
            creator: "@therungg",
            creatorId: "1482414005138477061",
            card: "summary_large_image",
            images: twitterImages,
        },
        robots: {
            index: props.index || true,
            follow: props.index || true,
            googleBot: {
                index: props.index || true,
                follow: props.index || true,
            },
        },
    };
}
