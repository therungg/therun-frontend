import { loadRunnerSubmissionsAction } from '~src/actions/pb-submission.action';
import { getSession } from '~src/actions/session.action';
import { getGameDisplayById } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import {
    type LayerGame,
    type LayerViewer,
    OwnerLayerFeed,
} from './owner-layer-provider';

/** Games only runs off the boards are on, looked up for their name and art. */
const MAX_EXTRA_GAMES = 12;

async function extraGame(gameId: number): Promise<LayerGame | null> {
    const display = await getGameDisplayById(gameId).catch(() => null);
    if (!display) return null;
    const resolved = await resolveGame(display).catch(() => null);
    return {
        gameId,
        gameRef: resolved?.name ?? display,
        game: resolved?.display ?? display,
        imageUrl: resolved?.image ?? null,
    };
}

/**
 * Decides whether this viewer gets the runner's own layer: the runner
 * themself, an admin, or someone who moderates a game. The backend has the
 * final word — a 403 just means no layer. Lives inside a Suspense boundary so
 * the session read and the overview fetch never hold up the public page.
 */
export async function OwnerLayerGate({
    name,
    profileGameIds,
}: {
    name: string;
    /** Games the public profile already names. */
    profileGameIds: number[];
}) {
    const session = await getSession();
    if (!session?.id || !session.username) return null;
    const isOwner = session.username.toLowerCase() === name.toLowerCase();
    const isAdmin = session.roles?.includes('admin') ?? false;
    const moderates = (session.moderatedGames?.length ?? 0) > 0;
    if (!isOwner && !isAdmin && !moderates) return null;

    const res = await loadRunnerSubmissionsAction(name);
    if (!('ok' in res)) return null;
    const { overview } = res;

    const known = new Set(profileGameIds);
    const missing = [
        ...new Set(
            [...overview.items, ...overview.needsYou]
                .map((i) => i.gameId)
                .filter((id) => !known.has(id)),
        ),
    ].slice(0, MAX_EXTRA_GAMES);
    const extraGames = (await Promise.all(missing.map(extraGame))).filter(
        (g): g is LayerGame => g !== null,
    );

    const viewer: LayerViewer = isOwner ? 'owner' : 'mod';
    return <OwnerLayerFeed data={{ overview, viewer, extraGames }} />;
}
