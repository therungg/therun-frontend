import { getNewsArticles } from "~src/lib/get-news";

export async function GET() {
    try {
        const articles = await getNewsArticles();
        return Response.json(articles);
    } catch (error) {
        console.error("Error fetching news:", error);
        return Response.json(
            { error: "Failed to fetch news", entries: [] },
            { status: 500 },
        );
    }
}
