import { events } from "./schema";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import { db } from "~src/db/index";
dotenv.config({ path: "./.env.development" });

if (!("DATABASE_URL" in process.env))
    throw new Error("DATABASE_URL not found on .env.development");

const NUM_EVENTS = 10;

const main = async () => {
    const fakeEvents: (typeof events.$inferInsert)[] = [];
    for (let i = 0; i < NUM_EVENTS; i++) {
        const startsAt = faker.date.future();
        const durationHours = faker.number.int({ min: 24, max: 24 * 9 });
        const endsAt = new Date(
            startsAt.getTime() + durationHours * 60 * 60 * 1000,
        );

        const name = faker.helpers.arrayElement([
            "GDQ",
            "ESA",
            "BSG",
            "PACE",
            "The Run Con",
            "Speedons",
            "Random event name",
        ]);
        fakeEvents.push({
            startsAt,
            endsAt,
            name, // e.g. "Innovate scalable solutions"
            type: faker.helpers.arrayElement([
                "Live",
                "Online",
                "Tournament",
                "Race",
            ]),

            location: faker.location.city(),
            bluesky: faker.internet.username(),
            discord: `https://discord.gg/therungg`,
            language: faker.helpers.arrayElement([
                "English",
                "Dutch",
                "Spanish",
            ]),
            shortDescription: faker.lorem.sentence(10),
            description: faker.lorem.paragraphs(2, "\n\n"),
            url: faker.internet.url(),
            imageUrl: "no image", // You can choose a more specific image type if needed
        });
    }

    // Insert the generated events into the "events" table
    await db.insert(events).values(fakeEvents);
    console.log("Seed done");
};

main();
