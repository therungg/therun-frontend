import { MetadataRoute } from "next";

export default async function sitemap() {
    const normalRoutes: MetadataRoute.Sitemap = [
        {
            url: "https://therun.gg",
            lastModified: new Date(),
            changeFrequency: "always",
            priority: 1,
        },
        {
            url: "https://therun.gg/live",
            lastModified: new Date(),
            changeFrequency: "always",
            priority: 0.9,
        },
        {
            url: "https://therun.gg/livesplit",
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.5,
        },
        {
            url: "https://therun.gg/events",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: "https://therun.gg/games",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: "https://therun.gg/games",
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.6,
        },
        {
            url: "https://therun.gg/patreon",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.7,
        },
        {
            url: "https://therun.gg/patron",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.7,
        },
        {
            url: "https://therun.gg/races",
            lastModified: new Date(),
            changeFrequency: "hourly",
            priority: 0.9,
        },
        {
            url: "https://therun.gg/races/stats",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: "https://therun.gg/races/finished",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: "https://therun.gg/recap",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: "https://therun.gg/tournaments",
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.6,
        },
    ];

    return normalRoutes;
}
