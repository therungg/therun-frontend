import { describe, expect, test } from 'vitest';
import {
    applyBackspace,
    applyDecimal,
    applyDigit,
    draftToMs,
    draftToText,
    EMPTY_DRAFT,
    msToDraft,
    nudge,
} from '../keystrokes';

/** Types a string of keys into an empty draft, the way a user would. */
function type(keys: string) {
    let d = EMPTY_DRAFT;
    for (const ch of keys) {
        if (ch >= '0' && ch <= '9') d = applyDigit(d, ch);
        else if (ch === '.' || ch === ',') d = applyDecimal(d);
        else if (ch === '<') d = applyBackspace(d);
    }
    return d;
}

describe('the keystroke table', () => {
    test.each([
        ['4', '0:04', 4_000],
        ['3548', '35:48', 2_148_000],
        ['12345', '1:23:45', 5_025_000],
        ['3548.6', '35:48.6', 2_148_600],
        ['3548.678', '35:48.678', 2_148_678],
        ['95', '0:95', 95_000],
    ])('typing %s shows %s and means %ims', (keys, text, ms) => {
        const d = type(keys);
        expect(draftToText(d)).toBe(text);
        expect(draftToMs(d)).toBe(ms);
    });
});

describe('digits fill from the right', () => {
    test('an empty draft has no text and no value', () => {
        expect(draftToText(EMPTY_DRAFT)).toBe('');
        expect(draftToMs(EMPTY_DRAFT)).toBeNull();
    });

    test('each digit pushes the stack left', () => {
        expect(draftToText(type('1'))).toBe('0:01');
        expect(draftToText(type('12'))).toBe('0:12');
        expect(draftToText(type('123'))).toBe('1:23');
        expect(draftToText(type('1234'))).toBe('12:34');
        expect(draftToText(type('12345'))).toBe('1:23:45');
        expect(draftToText(type('123456'))).toBe('12:34:56');
    });

    test('a lone leading zero is replaced, not kept', () => {
        expect(draftToText(type('04'))).toBe('0:04');
        expect(draftToMs(type('04'))).toBe(4_000);
    });

    test('digits past hhh:mm:ss are ignored, not silently wrapped', () => {
        const capped = type('12345678');
        expect(draftToText(capped)).toBe('123:45:67');
        expect(draftToText(applyDigit(capped, '9'))).toBe('123:45:67');
    });

    test('over-60 segments are allowed while typing', () => {
        expect(draftToText(type('7590'))).toBe('75:90');
        expect(draftToMs(type('7590'))).toBe(75 * 60_000 + 90_000);
    });
});

describe('the fraction', () => {
    test('the decimal key opens it before any digit follows', () => {
        const d = type('3548.');
        expect(draftToText(d)).toBe('35:48.');
        expect(draftToMs(d)).toBe(2_148_000);
    });

    test('a comma works like a period', () => {
        expect(draftToText(type('3548,6'))).toBe('35:48.6');
    });

    test('pads right: .6 is 600ms, not 6ms', () => {
        expect(draftToMs(type('.6'))).toBe(600);
        expect(draftToMs(type('.06'))).toBe(60);
        expect(draftToMs(type('.006'))).toBe(6);
    });

    test('caps at three digits', () => {
        const d = type('.6789');
        expect(draftToText(d)).toBe('0:00.678');
        expect(draftToMs(d)).toBe(678);
    });

    test('a bare fraction with no digits is sub-second', () => {
        expect(draftToText(type('.5'))).toBe('0:00.5');
        expect(draftToMs(type('.5'))).toBe(500);
    });
});

describe('backspace', () => {
    test('pops one fraction digit at a time', () => {
        expect(draftToText(type('3548.67<'))).toBe('35:48.6');
    });

    test('crosses back out of the fraction into the seconds', () => {
        expect(draftToText(type('3548.6<'))).toBe('35:48.');
        expect(draftToText(type('3548.6<<'))).toBe('35:48');
        expect(draftToText(type('3548.6<<<'))).toBe('3:54');
    });

    test('the decimal point itself costs a keystroke to delete', () => {
        // Three backspaces empty the fraction, a fourth closes the decimal,
        // and only the fifth starts eating seconds.
        expect(draftToText(type('3548.678<<<'))).toBe('35:48.');
        expect(draftToText(type('3548.678<<<<'))).toBe('35:48');
        expect(draftToText(type('3548.678<<<<<'))).toBe('3:54');
    });

    test('empties down to nothing', () => {
        expect(draftToText(type('35<<'))).toBe('');
        expect(draftToMs(type('35<<'))).toBeNull();
    });
});

describe('msToDraft', () => {
    test('null is the empty draft', () => {
        expect(msToDraft(null)).toEqual(EMPTY_DRAFT);
        expect(msToDraft(undefined)).toEqual(EMPTY_DRAFT);
    });

    test('normalizes an over-60 draft — 0:95 settles to 1:35', () => {
        expect(draftToText(msToDraft(draftToMs(type('95'))))).toBe('1:35');
    });

    test('round-trips through draftToMs', () => {
        for (const ms of [4_000, 95_000, 2_148_600, 5_025_678, 600]) {
            expect(draftToMs(msToDraft(ms))).toBe(ms);
        }
    });

    test('drops a zero fraction but keeps a non-zero one', () => {
        expect(draftToText(msToDraft(2_148_000))).toBe('35:48');
        expect(draftToText(msToDraft(2_148_600))).toBe('35:48.600');
    });

    test('clamps negatives to zero', () => {
        expect(draftToMs(msToDraft(-5_000))).toBe(0);
    });
});

describe('nudge', () => {
    test('a second up and down', () => {
        expect(draftToMs(nudge(type('3548'), 1_000))).toBe(2_149_000);
        expect(draftToMs(nudge(type('3548'), -1_000))).toBe(2_147_000);
    });

    test('a minute up and down', () => {
        expect(draftToMs(nudge(type('3548'), 60_000))).toBe(2_208_000);
        expect(draftToMs(nudge(type('3548'), -60_000))).toBe(2_088_000);
    });

    test('never goes below zero', () => {
        expect(draftToMs(nudge(type('2'), -60_000))).toBe(0);
    });

    test('starts from zero on an empty draft', () => {
        expect(draftToMs(nudge(EMPTY_DRAFT, 1_000))).toBe(1_000);
    });

    test('keeps the fraction it was carrying', () => {
        expect(draftToMs(nudge(type('3548.6'), 1_000))).toBe(2_149_600);
    });

    test('normalizes as it goes — nudging 0:95 up gives 1:36', () => {
        expect(draftToText(nudge(type('95'), 1_000))).toBe('1:36');
    });
});
