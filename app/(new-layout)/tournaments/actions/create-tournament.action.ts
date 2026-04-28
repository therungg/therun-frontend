'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '~src/actions/session.action';
import { createTournament } from '~src/lib/api/tournaments';
import { ApiError } from '~src/lib/api-client';
import {
    TournamentValidationError,
    validateAndDeriveSchedule,
    validateEligibleRuns,
} from '~src/lib/tournament-validation';
import type {
    DateRange,
    GameCategory,
} from '../../../../types/tournament.types';

export interface CreateTournamentInput {
    name: string;
    shortName?: string;
    description?: string;
    heats: DateRange[];
    eligibleRuns: GameCategory[];
}

export async function createTournamentAction(input: CreateTournamentInput) {
    const session = await getSession();
    if (!session.id) return { error: 'Not signed in' };

    const name = input.name.trim();
    if (!name) return { error: 'Name is required' };

    let schedule;
    let runs;
    try {
        schedule = validateAndDeriveSchedule(input.heats);
        runs = validateEligibleRuns(input.eligibleRuns);
    } catch (e) {
        if (e instanceof TournamentValidationError) {
            return { error: 'Validation failed', errors: e.errors };
        }
        throw e;
    }

    try {
        await createTournament(
            {
                name,
                shortName: input.shortName,
                description: input.description,
                startDate: schedule.startDate,
                endDate: schedule.endDate,
                eligiblePeriods: schedule.eligiblePeriods,
                eligibleRuns: runs,
                hide: false,
            },
            session.id,
        );
    } catch (e) {
        if (e instanceof ApiError) {
            return { error: e.message, errors: e.errors };
        }
        throw e;
    }

    revalidateTag('tournaments', 'minutes');
    redirect(`/tournaments/${encodeURIComponent(name)}`);
}
