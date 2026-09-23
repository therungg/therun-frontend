'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateBoardsForRuleScope } from '~src/lib/moderation/revalidate-boards';
import {
    getVerificationSettings,
    previewVerificationSettings,
    saveVerificationSettings,
} from '~src/lib/moderation/verification-settings';
import type {
    SaveSettingsInput,
    SaveVerificationSettingsResult,
    SettingsPreview,
    VerificationSettingsView,
} from '../../../../../../../../types/verification-settings.types';

/** `forbidden` marks a viewer who isn't a moderator of this game. */
type Fail = { error: string; forbidden?: boolean };

async function requireMod(
    gameSlug: string,
): Promise<{ sessionId: string; gameId: number; gameSlug: string } | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return {
            error: 'Not authorized to moderate this game.',
            forbidden: true,
        };
    }
    return { sessionId: session.id, gameId: game.id, gameSlug: game.name };
}

function fail(e: unknown, fallback: string): Fail {
    if (e instanceof ModError)
        return e.status === 403
            ? { error: e.message, forbidden: true }
            : { error: e.message };
    return { error: fallback };
}

export async function loadVerificationSettingsAction(
    gameSlug: string,
): Promise<{ ok: true; view: VerificationSettingsView } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            view: await getVerificationSettings(g.sessionId, g.gameId),
        };
    } catch (e) {
        return fail(e, 'Failed to load verification settings.');
    }
}

export async function previewVerificationSettingsAction(
    gameSlug: string,
    input: SaveSettingsInput,
): Promise<{ ok: true; preview: SettingsPreview } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            preview: await previewVerificationSettings(
                g.sessionId,
                g.gameId,
                input,
            ),
        };
    } catch (e) {
        return fail(e, 'Failed to preview these settings.');
    }
}

export async function saveVerificationSettingsAction(
    gameSlug: string,
    input: SaveSettingsInput,
): Promise<
    | {
          ok: true;
          view: VerificationSettingsView;
          videoRuleApplied: SaveVerificationSettingsResult['videoRuleApplied'];
      }
    | Fail
> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        const { videoRuleApplied, ...view } = await saveVerificationSettings(
            g.sessionId,
            g.gameId,
            input,
        );
        // Runs the rule just held or flagged change what the public board
        // shows, so drop its cached reads for the rule's scope.
        if (
            (videoRuleApplied?.hidden ?? 0) > 0 ||
            (videoRuleApplied?.flagged ?? 0) > 0
        ) {
            await revalidateBoardsForRuleScope(
                g.gameId,
                g.gameSlug,
                input.categoryId,
            );
        }
        return { ok: true, view, videoRuleApplied };
    } catch (e) {
        return fail(e, 'Failed to save these settings.');
    }
}
