'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { exclude, previewExclude } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import type {
    BulkExcludeResult,
    CreateRuleResult,
    PreviewExcludeResult,
    UserExclusionRuleInput,
} from '../../../../../../../../types/moderation.types';

/** Either a set of run ids or a user-exclusion rule. */
export type ExcludeTarget =
    | { runIds: number[] }
    | { rule: UserExclusionRuleInput };

export async function previewExcludeAction(
    gameSlug: string,
    target: ExcludeTarget,
): Promise<{ ok: true; preview: PreviewExcludeResult } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const preview = await previewExclude(session.id, game.id, target);
        return { ok: true, preview };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to preview exclusion.' };
    }
}

export type ExcludePayload =
    | { runIds: number[]; reason: string }
    | { rule: UserExclusionRuleInput; reason: string };

export async function excludeAction(
    gameSlug: string,
    input: ExcludePayload,
): Promise<
    | { ok: true; result: BulkExcludeResult | CreateRuleResult }
    | { error: string }
> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    try {
        const result = await exclude(session.id, game.id, input);
        if ('affectedLeaderboards' in result) {
            await revalidateAffectedBoards(
                game.id,
                game.name,
                result.affectedLeaderboards,
            );
            if ('runIds' in input) revalidateRunDetails(input.runIds);
        }
        return { ok: true, result };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to exclude.' };
    }
}
