import { describe, expect, it } from 'vitest';
import type { BoardClaimRequest } from '../../../../types/board-claims.types';
import { groupClaimsByBoard } from '../group-claims';

function claim(over: Partial<BoardClaimRequest>): BoardClaimRequest {
    return {
        id: 1,
        gameId: 10,
        gameSlug: 'gamea',
        gameDisplay: 'Game A',
        userId: 1,
        username: 'u1',
        motivation: 'please',
        status: 'pending',
        signals: {
            runsOnGame: 0,
            totalRuns: 0,
            accountCreatedAt: null,
            priorApprovals: 0,
            priorDenials: 0,
        },
        board: { uniqueRunners: 5, totalFinishedRuns: 50 },
        createdAt: '2026-07-01T00:00:00Z',
        decidedBy: null,
        decidedAt: null,
        denyReason: null,
        ...over,
    };
}

describe('groupClaimsByBoard', () => {
    it('groups rival requests for the same game onto one card', () => {
        const groups = groupClaimsByBoard([
            claim({ id: 1, gameId: 10, userId: 1 }),
            claim({ id: 2, gameId: 10, userId: 2 }),
            claim({ id: 3, gameId: 20, gameSlug: 'gameb', userId: 3 }),
        ]);
        expect(groups).toHaveLength(2);
        const a = groups.find((g) => g.gameId === 10);
        expect(a?.requests.map((r) => r.id)).toEqual([1, 2]);
    });

    it('sorts groups by oldest pending request first (stalest board first)', () => {
        const groups = groupClaimsByBoard([
            claim({ id: 1, gameId: 10, createdAt: '2026-07-10T00:00:00Z' }),
            claim({ id: 2, gameId: 20, createdAt: '2026-07-01T00:00:00Z' }),
        ]);
        expect(groups[0].gameId).toBe(20);
    });

    it('sorts requests within a group oldest first', () => {
        const groups = groupClaimsByBoard([
            claim({ id: 1, gameId: 10, createdAt: '2026-07-10T00:00:00Z' }),
            claim({ id: 2, gameId: 10, createdAt: '2026-07-01T00:00:00Z' }),
        ]);
        expect(groups[0].requests.map((r) => r.id)).toEqual([2, 1]);
    });

    it('returns empty array for no claims', () => {
        expect(groupClaimsByBoard([])).toEqual([]);
    });
});
