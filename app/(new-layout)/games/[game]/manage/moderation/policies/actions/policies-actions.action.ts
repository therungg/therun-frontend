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
import {
    isDefaultPlayersRange,
    playersRangeError,
} from '~src/lib/setup/game-minimum';
import type { PlayersRange } from '../../../../../../../../types/leaderboards.types';
import type {
    BoardPolicyRow,
    CreatePolicyInput,
    PolicyPreviewInput,
    PolicyPreviewResult,
} from '../../../../../../../../types/moderation.types';
import { loadStandardsAction } from '../../configure/actions/standards.action';

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

    if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
        return { error: 'A category is required.' };
    }
    if (input.value !== null) {
        const rangeError = playersRangeError({
            min: input.value.min,
            max: input.value.max ?? null,
        });
        if (rangeError) return { error: rangeError };
    }

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

/**
 * Writes (or clears) a players policy at one scope, with the validation the
 * client-side draft already applies — but enforced here too, because a
 * client-only check is not a check: a crafted call to this action bypassing
 * the UI must not be able to store `{min:0}`, `{min:4,max:1}`, or the
 * permissive default as a real row.
 *
 * The single entry point for every players-policy write on this console —
 * the category-wide Standards editor and every subcategory-dialog value row
 * both go through this, rather than calling create/update/delete directly
 * with a raw value, so the rule lives in exactly one place.
 */
export async function writePlayersPolicyAction(
    gameSlug: string,
    categoryId: number,
    /** null for the category-wide scope. */
    subcategoryKey: string | null,
    /** null clears the policy at this scope. */
    value: PlayersRange | null,
): Promise<{ ok: true; changed: boolean } | { error: string }> {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return { error: 'A category is required.' };
    }
    if (value !== null) {
        const rangeError = playersRangeError(value);
        if (rangeError) return { error: rangeError };
    }
    // The default range and no row at all must mean the same thing — a
    // moderator "clearing" the setting (or a caller sending the default
    // outright) must never leave a no-op row behind, since a STORED default
    // is what makes a board read as configured for co-op.
    const toWrite =
        value !== null && isDefaultPlayersRange(value) ? null : value;

    const loaded = await loadStandardsAction(gameSlug, categoryId);
    if ('error' in loaded) return loaded;

    const existing = loaded.policies.find(
        (p) =>
            p.policyType === 'players' &&
            p.categoryId === categoryId &&
            p.subcategoryKey === subcategoryKey,
    );

    if (toWrite === null) {
        if (!existing) return { ok: true, changed: false };
        const res = await deletePolicyAction(gameSlug, existing.id, categoryId);
        return 'error' in res ? res : { ok: true, changed: true };
    }

    if (existing) {
        const existingValue = existing.value as Record<string, unknown>;
        const unchanged =
            existingValue.min === toWrite.min &&
            (existingValue.max ?? null) === toWrite.max;
        if (unchanged) return { ok: true, changed: false };

        const res = await updatePolicyAction(
            gameSlug,
            existing.id,
            toWrite,
            categoryId,
        );
        return 'error' in res ? res : { ok: true, changed: true };
    }

    const res = await createPolicyAction(gameSlug, {
        policyType: 'players',
        value: toWrite,
        categoryId,
        subcategoryKey,
    });
    return 'error' in res ? res : { ok: true, changed: true };
}
