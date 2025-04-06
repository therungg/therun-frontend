import { MetadataRoute } from "next";
import { getAllTournamentSlugs } from "./tournament-list";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const tournaments = await getAllTournamentSlugs();

    return tournaments.map((tournament) => {
        return {
            url: "https://therun.gg/" + tournament,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.6,
        };
    });
}
