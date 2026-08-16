import type { ModTiming } from '../../types/moderation.types';

/**
 * A manual submission asserts clocks, not a clock.
 *
 * A category timed by game time that also shows real time has a column no
 * single-clock submission can fill, so on those boards both values are
 * required. Everywhere else the second clock is accepted but never demanded —
 * in particular a real-time board never demands game time, because most RTA
 * runners do not have one and the RTA column is the one that ranks.
 *
 * See docs/plans/2026-08-16-paired-run-times-design.md.
 */

export interface RunTimesInput {
    /** The clock this board ranks by. */
    primaryTiming: ModTiming;
    /** The category's "also show the other clock" switch. */
    showSecondary: boolean;
    primaryMs: number | null;
    secondaryMs: number | null;
}

export interface RunTimesVerdict {
    /** No blocking errors — the caller may submit. */
    ok: boolean;
    /** Blocks submission. Keyed by field so a form can place them. */
    errors: { primary?: string; secondary?: string };
    /** Worth saying, never blocking. */
    warnings: { secondary?: string };
    /** Real time minus game time, when both are known and it is positive. */
    loadsMs: number | null;
}

/** The other clock, whichever one this board ranks by. */
export const otherTiming = (t: ModTiming): ModTiming =>
    t === 'gametime' ? 'realtime' : 'gametime';

/**
 * True when the second clock is worth asking for at all.
 *
 * Only game-timed boards ask. A real-time board never asks for game time even
 * when it shows a game-time column — most RTA runners do not have one, so the
 * field would be a permanently empty box on every submission. (Joey,
 * 2026-08-16: "if RTA, don't even ask for IGT".)
 */
export const secondaryVisible = (primaryTiming: ModTiming): boolean =>
    primaryTiming === 'gametime';

/**
 * True when this board demands both clocks. Game-timed boards showing their
 * real-time column, and only those; a game-timed board that shows one column
 * still accepts a real time, it just does not insist.
 */
export const secondaryRequired = (
    primaryTiming: ModTiming,
    showSecondary: boolean,
): boolean => secondaryVisible(primaryTiming) && showSecondary;

export function validateRunTimes({
    primaryTiming,
    showSecondary,
    primaryMs,
    secondaryMs,
}: RunTimesInput): RunTimesVerdict {
    const errors: RunTimesVerdict['errors'] = {};
    const warnings: RunTimesVerdict['warnings'] = {};

    if (primaryMs === null) errors.primary = 'Enter a time.';

    if (
        secondaryRequired(primaryTiming, showSecondary) &&
        secondaryMs === null
    ) {
        errors.secondary = 'This board shows both times, so both are required.';
    }

    // Real time counts the loads that game time removes, so real time below
    // game time is almost always the two fields the wrong way round. It stays
    // a warning: a board can label its second clock something that does not
    // obey that rule, and blocking a correct submission is worse than a note.
    const realMs = primaryTiming === 'realtime' ? primaryMs : secondaryMs;
    const gameMs = primaryTiming === 'realtime' ? secondaryMs : primaryMs;
    const bothKnown = realMs !== null && gameMs !== null;

    if (bothKnown && realMs < gameMs) {
        warnings.secondary =
            'Real time is below game time. Check the two are the right way round.';
    }

    return {
        ok: Object.keys(errors).length === 0,
        errors,
        warnings,
        loadsMs: bothKnown && realMs > gameMs ? realMs - gameMs : null,
    };
}
