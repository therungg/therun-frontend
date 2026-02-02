import { faker } from '@faker-js/faker';
import * as dotenv from 'dotenv';
import { InferInsertModel, sql } from 'drizzle-orm';
import { db } from '~src/db/index';
import { clearAlgoliaIndex, insertEventsToAlgolia } from '~src/lib/algolia';
import { CreateEventInput } from '../../types/events.types';
import { manageableRoles } from '../../types/roles.types';
import { eventOrganizers, events, roles, userRoles, users } from './schema';

dotenv.config({ path: './.env.development' });

if (!('DATABASE_URL' in process.env))
    throw new Error('DATABASE_URL not found on .env.development');

const NUM_EVENTS = 25;
const NUM_USERS = 100;

const main = async () => {
    await db.execute(
        sql`TRUNCATE TABLE "user_roles", "users", "roles", "events", "event_organizers" RESTART IDENTITY CASCADE;`,
    );

    await insertEventSeeds();
    await insertRoles();

    console.log('Seed done');
};

const insertEventSeeds = async () => {
    console.log('Seeding events...');
    const fakeEvents: CreateEventInput[] = [];
    const organizers = await db
        .insert(eventOrganizers)
        .values([{ name: 'Organizer' }] as InferInsertModel<
            typeof eventOrganizers
        >[])
        .onConflictDoNothing()
        .returning();
    const currentYear = new Date().getFullYear();
    const eventNames = [
        'GDQ',
        'ESA',
        'BSG',
        'PACE',
        'The Run Con',
        'Speedons',
        'Random Event',
    ];

    for (let i = 0; i < NUM_EVENTS; i++) {
        const startsAt = faker.date.between({
            from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
            to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        });
        const durationHours = faker.number.int({ min: 24, max: 24 * 9 });
        const endsAt = new Date(
            startsAt.getTime() + durationHours * 60 * 60 * 1000,
        );

        const baseName = faker.helpers.arrayElement(eventNames);
        const yearSuffix = currentYear + Math.floor(i / eventNames.length);
        const name = `${baseName} ${yearSuffix}`;
        const slug = name.toLowerCase().replace(/\s+/g, '-');

        fakeEvents.push({
            organizerId: organizers[0].id,
            startsAt,
            endsAt,
            name,
            slug,
            createdBy: 'me',
            type: faker.helpers.arrayElement([
                'Live',
                'Online',
                'Tournament',
                'Race',
            ]),
            location: faker.location.city(),
            bluesky: faker.internet.username(),
            discord: `https://discord.gg/therungg`,
            language: faker.helpers.arrayElement([
                'English',
                'Dutch',
                'Spanish',
            ]),
            shortDescription: faker.lorem.sentence(10),
            description: faker.lorem.paragraphs(2, '\n\n'),
            url: faker.internet.url(),
            tier: faker.number.int({ min: 1, max: 4 }),
            isOffline: faker.datatype.boolean(),
            isHighlighted: faker.datatype.boolean(),
            imageUrl: '/logo_dark_theme_no_text_transparent.png',
            tags: faker.helpers.arrayElements(
                [
                    'speedrunning',
                    'charity',
                    'gaming',
                    'tournament',
                    'community',
                ],
                faker.number.int({ min: 1, max: 3 }),
            ),
        } as CreateEventInput);
    }

    const eventResults = await db
        .insert(events)
        .values(fakeEvents)
        .onConflictDoNothing()
        .returning();

    console.log('Inserting events to algolia...');

    await clearAlgoliaIndex();
    await insertEventsToAlgolia(eventResults);
};

const adminUsers = ['joeys64', 'therun_gg'];

const insertRoles = async () => {
    // Seed roles
    console.log('Seeding roles...');
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

    console.log('Seeding users...');
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
