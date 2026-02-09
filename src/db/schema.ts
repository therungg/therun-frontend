import { sql } from 'drizzle-orm';
import {
    bigint,
    bigserial,
    boolean,
    index,
    integer,
    json,
    jsonb,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    uniqueIndex,
    varchar,
} from 'drizzle-orm/pg-core';
import { PanelConfig } from '../../types/frontpage-config.types';

export const events = pgTable(
    'events',
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        organizerId: integer()
            .references(() => eventOrganizers.id)
            .notNull(),
        startsAt: timestamp().notNull(),
        endsAt: timestamp().notNull(),
        name: varchar({ length: 255 }).notNull().unique(),
        slug: varchar({ length: 50 }).notNull().unique(),
        type: varchar({ length: 255 }).notNull(),
        location: varchar({ length: 255 }),
        bluesky: varchar({ length: 255 }),
        twitter: varchar({ length: 255 }),
        twitch: varchar({ length: 255 }),
        discord: varchar({ length: 255 }),
        submissionsUrl: varchar({ length: 255 }),
        language: varchar({ length: 255 }).notNull(),
        shortDescription: varchar({ length: 255 }).notNull(),
        description: text().notNull(),
        url: varchar({ length: 255 }),
        scheduleUrl: varchar({ length: 255 }),
        imageUrl: varchar({ length: 255 }),
        isOffline: boolean().default(true).notNull(),
        isHighlighted: boolean().default(false).notNull(),
        tier: integer().default(1),
        tags: json().default([]).notNull(),
        isForCharity: boolean().default(false).notNull(),
        charityName: varchar({ length: 255 }),
        charityUrl: varchar({ length: 255 }),
        restreams: json().default([]).notNull(),
        isDeleted: boolean().default(false).notNull(),
        createdAt: timestamp().defaultNow().notNull(),
        createdBy: varchar({ length: 255 }).notNull(),
    },
    (table) => [
        index('starts_at_index').on(table.startsAt),
        index('ends_at_index').on(table.endsAt),
        index('slug_index').on(table.slug),
    ],
);

export const eventOrganizers = pgTable('event_organizers', {
    id: serial().primaryKey().unique(),
    name: varchar({ length: 255 }).notNull().unique(),
});

export const users = pgTable(
    'users',
    {
        id: serial().primaryKey().unique(),
        username: varchar({ length: 255 }).notNull().unique(),
        frontpageConfig: jsonb('frontpage_config').$type<PanelConfig>(),
    },
    (table) => [
        uniqueIndex('idx_users_username_lower').using(
            'btree',
            sql`(lower(${table.username}))`,
        ),
    ],
);

export const roles = pgTable('roles', {
    id: serial().primaryKey().unique(),
    name: varchar({ length: 255 }).notNull().unique(),
    description: varchar({ length: 1000 }).notNull().default('Description'),
});

export const userRoles = pgTable(
    'user_roles',
    {
        userId: integer()
            .references(() => users.id)
            .notNull(),
        roleId: integer()
            .references(() => roles.id)
            .notNull(),
    },
    (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const logs = pgTable('logs', {
    id: serial().primaryKey().unique(),
    userId: integer()
        .references(() => users.id)
        .notNull(),
    remark: varchar({ length: 1000 }),
    action: varchar({ length: 255 }).notNull(),
    entity: varchar({ length: 255 }).notNull(),
    target: varchar({ length: 255 }),
    data: jsonb(),
    timestamp: timestamp().defaultNow().notNull(),
});

export const speedrunRuns = pgTable(
    'speedrun_runs',
    {
        id: serial().primaryKey(),
        username: text().notNull(),
        game: text().notNull(),
        category: text().notNull(),
        personalBest: bigint({ mode: 'number' }),
        sumOfBests: bigint({ mode: 'number' }),
        attemptCount: integer(),
        finishedAttemptCount: integer(),
        totalRunTime: bigint({ mode: 'number' }),
        platform: text(),
        emulator: boolean().default(false),
        gameRegion: text(),
        variables: jsonb(),
        hasGameTime: boolean().default(false),
        gameTimePb: bigint({ mode: 'number' }),
        gameTimeSob: bigint({ mode: 'number' }),
        personalBestTime: timestamp(),
        uploadTime: timestamp(),
        highlighted: boolean().default(false),
        vod: text(),
        description: text(),
        customUrl: text(),
        updatedAt: timestamp().defaultNow(),
    },
    (table) => [
        uniqueIndex('speedrun_runs_username_game_category_idx').on(
            table.username,
            table.game,
            table.category,
        ),
        index('speedrun_runs_game_category_pb_idx').on(
            table.game,
            table.category,
            table.personalBest,
        ),
        index('speedrun_runs_username_idx').on(table.username),
    ],
);

export const finishedRuns = pgTable(
    'finished_runs',
    {
        id: bigserial({ mode: 'number' }).primaryKey(),
        username: text().notNull(),
        game: text().notNull(),
        category: text().notNull(),
        time: bigint({ mode: 'number' }).notNull(),
        gameTime: bigint({ mode: 'number' }),
        startedAt: timestamp(),
        endedAt: timestamp().notNull(),
        isPb: boolean().default(false),
        platform: text(),
        emulator: boolean().default(false),
        runId: integer().references(() => speedrunRuns.id, {
            onDelete: 'cascade',
        }),
    },
    (table) => [
        index('finished_runs_game_category_ended_at_idx').on(
            table.game,
            table.category,
            table.endedAt,
        ),
        index('finished_runs_username_ended_at_idx').on(
            table.username,
            table.endedAt,
        ),
        index('finished_runs_game_category_time_pb_idx')
            .on(table.game, table.category, table.time)
            .where(sql`"isPb" = true`),
    ],
);
