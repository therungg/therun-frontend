import { describe, expect, it } from 'vitest';
import type {
    AnonymizeRuleWithNames,
    ModActionRow,
} from '../../../../types/moderation.types';
import {
    buildAnonymizeIndex,
    buildModeratorFeed,
    modActionToLogEntry,
} from '../mod-feed';

const row = (over: Partial<ModActionRow> = {}): ModActionRow => ({
    logId: 1,
    userId: 9,
    actorName: 'weegee_mod',
    action: 'exclude_run',
    entity: 'finished_run',
    target: '4321',
    remark: 'Timer started 54 seconds late.',
    data: {
        gameId: 7,
        categoryId: 12,
        subject: { userId: 55, username: 'tallgrass', guestName: null },
    },
    timestamp: '2026-08-05T12:00:00.000Z',
    ...over,
});

const rule = (over: Partial<AnonymizeRuleWithNames>): AnonymizeRuleWithNames =>
    ({
        ruleId: 1,
        type: 'user',
        targetId: 55,
        gameId: 7,
        categoryId: null,
        anonId: 4821,
        displayName: 'Anonymous runner #4821',
        scope: 'game',
        reason: 'At the runner’s request.',
        createdBy: 9,
        createdAt: '2026-08-04T18:02:00.000Z',
        liftedAt: null,
        liftedBy: null,
        liftReason: null,
        targetDisplayName: 'tallgrass',
        createdByName: 'nova_',
        liftedByName: null,
        ...over,
    }) as AnonymizeRuleWithNames;

describe('modActionToLogEntry', () => {
    it('lifts identity and scope out of the free-form data blob', () => {
        const entry = modActionToLogEntry(row());
        expect(entry.subject).toEqual({
            userId: 55,
            username: 'tallgrass',
            guestName: null,
        });
        expect(entry.gameId).toBe(7);
        expect(entry.categoryId).toBe(12);
        // `remark` is the authed feed's name for what the public feed calls
        // `reason` — the whole point of the adapter.
        expect(entry.reason).toBe('Timer started 54 seconds late.');
        expect(entry.runId).toBe(4321);
        expect(entry.actor).toEqual({ userId: 9, username: 'weegee_mod' });
    });

    it('survives a missing or non-object data blob', () => {
        for (const data of [null, undefined, 'nope', 42, []]) {
            const entry = modActionToLogEntry(row({ data }));
            expect(entry.subject).toBeNull();
            expect(entry.gameId).toBeNull();
        }
    });

    it('only parses a runId off a finished_run target', () => {
        expect(modActionToLogEntry(row({ entity: 'user' })).runId).toBeNull();
        expect(
            modActionToLogEntry(row({ target: 'not-a-number' })).runId,
        ).toBeNull();
    });
});

describe('buildModeratorFeed', () => {
    it('badges a subject the public sees masked, keeping the real name', () => {
        const feed = buildModeratorFeed(
            [row()],
            buildAnonymizeIndex([rule({})]),
        );
        expect(feed[0].subject).toEqual({
            userId: 55,
            username: 'tallgrass',
            guestName: null,
            anonymized: true,
            anonId: 4821,
        });
    });

    it('marks a run-scoped rule off the runId, not the subject', () => {
        const feed = buildModeratorFeed(
            [row({ data: { gameId: 7, subject: { userId: 99 } } })],
            buildAnonymizeIndex([
                rule({ type: 'run', targetId: 4321, anonId: 77, scope: 'run' }),
            ]),
        );
        expect(feed[0].subject?.anonId).toBe(77);
    });

    it('ignores lifted rules — they are history, not current masking', () => {
        const feed = buildModeratorFeed(
            [row()],
            buildAnonymizeIndex([
                rule({ liftedAt: '2026-08-05T09:00:00.000Z' }),
            ]),
        );
        expect(feed[0].subject?.anonymized).toBeUndefined();
    });

    it('leaves unmasked rows alone', () => {
        const feed = buildModeratorFeed([row()], buildAnonymizeIndex([]));
        expect(feed[0].subject?.anonymized).toBeUndefined();
    });
});
