import { MetadataRoute } from "next";
import { Race, RaceGameStatsByGame } from "~app/(old-layout)/races/races.types";
import { getAllTournamentSlugs } from "~app/(old-layout)/tournaments/tournament-list";
import { getAllEvents } from "~src/lib/events";
import {
    getPaginatedFinishedRaces,
    getRaceGameStats,
    getRaceGameStatsByGame,
} from "~src/lib/races";
import { getPaginatedUsers } from "~src/lib/users";
import { safeEncodeURI } from "~src/utils/uri";

export const maxDuration = 120;

export async function generateSitemaps() {
    return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
}
export default async function sitemap({
    id,
}: {
    id: number;
}): Promise<MetadataRoute.Sitemap> {
    switch (parseInt(id.toString())) {
        case 0:
            return sitemapForRaces();
        case 1:
            return sitemapForUsers();
        case 2:
            return sitemapForRaceStats();
        case 3:
            return sitemapForTournaments();
        case 4:
            return sitemapForEvents();
    }

    return [];
}

const sitemapForRaces = async (): Promise<MetadataRoute.Sitemap> => {
    const allItems: Race[] = [];
    let page = 1;
    let cont = true;

    while (cont) {
        const allEvents = await getPaginatedFinishedRaces(page++, 100);

        allItems.push(...allEvents.items);

        if (allEvents.totalPages === page) {
            cont = false;
        }
    }

    return allItems.map((race) => {
        return {
            url: "https://therun.gg/races/" + race.raceId,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.4,
        };
    });
};

const sitemapForUsers = async (): Promise<MetadataRoute.Sitemap> => {
    const users = await getPaginatedUsers(1, 50000);

    return users.items
        .map((user) => {
            try {
                return {
                    url: "https://therun.gg/" + user.username,
                    lastModified: new Date(),
                    changeFrequency: "weekly",
                    priority: 0.8,
                };
            } catch (_) {
                return null;
            }
        })
        .filter((res) => !!res) as MetadataRoute.Sitemap;
};

const sitemapForRaceStats = async (): Promise<MetadataRoute.Sitemap> => {
    const stats = await getRaceGameStats(0);

    const gameStatPromises = stats.map((stat) =>
        getRaceGameStatsByGame(safeEncodeURI(stat.displayValue)),
    );

    const gameStats: RaceGameStatsByGame[] =
        await Promise.all(gameStatPromises);

    const gameStatsUrls: MetadataRoute.Sitemap = stats
        .map((stat) => {
            if (!stat.displayValue) return undefined;

            return {
                url:
                    "https://therun.gg/races/stats/" +
                    safeEncodeURI(stat.displayValue),
                lastModified: new Date(),
                changeFrequency: "daily",
                priority: 0.7,
            };
        })
        .filter(Boolean) as MetadataRoute.Sitemap;

    const categoryStatsUrls: MetadataRoute.Sitemap = [];

    gameStats.forEach((gameStat) => {
        const categories = gameStat.categories;

        if (!categories) return;

        categories.forEach((categoryStat) => {
            if (!categoryStat.displayValue) return;

            const split = categoryStat.displayValue.split("#");

            if (split.length !== 2) return;

            const [game, category] = split;

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
};

const sitemapForTournaments = async (): Promise<MetadataRoute.Sitemap> => {
    const tournaments = await getAllTournamentSlugs();

    return tournaments.map((tournament) => {
        return {
            url: "https://therun.gg/" + tournament,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.6,
        };
    });
};

const sitemapForEvents = async (): Promise<MetadataRoute.Sitemap> => {
    const allEvents = await getAllEvents();

    return allEvents.map((event) => {
        return {
            url: "https://therun.gg/events/" + event.slug,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.4,
        };
    });
};
