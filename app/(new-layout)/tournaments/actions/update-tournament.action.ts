'use server';

import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { updateTournament } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';
import {
    TournamentValidationError,
    validateAndDeriveSchedule,
    validateEligibleRuns,
} from '~src/lib/tournament-validation';
import type {
    DateRange,
    GameCategory,
    Tournament,
} from '../../../../types/tournament.types';

export interface UpdateTournamentInput {
    description?: string;
    shortName?: string;
    url?: string;
    logoUrl?: string;
    organizer?: string;
    gameTime?: boolean;
    heats?: DateRange[];
    eligibleRuns?: GameCategory[];
}

export async function updateTournamentAction(
    name: string,
    input: UpdateTournamentInput,
) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' as const };

    const patch: Partial<Tournament> = {
        description: input.description,
        shortName: input.shortName,
        url: input.url,
        logoUrl: input.logoUrl,
        organizer: input.organizer,
        gameTime: input.gameTime,
    };

    try {
        if (input.heats !== undefined) {
            const schedule = validateAndDeriveSchedule(input.heats);
            patch.startDate = schedule.startDate;
            patch.endDate = schedule.endDate;
            patch.eligiblePeriods = schedule.eligiblePeriods;
        }
        if (input.eligibleRuns !== undefined) {
            patch.eligibleRuns = validateEligibleRuns(input.eligibleRuns);
        }
    } catch (e) {
        if (e instanceof TournamentValidationError) {
            return { error: 'Validation failed', errors: e.errors };
        }
        throw e;
    }

    try {
        await updateTournament(name, patch, session.id);
    } catch (e) {
        if (e instanceof ApiError) {
            return { error: e.message, errors: e.errors };
        }
        throw e;
    }
    revalidateTag('tournaments', 'minutes');
    return { ok: true as const };
}
