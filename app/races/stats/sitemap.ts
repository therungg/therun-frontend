import { MetadataRoute } from "next";
import { getRaceGameStats, getRaceGameStatsByGame } from "~src/lib/races";
import { safeEncodeURI } from "~src/utils/uri";
import { RaceGameStatsByGame } from "../races.types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const stats = await getRaceGameStats(0);

    const gameStatPromises = stats.map((stat) =>
        getRaceGameStatsByGame(safeEncodeURI(stat.displayValue)),
    );

    const gameStats: RaceGameStatsByGame[] =
        await Promise.all(gameStatPromises);

    const gameStatsUrls: MetadataRoute.Sitemap = stats.map((stat) => {
        return {
            url:
                "https://therun.gg/races/stats/" +
                safeEncodeURI(stat.displayValue),
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.7,
        };
    });

    const categoryStatsUrls: MetadataRoute.Sitemap = [];

    gameStats.forEach((gameStat) => {
        const categories = gameStat.categories;

        categories.forEach((categoryStat) => {
            const [game, category] = categoryStat.displayValue.split("#");

            categoryStatsUrls.push({
                url:
                    "https://therun.gg/races/stats/" +
                    safeEncodeURI(game) +
                    "/" +
                    safeEncodeURI(category),
                lastModified: new Date(),
                changeFrequency: "daily",
                priority: 0.6,
            });
        });
    });

    return [...gameStatsUrls, ...categoryStatsUrls];
}
