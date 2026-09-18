'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    getVerificationSettings,
    previewVerificationSettings,
    saveVerificationSettings,
} from '~src/lib/moderation/verification-settings';
import type {
    SaveSettingsInput,
    SettingsPreview,
    VerificationSettingsView,
} from '../../../../../../../../types/verification-settings.types';

/** `forbidden` marks a viewer who isn't a moderator of this game. */
type Fail = { error: string; forbidden?: boolean };

async function requireMod(
    gameSlug: string,
): Promise<{ sessionId: string; gameId: number } | Fail> {
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
    return { sessionId: session.id, gameId: game.id };
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
): Promise<{ ok: true; view: VerificationSettingsView } | Fail> {
    const g = await requireMod(gameSlug);
    if ('error' in g) return g;
    try {
        return {
            ok: true,
            view: await saveVerificationSettings(g.sessionId, g.gameId, input),
        };
    } catch (e) {
        return fail(e, 'Failed to save these settings.');
    }
}
