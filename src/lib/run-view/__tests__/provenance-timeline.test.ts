import { describe, expect, test } from 'vitest';
import type {
    HistoryEvent,
    RunProvenance,
} from '../../../../types/moderation.types';
import { buildProvenanceTimeline } from '../provenance-timeline';

const prov: RunProvenance = {
    ingest: {
        path: 'timer',
        submittedBy: null,
        createdBy: null,
        reason: null,
        ingestedAt: '2026-01-01T00:00:00.000Z',
        speedrunRunId: '42',
        platform: 'PC',
        emulator: false,
        rawVariables: null,
    },
    reassignments: [
        {
            kind: 'game',
            reassignmentId: 7,
            from: {
                gameId: 1,
                gameName: 'Elden Rng',
                categoryId: 2,
                categoryName: 'Any%',
            },
            to: {
                gameId: 3,
                gameName: 'Elden Ring',
                categoryId: 4,
                categoryName: 'Any%',
            },
            movedAt: '2026-02-01T00:00:00.000Z',
            undoneAt: null,
            performedBy: { userId: 9, name: 'modguy' },
        },
    ],
    identity: [],
    moderation: {
        modNote: null,
        ineligibleReason: null,
        excluded: false,
        verifyQueueHidden: false,
    },
};

const history: HistoryEvent[] = [
    {
        type: 'verdict',
        action: 'verdict_verify',
        byRole: 'mod',
        reason: 'looks clean',
        at: '2026-03-01T00:00:00.000Z',
    },
];

describe('buildProvenanceTimeline', () => {
    test('orders ingest -> reassignment -> history', () => {
        const items = buildProvenanceTimeline(prov, history);
        expect(items.map((i) => i.kind)).toEqual([
            'ingest',
            'reassignment',
            'history',
        ]);
    });
    test('ingest with null date sorts first', () => {
        const p = { ...prov, ingest: { ...prov.ingest, ingestedAt: null } };
        const items = buildProvenanceTimeline(p, history);
        expect(items[0].kind).toBe('ingest');
        expect(items[0].at).toBeNull();
    });
    test('reassignment label names the original board and actor', () => {
        const item = buildProvenanceTimeline(prov, [])[1];
        expect(item.label).toContain('Elden Rng');
        expect(item.label).toContain('Elden Ring');
        expect(item.sub).toContain('modguy');
        expect(item.struck).toBe(false);
    });
    test('undone reassignments are struck', () => {
        const p = {
            ...prov,
            reassignments: [
                {
                    ...prov.reassignments[0],
                    undoneAt: '2026-02-02T00:00:00.000Z',
                },
            ],
        };
        expect(buildProvenanceTimeline(p, [])[1].struck).toBe(true);
    });
    test('works with null provenance (history only)', () => {
        const items = buildProvenanceTimeline(null, history);
        expect(items).toHaveLength(1);
        expect(items[0].kind).toBe('history');
    });
});
