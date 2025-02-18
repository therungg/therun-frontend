import { XMLParser } from "fast-xml-parser";

export interface FeedEntry {
    title: string;
    description: string;
    link: string;
    pubDate: string;
    imageUrl?: string;
    author: string;
    source: "substack" | "therun";
}

export async function GET() {
    try {
        const response = await fetch(
            process.env.NEXT_PUBLIC_GOLD_SPLIT_FEED_URL as string,
        );
        const xml = await response.text();
        const entries = parseAtomFeed(xml);

        return new Response(JSON.stringify(entries));
    } catch (error) {
        return Response.json(
            {
                error: `Failure occurred while parsing or fetching Gold Split feed: ${error}`,
            },
            { status: 500 },
        );
    }
}

function parseAtomFeed(xml: string): FeedEntry[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
    });

    try {
        const parsedXml = parser.parse(xml);

        const channel = parsedXml.rss.channel;

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const entries: FeedEntry[] = channel.item.map((item: any) => ({
            title: item.title,
            description: item.description,
            link: item.link,
            pubDate: item.pubDate, // RFC 2822
            imageUrl: item.enclosure?.["@_url"],
            author: item["dc:creator"] || item.author,
            source: "substack",
        }));

        return entries;
    } catch (error) {
        throw new Error(
            `Encountered an issue parsing Gold Split feed: ${error}`,
        );
    }
}
