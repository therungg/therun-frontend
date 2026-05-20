'use server';

import { subject as caslSubject } from '@casl/ability';
import { revalidateTag } from 'next/cache';
import { getSession } from '~src/actions/session.action';
import { ApiError, apiFetch } from '~src/lib/api-client';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { defineAbilityFor } from '~src/rbac/ability';

interface Input {
    gameSlug: string;
    runId: number;
    categoryId: number;
    subcategoryKey: string;
    reason?: string;
}

interface RejectApiResult {
    rejected: true;
    nextRunIdForUser: number | null;
}

export async function rejectRunAction(
    input: Input,
): Promise<{ ok: true; nextRunIdForUser: number | null } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) {
        return { error: 'Not signed in.' };
    }

    const game = await resolveGame(input.gameSlug);
    if (!game) return { error: 'Game not found.' };

    const ability = defineAbilityFor(session);
    if (!ability.can('edit', caslSubject('leaderboard', { game: game.name }))) {
        return { error: 'Not authorized to reject runs for this game.' };
    }

    const body: { reason?: string } = {};
    const trimmed = input.reason?.trim();
    if (trimmed) body.reason = trimmed;

    let result: RejectApiResult;
    try {
        result = await apiFetch<RejectApiResult>(
            `/v1/leaderboards/reject/${input.runId}`,
            {
                method: 'POST',
                sessionId: session.id,
                body,
            },
        );
    } catch (e) {
        if (e instanceof ApiError) return { error: e.message };
        return { error: 'Failed to reject run.' };
    }

    // Resolve the category's searchable slug for cache-tag invalidation.
    try {
        const { categories } = await resolveCategory(game.id);
        const category = categories.find((c) => c.id === input.categoryId);
        if (category) {
            const sub = input.subcategoryKey;
            for (const timing of ['rt', 'gt'] as const) {
                for (const v of ['v', 'a'] as const) {
                    revalidateTag(
                        `lb:${game.name}:${category.name}:${sub}:${timing}:${v}`,
                        'minutes',
                    );
                }
            }
        }
    } catch {
        // resolveCategory is best-effort for invalidation; ignore failure.
    }

    revalidateTag(`run:${input.runId}`, 'minutes');

    return { ok: true, nextRunIdForUser: result.nextRunIdForUser };
}
