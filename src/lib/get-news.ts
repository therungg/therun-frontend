import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const newsDir = path.join(process.cwd(), "content", "news");

const articleSchema = z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.string(),
    author: z.string(),
    categories: z.array(z.string()),
    image: z
        .object({
            url: z.string(),
            alt: z.string(),
        })
        .optional(),
});

export async function getNewsArticles() {
    // Read files from the news directory
    const files = fs.readdirSync(newsDir);

    return files
        .filter((file) => file.endsWith(".mdx"))
        .map((file) => {
            const slug = file.replace(/\.mdx$/, "");
            const filePath = path.join(newsDir, file);
            const fileContent = fs.readFileSync(filePath, "utf8");
            const { data, content } = matter(fileContent);

            // Validate frontmatter
            const validatedData = articleSchema.parse(data);

            return {
                ...validatedData,
                id: `site-news-${slug}`,
                slug,
                content,
            };
        })
        .sort(
            (a, b) =>
                new Date(b.publishedAt).getTime() -
                new Date(a.publishedAt).getTime(),
        );
}
