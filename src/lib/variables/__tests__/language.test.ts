import { describe, expect, it } from 'vitest';
import { boardCountLabel, ROLE_LABEL, roleConsequence } from '../language';

describe('ROLE_LABEL', () => {
    it('never leaks the internal role names to the user', () => {
        expect(ROLE_LABEL.subcategory).toBe('splits this board');
        expect(ROLE_LABEL.filter).toBe('filter only');
    });
});

describe('roleConsequence', () => {
    const base = {
        variableName: 'Platform',
        categoryDisplay: 'Any%',
        role: 'subcategory' as const,
    };

    it('counts the boards a split produces', () => {
        expect(roleConsequence({ ...base, valueCount: 4 })).toBe(
            'Any% becomes 4 separate leaderboards, each with its own world record.',
        );
    });

    it('says a one-value split does nothing yet', () => {
        expect(roleConsequence({ ...base, valueCount: 1 })).toBe(
            'Any% stays one leaderboard until you add a second value.',
        );
    });

    it('asks for values when there are none', () => {
        expect(roleConsequence({ ...base, valueCount: 0 })).toBe(
            'Add at least one value.',
        );
    });

    it('describes a filter as leaving the board intact', () => {
        expect(
            roleConsequence({ ...base, role: 'filter', valueCount: 3 }),
        ).toBe('Any% stays one leaderboard. Runners can filter by Platform.');
    });
});

describe('boardCountLabel', () => {
    it('drops the count for a single value — "into 1" is not a split', () => {
        expect(boardCountLabel('subcategory', 1)).toBe('splits this board');
        expect(boardCountLabel('subcategory', 0)).toBe('splits this board');
    });

    it('counts the boards for two or more values', () => {
        expect(boardCountLabel('subcategory', 4)).toBe(
            'splits this board into 4',
        );
    });

    it('ignores value count for a filter', () => {
        expect(boardCountLabel('filter', 3)).toBe('filter only');
    });
});
