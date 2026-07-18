import { describe, expect, it } from 'vitest';
import {
    isTriageInert,
    moveSelection,
    parseTriageKey,
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

    it('returns null for an unrelated key', () => {
        expect(parseTriageKey({ key: 'x', ...noMods })).toBeNull();
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
