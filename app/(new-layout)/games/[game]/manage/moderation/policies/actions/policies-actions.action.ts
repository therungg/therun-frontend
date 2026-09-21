'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canConfigureGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    createPolicy,
    deletePolicy,
    previewPolicy,
    updatePolicy,
} from '~src/lib/moderation/policies';
import { revalidateBoardsForRuleScope } from '~src/lib/moderation/revalidate-boards';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
    PolicyPreviewInput,
    PolicyPreviewResult,
} from '../../../../../../../../types/moderation.types';

// Board standards are configuration, not triage: the backend gates every
// write on the board-policies routes (min_time, players, …) on
// `edit-category-settings`, not on the ordinary `verify-reject-run` a
// moderator holds. A refusal here is a readable sentence rather than a 403
// the caller has to translate.
const NOT_CONFIGURABLE =
    "You don't have the right to change this board's settings.";

export async function createPolicyAction(
    gameSlug: string,
    input: CreatePolicyInput,
): Promise<{ ok: true; policy: BoardPolicyRow } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canConfigureGame(session, game.name)) {
        return { error: NOT_CONFIGURABLE };
    }

    try {
        const policy = await createPolicy(session.id, game.id, input);
        await revalidateBoardsForRuleScope(
            game.id,
            game.name,
            input.categoryId ?? null,
        );
        return { ok: true, policy };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to create policy.' };
    }
}

export async function updatePolicyAction(
    gameSlug: string,
    id: number,
    value: Record<string, unknown>,
    /** The policy's own category scope (null for a game-wide row), so the
     *  boards it affects can be invalidated. Omit only when the caller has
     *  no way to know it — new callers should always pass it. */
    categoryId?: number | null,
): Promise<{ ok: true; policy: BoardPolicyRow } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canConfigureGame(session, game.name)) {
        return { error: NOT_CONFIGURABLE };
    }

    try {
        const policy = await updatePolicy(session.id, game.id, id, { value });
        if (categoryId !== undefined) {
            await revalidateBoardsForRuleScope(game.id, game.name, categoryId);
        }
        return { ok: true, policy };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to update policy.' };
    }
}

export async function deletePolicyAction(
    gameSlug: string,
    id: number,
    categoryId?: number | null,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canConfigureGame(session, game.name)) {
        return { error: NOT_CONFIGURABLE };
    }

    try {
        await deletePolicy(session.id, game.id, id);
        if (categoryId !== undefined) {
            await revalidateBoardsForRuleScope(game.id, game.name, categoryId);
        }
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to delete policy.' };
    }
}

/** A dry run of a players-policy write — what it would do to the category's
 *  boards, before anyone commits to it. Writes nothing, so it shares the
 *  configure gate rather than needing its own. */
export async function previewPolicyAction(
    gameSlug: string,
    input: PolicyPreviewInput,
): Promise<PolicyPreviewResult | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canConfigureGame(session, game.name)) {
        return { error: NOT_CONFIGURABLE };
    }

    try {
        return await previewPolicy(session.id, game.id, input);
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to preview.' };
    }
}
