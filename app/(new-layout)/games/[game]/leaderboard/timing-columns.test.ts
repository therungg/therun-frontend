import { describe, expect, it } from 'vitest';
import { timingColumnHidden, timingColumns } from './timing-columns';

describe('timingColumns', () => {
    it('rt primary: real time first', () => {
        const { primary, secondary } = timingColumns('rt');
        expect(primary.key).toBe('rt');
        expect(secondary.key).toBe('gt');
    });
    it('gt primary: game time first', () => {
        const { primary, secondary } = timingColumns('gt');
        expect(primary.key).toBe('gt');
        expect(secondary.key).toBe('rt');
    });
    it('labels are correct', () => {
        const { primary: rtPrimary } = timingColumns('rt');
        expect(rtPrimary.label).toBe('Real time');

        const { primary: gtPrimary } = timingColumns('gt');
        expect(gtPrimary.label).toBe('Game time');
    });
});

describe('timingColumnHidden', () => {
    it('rt hidden when hideRealTime is true', () => {
        expect(
            timingColumnHidden('rt', {
                hideRealTime: true,
                hideGameTime: false,
            }),
        ).toBe(true);
    });
    it('rt visible when hideRealTime is false', () => {
        expect(
            timingColumnHidden('rt', {
                hideRealTime: false,
                hideGameTime: true,
            }),
        ).toBe(false);
    });
    it('gt hidden when hideGameTime is true', () => {
        expect(
            timingColumnHidden('gt', {
                hideRealTime: false,
                hideGameTime: true,
            }),
        ).toBe(true);
    });
    it('gt visible when hideGameTime is false', () => {
        expect(
            timingColumnHidden('gt', {
                hideRealTime: true,
                hideGameTime: false,
            }),
        ).toBe(false);
    });
});
