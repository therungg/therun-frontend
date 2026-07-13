import { describe, expect, test } from 'vitest';
import {
    customSlidesFromPrep,
    emptyPrepData,
    parsePrepData,
} from '../prep.types';

describe('parsePrepData', () => {
    test('garbage yields empty structure', () => {
        expect(parsePrepData(null)).toEqual(emptyPrepData());
        expect(parsePrepData(42)).toEqual(emptyPrepData());
    });

    test('keeps valid entries, drops malformed ones', () => {
        const parsed = parsePrepData({
            interview: {
                goal: { text: 'sub 1:40', targetTimeMs: 6_000_000 },
                quotes: [{ id: 'q1', text: 'hi' }, { text: 'no id' }],
                facts: [{ id: 'f1', template: 'fact', body: 'b' }],
            },
            clips: [{ id: 'c1', videoUrl: 'u', title: 't' }, { id: 'c2' }],
            roadmapNotes: [{ splitIndex: 1, text: 'n' }, { splitIndex: 'x' }],
            deckOrder: { pre: [{ kind: 'stat', id: 'intro' }, { kind: '?' }] },
        });
        expect(parsed.interview.quotes).toHaveLength(1);
        expect(parsed.clips).toHaveLength(1);
        expect(parsed.roadmapNotes).toEqual([{ splitIndex: 1, text: 'n' }]);
        expect(parsed.deckOrder?.pre).toEqual([{ kind: 'stat', id: 'intro' }]);
    });

    test('empty deckOrder arrays normalize to absent', () => {
        const parsed = parsePrepData({
            deckOrder: { pre: [], post: [{ kind: 'wat', id: 'x' }] },
        });
        expect(parsed.deckOrder).toBeUndefined();
    });
});

describe('customSlidesFromPrep', () => {
    const data = parsePrepData({
        interview: {
            goal: { text: 'sub 1:40', targetTimeMs: 6_000_000 },
            quotes: [{ id: 'q1', text: 'hi' }],
            facts: [{ id: 'f1', template: 'fact', body: 'b' }],
        },
        clips: [{ id: 'c1', videoUrl: 'u', title: 't' }],
        roadmapNotes: [],
    });

    test('pre deck: goal becomes called-shot with id goal', () => {
        const items = customSlidesFromPrep(data, 'pre');
        const ids = items.map((i) => i.id);
        expect(ids).toEqual(['goal', 'q1', 'f1', 'c1']);
        expect(items[0].content.kind).toBe('called-shot');
    });

    test('post deck: goal becomes called-shot-result with id goal-result', () => {
        const items = customSlidesFromPrep(data, 'post');
        expect(items[0]).toMatchObject({
            id: 'goal-result',
            content: { kind: 'called-shot-result' },
        });
    });

    test('no goal: no called-shot item', () => {
        const noGoal = {
            ...data,
            interview: { ...data.interview, goal: undefined },
        };
        const kinds = customSlidesFromPrep(noGoal, 'pre').map(
            (i) => i.content.kind,
        );
        expect(kinds).not.toContain('called-shot');
    });
});
