'use server';

import { getSession } from '~src/actions/session.action';
import { getGameMetadata } from '~src/lib/game-mgmt';
import { resolveGame } from '~src/lib/games-v1';
import { canConfigureGame } from '~src/lib/moderation/can-moderate';
import type { SelfVerify } from '../../../../../../../../types/leaderboards.types';
import { updateGameMetadataAction } from '../../../../setup/actions/update-game-metadata.action';

type Fail = { error: string };

/** Who may verify their own runs. Moderators read it; board admins save it. */
export async function loadSelfVerifyAction(
    gameSlug: string,
): Promise<{ gameId: number; selfVerify: SelfVerify } | Fail> {
    const session = await getSession();
    if (!canConfigureGame(session, gameSlug))
        return { error: 'Not authorized' };
    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found' };
    const meta = await getGameMetadata(game.id);
    return { gameId: game.id, selfVerify: meta.selfVerify };
}

export async function saveSelfVerifyAction(
    gameSlug: string,
    gameId: number,
    selfVerify: SelfVerify,
): Promise<{ ok: true } | Fail> {
    const res = await updateGameMetadataAction({
        gameSlug,
        gameId,
        selfVerify,
    });
    return 'error' in res ? res : { ok: true };
}
