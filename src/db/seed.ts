import { eventOrganizers, events, roles, userRoles, users } from "./schema";
import { faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import { db } from "~src/db/index";
import { CreateEventInput } from "../../types/events.types";
import { InferInsertModel, sql } from "drizzle-orm";
import { manageableRoles } from "../../types/roles.types";

dotenv.config({ path: "./.env.development" });

if (!("DATABASE_URL" in process.env))
    throw new Error("DATABASE_URL not found on .env.development");

const NUM_EVENTS = 10;
const NUM_USERS = 100;

const main = async () => {
    await db.execute(
        sql`TRUNCATE TABLE "user_roles", "users", "roles", "events", "event_organizers" RESTART IDENTITY CASCADE;`,
    );

    await insertEventSeeds();
    await insertRoles();

    console.log("Seed done");
};

const insertEventSeeds = async () => {
    const fakeEvents: CreateEventInput[] = [];
    const organizers = await db
        .insert(eventOrganizers)
        .values([{ name: "Organizer" }] as InferInsertModel<
            typeof eventOrganizers
        >)
        .onConflictDoNothing()
        .returning();
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
            organizerId: organizers[0].id,
            startsAt,
            endsAt,
            name,
            createdBy: "me",
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
        } as CreateEventInput);
    }

    // Insert the generated events into the "events" table
    await db.insert(events).values(fakeEvents).onConflictDoNothing();
};

const adminUsers = ["joeys64", "therun_gg"];

const insertRoles = async () => {
    // Seed roles
    console.log("Seeding roles...");
    await Promise.all(
        manageableRoles.map(async (roleName) => {
            await db
                .insert(roles)
                .values({
                    name: roleName,
                    description: `${roleName} role`,
                })
                .onConflictDoNothing(); // Avoid duplication if run multiple times
        }),
    );

    // Fetch role IDs for later use
    const existingRoles = await db.select().from(roles);

    for (let i = 0; i < adminUsers.length; i++) {
        const username = adminUsers[i];
        const user = await db
            .insert(users)
            .values({
                username,
            })
            .returning()
            .onConflictDoNothing();

        for (const role of existingRoles) {
            await db
                .insert(userRoles)
                .values({
                    userId: user[0].id,
                    roleId: role.id,
                })
                .onConflictDoNothing();
        }
    }

    console.log("Seeding users...");
    for (let i = 1; i <= NUM_USERS; i++) {
        const username = faker.person.firstName() + i.toString();
        const user = await db
            .insert(users)
            .values({
                username,
            })
            .returning()
            .onConflictDoNothing();

        const randomRoleCount = Math.floor(Math.random() * 3); // Each user gets 0-2 roles

        if (randomRoleCount > 0) {
            const selectedRoles = existingRoles
                .sort(() => 0.5 - Math.random())
                .slice(0, randomRoleCount);

            for (const role of selectedRoles) {
                await db
                    .insert(userRoles)
                    .values({
                        userId: user[0].id,
                        roleId: role.id,
                    })
                    .onConflictDoNothing();
            }
        }
    }
};

main();
