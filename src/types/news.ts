export type NewsArticle = {
    id: string;
    title: string;
    description: string;
    content: string;
    publishedAt: string;
    slug: string;
    author: string;
    categories: string[];
    image?: {
        url: string;
        alt: string;
    };
};
