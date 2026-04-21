import { MetadataRoute } from 'next';

export default async function sitemap() {
    const normalRoutes: MetadataRoute.Sitemap = [
        {
            url: 'https://therun.gg',
            changeFrequency: 'always',
            priority: 1,
        },
        {
            url: 'https://therun.gg/live',
            changeFrequency: 'always',
            priority: 0.9,
        },
        {
            url: 'https://therun.gg/livesplit',
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://therun.gg/events',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/games',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/patreon',
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: 'https://therun.gg/patron',
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: 'https://therun.gg/races',
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: 'https://therun.gg/races/stats',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/races/finished',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/recap',
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: 'https://therun.gg/tournaments',
            changeFrequency: 'daily',
            priority: 0.6,
        },
    ];

    return normalRoutes;
}
