import { describe, expect, it } from 'vitest';
import { otherTiming, secondaryRequired, validateRunTimes } from '../run-times';

const IGT = 90_000;
const RTA = 102_000;

describe('secondaryRequired', () => {
    // The table in docs/plans/2026-08-16-paired-run-times-design.md. Only a
    // game-timed board showing its real-time column demands both.
    it('demands both only on a game-timed board showing the other clock', () => {
        expect(secondaryRequired('gametime', true)).toBe(true);
        expect(secondaryRequired('gametime', false)).toBe(false);
        expect(secondaryRequired('realtime', true)).toBe(false);
        expect(secondaryRequired('realtime', false)).toBe(false);
    });
});

describe('otherTiming', () => {
    it('flips the clock', () => {
        expect(otherTiming('gametime')).toBe('realtime');
        expect(otherTiming('realtime')).toBe('gametime');
    });
});

describe('validateRunTimes', () => {
    it('always requires the primary time', () => {
        const v = validateRunTimes({
            primaryTiming: 'realtime',
            showSecondary: false,
            primaryMs: null,
            secondaryMs: null,
        });
        expect(v.ok).toBe(false);
        expect(v.errors.primary).toBeDefined();
    });

    it('requires the real time on a game-timed board that shows it', () => {
        const v = validateRunTimes({
            primaryTiming: 'gametime',
            showSecondary: true,
            primaryMs: IGT,
            secondaryMs: null,
        });
        expect(v.ok).toBe(false);
        expect(v.errors.secondary).toBeDefined();
    });

    it('accepts both on a game-timed board that shows both', () => {
        const v = validateRunTimes({
            primaryTiming: 'gametime',
            showSecondary: true,
            primaryMs: IGT,
            secondaryMs: RTA,
        });
        expect(v.ok).toBe(true);
        expect(v.errors).toEqual({});
    });

    it('leaves the real time optional when the board does not show it', () => {
        const v = validateRunTimes({
            primaryTiming: 'gametime',
            showSecondary: false,
            primaryMs: IGT,
            secondaryMs: null,
        });
        expect(v.ok).toBe(true);
    });

    // Joey, 2026-08-16: an RTA board never demands game time, whatever the
    // "also show" switch says — most RTA runners do not have one.
    it('never demands game time on a real-time board', () => {
        const v = validateRunTimes({
            primaryTiming: 'realtime',
            showSecondary: true,
            primaryMs: RTA,
            secondaryMs: null,
        });
        expect(v.ok).toBe(true);
        expect(v.errors.secondary).toBeUndefined();
    });

    it('warns without blocking when real time is below game time', () => {
        const v = validateRunTimes({
            primaryTiming: 'gametime',
            showSecondary: true,
            primaryMs: RTA,
            secondaryMs: IGT, // transposed
        });
        expect(v.ok).toBe(true);
        expect(v.warnings.secondary).toBeDefined();
        expect(v.loadsMs).toBeNull();
    });

    it('derives the loads from the pair, whichever clock is primary', () => {
        expect(
            validateRunTimes({
                primaryTiming: 'gametime',
                showSecondary: true,
                primaryMs: IGT,
                secondaryMs: RTA,
            }).loadsMs,
        ).toBe(RTA - IGT);

        expect(
            validateRunTimes({
                primaryTiming: 'realtime',
                showSecondary: true,
                primaryMs: RTA,
                secondaryMs: IGT,
            }).loadsMs,
        ).toBe(RTA - IGT);
    });

    it('has no loads to show from one clock alone', () => {
        expect(
            validateRunTimes({
                primaryTiming: 'gametime',
                showSecondary: false,
                primaryMs: IGT,
                secondaryMs: null,
            }).loadsMs,
        ).toBeNull();
    });

    it('shows no loads when the two are equal', () => {
        expect(
            validateRunTimes({
                primaryTiming: 'gametime',
                showSecondary: true,
                primaryMs: IGT,
                secondaryMs: IGT,
            }).loadsMs,
        ).toBeNull();
    });
});
