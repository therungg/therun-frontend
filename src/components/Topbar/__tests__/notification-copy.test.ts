import { expect, test, describe as vDescribe } from 'vitest';
import type { NotificationRow } from '../../../../types/moderation.types';
import {
    describe as describeNotification,
    linkFor,
} from '../notification-copy';

const row = (over: Partial<NotificationRow>): NotificationRow => ({
    id: 1,
    userId: 1,
    type: 'verdict_applied',
    payload: {},
    readAt: null,
    createdAt: '2026-07-18T00:00:00.000Z',
    ...over,
});

vDescribe('linkFor', () => {
    vDescribe('board_claim_approved', () => {
        test('links to setup when gameSlug is present', () => {
            const n = row({
                type: 'board_claim_approved',
                payload: { gameSlug: 'celeste' },
            });
            expect(linkFor(n)).toBe('/games-v2/celeste/setup');
        });
        test('null when gameSlug is missing', () => {
            const n = row({ type: 'board_claim_approved', payload: {} });
            expect(linkFor(n)).toBeNull();
        });
        test('null when gameSlug is wrong-typed', () => {
            const n = row({
                type: 'board_claim_approved',
                payload: { gameSlug: 123 },
            });
            expect(linkFor(n)).toBeNull();
        });
    });

    vDescribe('board_claim_denied', () => {
        test('links to the game when gameSlug is present', () => {
            const n = row({
                type: 'board_claim_denied',
                payload: { gameSlug: 'celeste' },
            });
            expect(linkFor(n)).toBe('/games-v2/celeste');
        });
        test('null when gameSlug is missing', () => {
            const n = row({ type: 'board_claim_denied', payload: {} });
            expect(linkFor(n)).toBeNull();
        });
        test('null when gameSlug is null', () => {
            const n = row({
                type: 'board_claim_denied',
                payload: { gameSlug: null },
            });
            expect(linkFor(n)).toBeNull();
        });
    });

    vDescribe('verdict_applied', () => {
        test('links to the run when gameSlug and runId are present', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { gameSlug: 'celeste', runId: 42 },
            });
            expect(linkFor(n)).toBe('/games-v2/celeste/run/42');
        });
        test('null when gameSlug is missing (current backend emission)', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { runId: 42, action: 'reject' },
            });
            expect(linkFor(n)).toBeNull();
        });
        test('null when runId is wrong-typed', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { gameSlug: 'celeste', runId: '42' },
            });
            expect(linkFor(n)).toBeNull();
        });
    });

    vDescribe('manual_time_verdict / created / deleted', () => {
        test.each([
            'manual_time_verdict',
            'manual_time_created',
            'manual_time_deleted',
        ] as const)(
            '%s links when gameSlug and manualTimeId present',
            (type) => {
                const n = row({
                    type,
                    payload: { gameSlug: 'celeste', manualTimeId: 7 },
                });
                expect(linkFor(n)).toBe('/games-v2/celeste/manual/7');
            },
        );
        test.each([
            'manual_time_verdict',
            'manual_time_created',
            'manual_time_deleted',
        ] as const)('%s is null when manualTimeId is missing', (type) => {
            const n = row({ type, payload: { gameSlug: 'celeste' } });
            expect(linkFor(n)).toBeNull();
        });
        test.each([
            'manual_time_verdict',
            'manual_time_created',
            'manual_time_deleted',
        ] as const)('%s is null when manualTimeId is wrong-typed', (type) => {
            const n = row({
                type,
                payload: { gameSlug: 'celeste', manualTimeId: '7' },
            });
            expect(linkFor(n)).toBeNull();
        });
    });

    test('unknown type never links', () => {
        const n = row({
            type: 'something_new',
            payload: { gameSlug: 'celeste', runId: 1, manualTimeId: 1 },
        });
        expect(linkFor(n)).toBeNull();
    });

    test('missing payload entirely does not throw and returns null', () => {
        const n = row({
            type: 'verdict_applied',
            payload: undefined as unknown as Record<string, unknown>,
        });
        expect(linkFor(n)).toBeNull();
    });
});

vDescribe('describeNotification', () => {
    vDescribe('verdict_applied', () => {
        test('enriched verify copy when gameDisplay + categoryDisplay present', () => {
            const n = row({
                type: 'verdict_applied',
                payload: {
                    action: 'verify',
                    gameDisplay: 'Celeste',
                    categoryDisplay: 'Any%',
                },
            });
            expect(describeNotification(n)).toBe(
                'Your Any% run of Celeste was verified by a moderator.',
            );
        });
        test('enriched with gameDisplay only (no category)', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { action: 'reject', gameDisplay: 'Celeste' },
            });
            expect(describeNotification(n)).toBe(
                'Your run of Celeste was rejected by a moderator.',
            );
        });
        test('falls back to generic copy when gameDisplay is missing', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { action: 'reject' },
            });
            expect(describeNotification(n)).toBe(
                'One of your runs was rejected by a moderator.',
            );
        });
        test('falls back to generic copy when gameDisplay is wrong-typed', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { action: 'verify', gameDisplay: 999 },
            });
            expect(describeNotification(n)).toBe(
                'One of your runs was verified by a moderator.',
            );
        });
        test('unreject action', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { action: 'unreject' },
            });
            expect(describeNotification(n)).toBe(
                'One of your runs was reinstated by a moderator.',
            );
        });
        test('unknown action falls back to generic mod-updated copy', () => {
            const n = row({
                type: 'verdict_applied',
                payload: { action: 'something_else' },
            });
            expect(describeNotification(n)).toBe(
                'A moderator updated one of your runs.',
            );
        });
    });

    vDescribe('manual_time_verdict', () => {
        test('enriched verified copy', () => {
            const n = row({
                type: 'manual_time_verdict',
                payload: {
                    verdict: 'verified',
                    gameDisplay: 'Celeste',
                    categoryDisplay: 'Any%',
                },
            });
            expect(describeNotification(n)).toBe(
                'Your claimed Any% time for Celeste was verified.',
            );
        });
        test('enriched rejected copy', () => {
            const n = row({
                type: 'manual_time_verdict',
                payload: { verdict: 'rejected', gameDisplay: 'Celeste' },
            });
            expect(describeNotification(n)).toBe(
                'Your claimed time for Celeste was rejected.',
            );
        });
        test('falls back to generic copy when payload fields are missing', () => {
            const n = row({
                type: 'manual_time_verdict',
                payload: { verdict: 'verified' },
            });
            expect(describeNotification(n)).toBe(
                'Your claimed time was verified.',
            );
        });
    });

    test('manual_time_created generic copy', () => {
        const n = row({ type: 'manual_time_created', payload: {} });
        expect(describeNotification(n)).toBe(
            'A moderator set a leaderboard time for you.',
        );
    });

    test('manual_time_deleted generic copy', () => {
        const n = row({ type: 'manual_time_deleted', payload: {} });
        expect(describeNotification(n)).toBe(
            'A moderator removed a leaderboard time set for you.',
        );
    });

    vDescribe('board_claim_approved', () => {
        test('names the game when gameDisplay present', () => {
            const n = row({
                type: 'board_claim_approved',
                payload: { gameDisplay: 'Celeste' },
            });
            expect(describeNotification(n)).toContain('Celeste');
        });
        test('falls back to "this game" when gameDisplay missing', () => {
            const n = row({ type: 'board_claim_approved', payload: {} });
            expect(describeNotification(n)).toContain('this game');
        });
    });

    vDescribe('board_claim_denied', () => {
        test('includes the reason when present', () => {
            const n = row({
                type: 'board_claim_denied',
                payload: { gameDisplay: 'Celeste', reason: 'no video proof' },
            });
            expect(describeNotification(n)).toBe(
                'Your application to moderate Celeste was declined (no video proof)',
            );
        });
        test('omits the reason suffix when missing', () => {
            const n = row({
                type: 'board_claim_denied',
                payload: { gameDisplay: 'Celeste' },
            });
            expect(describeNotification(n)).toBe(
                'Your application to moderate Celeste was declined',
            );
        });
        test('omits the reason suffix when wrong-typed', () => {
            const n = row({
                type: 'board_claim_denied',
                payload: { gameDisplay: 'Celeste', reason: 42 },
            });
            expect(describeNotification(n)).toBe(
                'Your application to moderate Celeste was declined',
            );
        });
    });

    test('unknown type falls back to the generic notification message', () => {
        const n = row({ type: 'something_new', payload: {} });
        expect(describeNotification(n)).toBe('You have a new notification.');
    });
});
