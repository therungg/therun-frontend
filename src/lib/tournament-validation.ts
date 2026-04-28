import type { DateRange, GameCategory } from '../../types/tournament.types';

export interface ValidatedTournamentSchedule {
    startDate: string;
    endDate: string;
    eligiblePeriods: DateRange[];
}

export class TournamentValidationError extends Error {
    errors: string[];
    constructor(errors: string[]) {
        super(errors.join('; '));
        this.errors = errors;
    }
}

/**
 * Validates a list of heats: each must have endDate > startDate, none may overlap.
 * Returns the schedule with the derived top-level startDate/endDate
 * (earliest start, latest end). Throws TournamentValidationError on failure.
 */
export function validateAndDeriveSchedule(
    heats: DateRange[],
): ValidatedTournamentSchedule {
    const errors: string[] = [];
    if (heats.length === 0) {
        errors.push('At least one heat is required');
        throw new TournamentValidationError(errors);
    }

    const parsed = heats.map((h, i) => {
        const startMs = Date.parse(h.startDate);
        const endMs = Date.parse(h.endDate);
        if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
            errors.push(`Heat ${i + 1}: invalid date`);
        }
        if (
            !Number.isNaN(startMs) &&
            !Number.isNaN(endMs) &&
            endMs <= startMs
        ) {
            errors.push(`Heat ${i + 1}: end must be after start`);
        }
        return { startMs, endMs, raw: h };
    });

    if (errors.length > 0) throw new TournamentValidationError(errors);

    const sorted = [...parsed].sort((a, b) => a.startMs - b.startMs);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startMs < sorted[i - 1].endMs) {
            errors.push(
                `Heats overlap: heat ending ${sorted[i - 1].raw.endDate} and heat starting ${sorted[i].raw.startDate}`,
            );
        }
    }
    if (errors.length > 0) throw new TournamentValidationError(errors);

    return {
        startDate: sorted[0].raw.startDate,
        endDate: sorted[sorted.length - 1].raw.endDate,
        eligiblePeriods: sorted.map((p) => p.raw),
    };
}

export function validateEligibleRuns(runs: GameCategory[]): GameCategory[] {
    const errors: string[] = [];
    if (runs.length === 0) {
        errors.push('At least one game/category is required');
    }
    runs.forEach((r, i) => {
        if (!r.game?.trim()) errors.push(`Run ${i + 1}: game is required`);
        if (!r.category?.trim())
            errors.push(`Run ${i + 1}: category is required`);
    });
    if (errors.length > 0) throw new TournamentValidationError(errors);
    return runs.map((r) => ({
        game: r.game.trim(),
        category: r.category.trim(),
    }));
}
