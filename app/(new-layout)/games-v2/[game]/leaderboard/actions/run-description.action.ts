'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { updateManualTime } from '~src/lib/moderation/manual-times';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import { editRun, setOwnDescription } from '~src/lib/moderation/run-edit';
import { selfSetManualTimeDescription } from '~src/lib/moderation/self-service';

type Fail = { error: string };

/** Mirrors DESCRIPTION_MAX_LENGTH in the backend's services/run-description.ts. */
const MAX_LENGTH = 4000;

/**
 * A runner writing (or clearing) the description on their own run.
 *
 * Ownership isn't checked here — the backend decides it from the bearer token
 * and the run's `user_id`, which is the only source that can't be spoofed by a
 * client passing someone else's runId. A non-owner gets a 403 back, and the
 * message surfaces as-is.
 */
export async function setOwnDescriptionAction(
    runId: number,
    text: string,
): Promise<{ ok: true; description: string | null } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'Not signed in.' };

    const trimmed = text.trim();
    if (trimmed.length > MAX_LENGTH) {
        return {
            error: `Descriptions are limited to ${MAX_LENGTH} characters.`,
        };
    }
    const description = trimmed.length > 0 ? trimmed : null;

    try {
        await setOwnDescription(session.id, runId, description);
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not save the description. Please try again.' };
    }

    revalidateRunDetails([runId]);
    return { ok: true, description };
}

/**
 * The manual-time twin of `setOwnDescriptionAction`. A manual time is the other
 * thing a submission can be (the submit dialog writes these, not finished
 * runs), so the owner's editor has to reach both or half of what a runner
 * submits would be unwritable.
 */
export async function setOwnManualTimeDescriptionAction(
    manualTimeId: number,
    text: string,
): Promise<{ ok: true; description: string | null } | Fail> {
    const session = await getSession();
    if (!session?.id) return { error: 'Not signed in.' };

    const trimmed = text.trim();
    if (trimmed.length > MAX_LENGTH) {
        return {
            error: `Descriptions are limited to ${MAX_LENGTH} characters.`,
        };
    }
    const description = trimmed.length > 0 ? trimmed : null;

    try {
        await selfSetManualTimeDescription(
            session.id,
            manualTimeId,
            description,
        );
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not save the description. Please try again.' };
    }

    revalidateRunDetails([], [manualTimeId]);
    return { ok: true, description };
}

/** A moderator clearing the description on a manual time. */
export async function removeManualTimeDescriptionAction(
    gameSlug: string,
    manualTimeId: number,
    reason: string,
): Promise<{ ok: true } | Fail> {
    const guard = await requireModeratorWithGame(gameSlug);
    if ('error' in guard) return guard;

    try {
        await updateManualTime(guard.sessionId, guard.gameId, manualTimeId, {
            description: null,
            reason,
        });
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not remove the description. Please try again.' };
    }

    revalidateRunDetails([], [manualTimeId]);
    return { ok: true };
}

/** Revoke/restore descriptions from a manual time's page. */
export async function setManualTimeDescriptionRestrictionAction(
    gameSlug: string,
    manualTimeId: number,
    verb: 'revoke' | 'restore',
    reason: string,
): Promise<{ ok: true } | Fail> {
    const guard = await requireModeratorWithGame(gameSlug);
    if ('error' in guard) return guard;

    try {
        await updateManualTime(guard.sessionId, guard.gameId, manualTimeId, {
            descriptionRestriction: verb,
            reason,
        });
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return {
            error:
                verb === 'revoke'
                    ? 'Could not revoke descriptions. Please try again.'
                    : 'Could not restore descriptions. Please try again.',
        };
    }

    revalidateRunDetails([], [manualTimeId]);
    return { ok: true };
}

/**
 * A moderator clearing someone's description. The run keeps everything else;
 * the removed text survives in the mod log's `before`, which is what makes this
 * reversible by hand if it was a mistake.
 */
export async function removeDescriptionAction(
    gameSlug: string,
    runId: number,
    reason: string,
): Promise<{ ok: true } | Fail> {
    const guard = await requireModerator(gameSlug);
    if ('error' in guard) return guard;

    try {
        await editRun(guard.sessionId, runId, { description: null, reason });
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Could not remove the description. Please try again.' };
    }

    revalidateRunDetails([runId]);
    return { ok: true };
}

/**
 * Revoke or restore the runner's ability to write descriptions on the board
 * this run sits on. Scoped to the run's category: it does not follow them to
 * the game's other boards.
 */
export async function setDescriptionRestrictionAction(
    gameSlug: string,
    runId: number,
    verb: 'revoke' | 'restore',
    reason: string,
): Promise<{ ok: true; changed: boolean } | Fail> {
    const guard = await requireModerator(gameSlug);
    if ('error' in guard) return guard;

    let updated = false;
    try {
        const result = await editRun(guard.sessionId, runId, {
            descriptionRestriction: verb,
            reason,
        });
        updated = result.updated;
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return {
            error:
                verb === 'revoke'
                    ? 'Could not revoke descriptions. Please try again.'
                    : 'Could not restore descriptions. Please try again.',
        };
    }

    revalidateRunDetails([runId]);
    return { ok: true, changed: updated };
}

/** Shared signed-in + moderates-this-game gate for the moderator verbs. */
async function requireModerator(
    gameSlug: string,
): Promise<{ sessionId: string } | Fail> {
    const guard = await requireModeratorWithGame(gameSlug);
    return 'error' in guard ? guard : { sessionId: guard.sessionId };
}

/** As above, plus the numeric game id the manual-time routes are keyed by. */
async function requireModeratorWithGame(
    gameSlug: string,
): Promise<{ sessionId: string; gameId: number } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    return { sessionId: session.id, gameId: game.id };
}
