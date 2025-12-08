import { MetadataRoute } from "next";
import { getAllEvents } from "~src/lib/events";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    return [];

    const allEvents = await getAllEvents();

    return allEvents.map((event) => {
        return {
            url: "https://therun.gg/events/" + event.slug,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.4,
        };
    });
}
