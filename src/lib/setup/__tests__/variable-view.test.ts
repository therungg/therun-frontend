import { describe, expect, it } from 'vitest';
import type { VariableRow } from '../../../../types/leaderboards.types';
import {
    categoriesToConvert,
    driftSides,
    groupVariables,
    partitionGroups,
    rebuildValues,
    resolveToggles,
    subBoardCount,
} from '../variable-view';

function makeVariable(overrides: Partial<VariableRow> = {}): VariableRow {
    return {
        id: 1,
        gameId: 100,
        categoryId: 1,
        name: 'Platform',
        nameNormalized: 'platform',
        role: 'subcategory',
        values: [['N64'], ['Virtual Console'], ['Emulator']],
        defaultValueIndex: 0,
        sortOrder: 0,
        description: null,
        version: 1,
        published: true,
        ...overrides,
    };
}

describe('groupVariables', () => {
    it('presents the same variable across categories as one board-level row', () => {
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({ id: 2, categoryId: 2 }),
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].nameNormalized).toBe('platform');
        expect([...groups[0].byCategory.keys()]).toEqual([1, 2]);
    });

    it('unions buckets across categories, in first-seen order', () => {
        // Any% has no Emulator; 100% does. The board-level row has to offer
        // every bucket so a cell exists to tick.
        const groups = groupVariables([
            makeVariable({
                id: 1,
                categoryId: 1,
                values: [['N64'], ['Virtual Console']],
            }),
            makeVariable({
                id: 2,
                categoryId: 2,
                values: [['N64'], ['Emulator']],
            }),
        ]);
        expect(groups[0].buckets.map((b) => b.label)).toEqual([
            'N64',
            'Virtual Console',
            'Emulator',
        ]);
    });

    it('records which buckets each category actually carries', () => {
        const groups = groupVariables([
            makeVariable({
                id: 1,
                categoryId: 1,
                values: [['N64'], ['Virtual Console']],
            }),
            makeVariable({ id: 2, categoryId: 2, values: [['N64']] }),
        ]);
        const [group] = groups;
        expect([...(group.byCategory.get(1)?.buckets ?? [])]).toEqual([
            'n64',
            'virtual console',
        ]);
        expect([...(group.byCategory.get(2)?.buckets ?? [])]).toEqual(['n64']);
    });

    it('flags role drift between categories', () => {
        // The old shared scope pretended this could not happen. It can, so it
        // has to be visible rather than silently resolved.
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1, role: 'subcategory' }),
            makeVariable({ id: 2, categoryId: 2, role: 'subcategory' }),
            makeVariable({ id: 3, categoryId: 3, role: 'filter' }),
        ]);
        expect(groups[0].roleDrift).toBe(true);
        expect(groups[0].dominantRole).toBe('subcategory');
    });

    it('does not flag drift when every category agrees', () => {
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1, role: 'filter' }),
            makeVariable({ id: 2, categoryId: 2, role: 'filter' }),
        ]);
        expect(groups[0].roleDrift).toBe(false);
        expect(groups[0].dominantRole).toBe('filter');
    });

    it('keeps distinct variables apart', () => {
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({
                id: 2,
                categoryId: 1,
                name: 'Route',
                nameNormalized: 'route',
                values: [['Standard'], ['Alternate']],
            }),
        ]);
        expect(groups.map((g) => g.nameNormalized)).toEqual([
            'platform',
            'route',
        ]);
    });

    it('resolves the default bucket per category', () => {
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1, defaultValueIndex: 1 }),
        ]);
        expect(groups[0].byCategory.get(1)?.defaultBucket).toBe(
            'virtual console',
        );
    });
});

describe('subBoardCount', () => {
    it('is 1 for a category with no subcategory variables', () => {
        const rows = [makeVariable({ categoryId: 1, role: 'filter' })];
        expect(subBoardCount(1, rows)).toBe(1);
    });

    it('multiplies subcategory variables together', () => {
        // Two subcategory variables compose: 3 platforms x 2 routes = 6 boards.
        const rows = [
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({
                id: 2,
                categoryId: 1,
                name: 'Route',
                nameNormalized: 'route',
                values: [['Standard'], ['Alternate']],
            }),
        ];
        expect(subBoardCount(1, rows)).toBe(6);
    });

    it('ignores filter variables and other categories', () => {
        const rows = [
            makeVariable({ id: 1, categoryId: 1, values: [['A'], ['B']] }),
            makeVariable({
                id: 2,
                categoryId: 1,
                name: 'Route',
                nameNormalized: 'route',
                role: 'filter',
                values: [['X'], ['Y'], ['Z']],
            }),
            makeVariable({ id: 3, categoryId: 2, values: [['P'], ['Q']] }),
        ];
        expect(subBoardCount(1, rows)).toBe(2);
    });
});

describe('resolveToggles', () => {
    const group = groupVariables([
        makeVariable({
            id: 1,
            categoryId: 1,
            values: [['N64'], ['Virtual Console']],
        }),
        makeVariable({ id: 2, categoryId: 2, values: [['N64']] }),
    ])[0];

    it('is empty with nothing staged', () => {
        expect(resolveToggles(group, [])).toEqual([]);
    });

    it('adds a bucket to a category that lacks it', () => {
        const out = resolveToggles(group, [
            { categoryId: 2, bucketKey: 'virtual console', on: true },
        ]);
        expect(out).toEqual([
            { categoryId: 2, buckets: ['n64', 'virtual console'] },
        ]);
    });

    it('emits buckets in board order, not click order', () => {
        const out = resolveToggles(group, [
            { categoryId: 2, bucketKey: 'virtual console', on: true },
        ]);
        // 'n64' comes first in the group's bucket list, so it leads here even
        // though 'virtual console' was the bucket toggled.
        expect(out[0].buckets[0]).toBe('n64');
    });

    it('removes a bucket', () => {
        const out = resolveToggles(group, [
            { categoryId: 1, bucketKey: 'virtual console', on: false },
        ]);
        expect(out).toEqual([{ categoryId: 1, buckets: ['n64'] }]);
    });

    it('drops a category whose set ends up unchanged', () => {
        // Toggled on then off again: no write should be produced.
        const out = resolveToggles(group, [
            { categoryId: 1, bucketKey: 'emulator', on: true },
            { categoryId: 1, bucketKey: 'emulator', on: false },
        ]);
        expect(out).toEqual([]);
    });

    it('yields an empty bucket list when the last bucket is cleared', () => {
        // The caller turns this into a removal — an empty values array is not
        // a legal variable shape.
        const out = resolveToggles(group, [
            { categoryId: 2, bucketKey: 'n64', on: false },
        ]);
        expect(out).toEqual([{ categoryId: 2, buckets: [] }]);
    });

    it('creates the variable on a category that does not carry it at all', () => {
        const out = resolveToggles(group, [
            { categoryId: 9, bucketKey: 'n64', on: true },
        ]);
        expect(out).toEqual([{ categoryId: 9, buckets: ['n64'] }]);
    });
});

describe('partitionGroups', () => {
    it('sorts groups into the two things a moderator deals with', () => {
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({
                id: 2,
                categoryId: 1,
                name: 'Route',
                nameNormalized: 'route',
                role: 'filter',
                defaultValueIndex: null,
            }),
        ]);
        const { splits, details } = partitionGroups(groups);
        expect(splits.map((g) => g.name)).toEqual(['Platform']);
        expect(details.map((g) => g.name)).toEqual(['Route']);
    });

    it('places a drifting group by its dominant role, once', () => {
        // Two categories split on it, one only filters — it must not appear in
        // both sections, or one variable reads as two.
        const groups = groupVariables([
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({ id: 2, categoryId: 2 }),
            makeVariable({
                id: 3,
                categoryId: 3,
                role: 'filter',
                defaultValueIndex: null,
            }),
        ]);
        const { splits, details } = partitionGroups(groups);
        expect(splits).toHaveLength(1);
        expect(details).toHaveLength(0);
        expect(splits[0].roleDrift).toBe(true);
    });
});

describe('driftSides', () => {
    it('names the categories on each side of the disagreement', () => {
        const [group] = groupVariables([
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({
                id: 2,
                categoryId: 2,
                role: 'filter',
                defaultValueIndex: null,
            }),
        ]);
        expect(driftSides(group)).toEqual({ subcategory: [1], filter: [2] });
    });
});

describe('categoriesToConvert', () => {
    it('returns only the categories a conversion would actually rewrite', () => {
        const [group] = groupVariables([
            makeVariable({ id: 1, categoryId: 1 }),
            makeVariable({
                id: 2,
                categoryId: 2,
                role: 'filter',
                defaultValueIndex: null,
            }),
        ]);
        // Category 1 is already a split — republishing it would bump its
        // version and trigger a rebuild for no change.
        expect(categoriesToConvert(group, 'subcategory')).toEqual([2]);
        expect(categoriesToConvert(group, 'filter')).toEqual([1]);
    });
});

describe('rebuildValues', () => {
    function twoCategories() {
        return groupVariables([
            makeVariable({
                id: 1,
                categoryId: 1,
                values: [['N64', 'n64'], ['Emulator']],
                defaultValueIndex: 0,
            }),
            makeVariable({
                id: 2,
                categoryId: 2,
                values: [['N64']],
                defaultValueIndex: 0,
            }),
        ]);
    }

    it('collects aliases board-level, canonical excluded', () => {
        const [group] = twoCategories();
        expect(group.buckets[0]).toEqual({
            key: 'n64',
            label: 'N64',
            aliases: ['n64'],
        });
    });

    it('fans a rename out to every category carrying the option', () => {
        const [group] = twoCategories();
        const next = group.buckets.map((b) =>
            b.key === 'n64' ? { ...b, label: 'Nintendo 64' } : b,
        );
        const out = rebuildValues(group, next);
        expect(out.map((r) => r.categoryId).sort()).toEqual([1, 2]);
        expect(out.find((r) => r.categoryId === 2)?.values).toEqual([
            ['Nintendo 64', 'n64'],
        ]);
    });

    it('leaves placement alone — a category never gains an option it lacked', () => {
        const [group] = twoCategories();
        const next = group.buckets.map((b) =>
            b.key === 'emulator' ? { ...b, label: 'Emu' } : b,
        );
        const out = rebuildValues(group, next);
        // Category 2 never had Emulator and still does not.
        expect(out.find((r) => r.categoryId === 2)?.values).toEqual([
            ['N64', 'n64'],
        ]);
    });

    it('converges drifted aliases onto the board-level set', () => {
        // Category 2 stored a bare ['N64'] while category 1 also accepts
        // 'n64'. Any edit pulls it onto the shared set — that is how two
        // spellings of one option stop existing.
        const [group] = twoCategories();
        const out = rebuildValues(group, group.buckets);
        expect(out.map((r) => r.categoryId)).toEqual([2]);
        expect(out[0].values).toEqual([['N64', 'n64']]);
    });

    it('keeps each category pointing at its own default after a reorder', () => {
        const [group] = twoCategories();
        const reversed = [...group.buckets].reverse();
        const out = rebuildValues(group, reversed);
        // Category 1 defaulted to N64, now in position 1 rather than 0.
        expect(out.find((r) => r.categoryId === 1)?.defaultIndex).toBe(1);
    });

    it('empties a category left with no options, rather than writing an illegal one', () => {
        const [group] = twoCategories();
        const out = rebuildValues(
            group,
            group.buckets.filter((b) => b.key !== 'n64'),
        );
        expect(out.find((r) => r.categoryId === 2)?.values).toEqual([]);
        expect(out.find((r) => r.categoryId === 2)?.defaultIndex).toBeNull();
    });
});
