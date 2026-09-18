import { describe, expect, it } from 'vitest';
import {
    allKeysSelected,
    flattenTriageOrder,
    intersectSelected,
    isTriageInert,
    moveSelection,
    parseTriageKey,
    queuePosition,
    setManySelected,
    toggleSelected,
} from './triage-keyboard';

describe('parseTriageKey', () => {
    const noMods = { ctrlKey: false, metaKey: false, altKey: false };

    it('maps j and ArrowDown to "down"', () => {
        expect(parseTriageKey({ key: 'j', ...noMods })).toBe('down');
        expect(parseTriageKey({ key: 'ArrowDown', ...noMods })).toBe('down');
    });

    it('maps k and ArrowUp to "up"', () => {
        expect(parseTriageKey({ key: 'k', ...noMods })).toBe('up');
        expect(parseTriageKey({ key: 'ArrowUp', ...noMods })).toBe('up');
    });

    it('maps v to "approve"', () => {
        expect(parseTriageKey({ key: 'v', ...noMods })).toBe('approve');
    });

    it('maps r to "remove"', () => {
        expect(parseTriageKey({ key: 'r', ...noMods })).toBe('remove');
    });

    it('maps x to "toggle"', () => {
        expect(parseTriageKey({ key: 'x', ...noMods })).toBe('toggle');
    });

    it('returns null for an unrelated key', () => {
        expect(parseTriageKey({ key: 'q', ...noMods })).toBeNull();
        expect(parseTriageKey({ key: 'Enter', ...noMods })).toBeNull();
    });

    it('returns null when a modifier key is held, even for a mapped letter', () => {
        expect(
            parseTriageKey({
                key: 'r',
                ctrlKey: true,
                metaKey: false,
                altKey: false,
            }),
        ).toBeNull();
        expect(
            parseTriageKey({
                key: 'r',
                ctrlKey: false,
                metaKey: true,
                altKey: false,
            }),
        ).toBeNull();
        expect(
            parseTriageKey({
                key: 'v',
                ctrlKey: false,
                metaKey: false,
                altKey: true,
            }),
        ).toBeNull();
    });
});

describe('isTriageInert', () => {
    it('is inert whenever a dialog is open, regardless of focus', () => {
        expect(
            isTriageInert({
                activeTag: null,
                isContentEditable: false,
                dialogOpen: true,
            }),
        ).toBe(true);
    });

    it('is inert when focus is in an input, textarea, or select', () => {
        for (const tag of [
            'input',
            'textarea',
            'select',
            'INPUT',
            'TEXTAREA',
        ]) {
            expect(
                isTriageInert({
                    activeTag: tag,
                    isContentEditable: false,
                    dialogOpen: false,
                }),
            ).toBe(true);
        }
    });

    it('is inert when focus is in a contenteditable region', () => {
        expect(
            isTriageInert({
                activeTag: 'div',
                isContentEditable: true,
                dialogOpen: false,
            }),
        ).toBe(true);
    });

    it('is not inert for a plain button or body focus with no dialog', () => {
        expect(
            isTriageInert({
                activeTag: 'button',
                isContentEditable: false,
                dialogOpen: false,
            }),
        ).toBe(false);
        expect(
            isTriageInert({
                activeTag: null,
                isContentEditable: false,
                dialogOpen: false,
            }),
        ).toBe(false);
    });
});

describe('moveSelection', () => {
    it('returns null when there is nothing selectable', () => {
        expect(moveSelection([], null, 'down')).toBeNull();
        expect(moveSelection([], 'a', 'up')).toBeNull();
    });

    it('selects the first key moving down from no selection', () => {
        expect(moveSelection(['a', 'b', 'c'], null, 'down')).toBe('a');
    });

    it('selects the last key moving up from no selection', () => {
        expect(moveSelection(['a', 'b', 'c'], null, 'up')).toBe('c');
    });

    it('steps forward and backward within the list', () => {
        expect(moveSelection(['a', 'b', 'c'], 'a', 'down')).toBe('b');
        expect(moveSelection(['a', 'b', 'c'], 'b', 'down')).toBe('c');
        expect(moveSelection(['a', 'b', 'c'], 'c', 'up')).toBe('b');
        expect(moveSelection(['a', 'b', 'c'], 'b', 'up')).toBe('a');
    });

    it('clamps at the end — does not wrap', () => {
        expect(moveSelection(['a', 'b', 'c'], 'c', 'down')).toBe('c');
    });

    it('clamps at the start — does not wrap', () => {
        expect(moveSelection(['a', 'b', 'c'], 'a', 'up')).toBe('a');
    });

    it('falls back to the first/last key when the current selection is no longer in the list', () => {
        expect(moveSelection(['a', 'b', 'c'], 'gone', 'down')).toBe('a');
        expect(moveSelection(['a', 'b', 'c'], 'gone', 'up')).toBe('c');
    });
});

describe('toggleSelected', () => {
    it('adds a key that is not yet selected', () => {
        const result = toggleSelected(new Set(), 'a');
        expect(Array.from(result)).toEqual(['a']);
    });

    it('removes a key that is already selected', () => {
        const result = toggleSelected(new Set(['a', 'b']), 'a');
        expect(Array.from(result)).toEqual(['b']);
    });

    it('does not mutate the input set', () => {
        const input = new Set(['a']);
        toggleSelected(input, 'a');
        expect(Array.from(input)).toEqual(['a']);
    });
});

describe('setManySelected', () => {
    it('adds every given key when select is true', () => {
        const result = setManySelected(new Set(['a']), ['b', 'c'], true);
        expect(Array.from(result).sort()).toEqual(['a', 'b', 'c']);
    });

    it('removes every given key when select is false', () => {
        const result = setManySelected(
            new Set(['a', 'b', 'c']),
            ['b', 'c'],
            false,
        );
        expect(Array.from(result)).toEqual(['a']);
    });

    it('is a no-op for keys not present when deselecting', () => {
        const result = setManySelected(new Set(['a']), ['x', 'y'], false);
        expect(Array.from(result)).toEqual(['a']);
    });

    it('does not mutate the input set', () => {
        const input = new Set(['a']);
        setManySelected(input, ['b'], true);
        expect(Array.from(input)).toEqual(['a']);
    });
});

describe('allKeysSelected', () => {
    it('is true when every key is selected', () => {
        expect(allKeysSelected(new Set(['a', 'b', 'c']), ['a', 'b'])).toBe(
            true,
        );
    });

    it('is false when some keys are missing', () => {
        expect(allKeysSelected(new Set(['a']), ['a', 'b'])).toBe(false);
    });

    it('is false for an empty key list — nothing to vacuously select all of', () => {
        expect(allKeysSelected(new Set(['a']), [])).toBe(false);
    });
});

describe('intersectSelected', () => {
    it('keeps only selected keys that are still present', () => {
        const result = intersectSelected(new Set(['a', 'b', 'c']), [
            'b',
            'c',
            'd',
        ]);
        expect(Array.from(result).sort()).toEqual(['b', 'c']);
    });

    it('returns an empty set when nothing overlaps', () => {
        const result = intersectSelected(new Set(['a']), ['b']);
        expect(result.size).toBe(0);
    });

    it('does not mutate the input set', () => {
        const input = new Set(['a', 'b']);
        intersectSelected(input, ['a']);
        expect(Array.from(input).sort()).toEqual(['a', 'b']);
    });
});

describe('flattenTriageOrder', () => {
    it('includes every single-item group key, in group order', () => {
        const groups = [
            { userId: null, items: [{ key: 'a' }] },
            { userId: 5, items: [{ key: 'b' }] },
        ];
        expect(flattenTriageOrder(groups, new Set())).toEqual(['a', 'b']);
    });

    it("omits a multi-item group's keys while collapsed", () => {
        const groups = [
            { userId: 1, items: [{ key: 'a' }, { key: 'b' }] },
            { userId: null, items: [{ key: 'c' }] },
        ];
        expect(flattenTriageOrder(groups, new Set())).toEqual(['c']);
    });

    it("includes a multi-item group's keys, in item order, once expanded", () => {
        const groups = [
            { userId: 1, items: [{ key: 'a' }, { key: 'b' }] },
            { userId: null, items: [{ key: 'c' }] },
        ];
        expect(flattenTriageOrder(groups, new Set([1]))).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    it('only expands the matching userId — other collapsed groups stay hidden', () => {
        const groups = [
            { userId: 1, items: [{ key: 'a' }, { key: 'b' }] },
            { userId: 2, items: [{ key: 'c' }, { key: 'd' }] },
        ];
        expect(flattenTriageOrder(groups, new Set([2]))).toEqual(['c', 'd']);
    });
});

describe('queuePosition', () => {
    it('returns null when nothing is selected', () => {
        expect(queuePosition(['a', 'b'], null)).toBeNull();
    });

    it('returns null when the selected key is not currently rendered', () => {
        expect(queuePosition(['a', 'b'], 'gone')).toBeNull();
    });

    it('returns the 1-based position and total count', () => {
        expect(queuePosition(['a', 'b', 'c'], 'b')).toEqual({ n: 2, m: 3 });
        expect(queuePosition(['a', 'b', 'c'], 'a')).toEqual({ n: 1, m: 3 });
        expect(queuePosition(['a', 'b', 'c'], 'c')).toEqual({ n: 3, m: 3 });
    });
});
