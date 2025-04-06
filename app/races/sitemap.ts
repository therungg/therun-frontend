import { MetadataRoute } from "next";
import { getPaginatedFinishedRaces } from "~src/lib/races";
import { Race } from "./races.types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
}
