import { ShieldLock } from 'react-bootstrap-icons';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { getMyBoardClaim } from '~src/lib/board-claims';
import { listGameModerators } from '~src/lib/game-moderators';
import type { ResolvedGame } from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from './mod-door.module.scss';

interface Props {
    game: Pick<ResolvedGame, 'name' | 'display'>;
    /** null when the viewer is signed out. */
    claim: ClaimCtaState | null;
}

/**
 * Claim state for the door's CTA: whether this board already has
 * moderators (changes the CTA copy) and whether the viewer already has a
 * pending application (swaps the CTA for a pending note). Shared by the
 * console page and the legacy moderation redirect so both gates render
 * the identical door.
 */
export async function loadModDoorClaim(
    sessionId: string,
    gameId: number,
): Promise<ClaimCtaState> {
    const [mods, myClaim] = await Promise.all([
        listGameModerators(gameId).catch(() => []),
        getMyBoardClaim(sessionId, gameId).catch(() => null),
    ]);
    return {
        gameId,
        hasModerators: mods.length > 0,
        myClaimPending: myClaim?.status === 'pending',
    };
}

/**
 * Shown instead of a 404 when a signed-in user without mod rights (or a
 * signed-out visitor) hits the admin console. Recruits moderators rather
 * than dead-ending them.
 */
export function ModDoor({ game, claim }: Props) {
    return (
        <div className={styles.wrap}>
            <div className={styles.panel}>
                <ShieldLock size={28} className={styles.icon} aria-hidden />
                <p className={styles.eyebrow}>{game.display}</p>
                <h1 className={styles.title}>
                    You&rsquo;re not a moderator of this board.
                </h1>
                {claim ? (
                    <ClaimCta
                        claim={claim}
                        gameDisplay={game.display}
                        triggerClassName={styles.cta}
                    />
                ) : (
                    <div className={styles.signIn}>
                        <p className={styles.blurb}>
                            Sign in with Twitch to apply to moderate.
                        </p>
                        <TwitchLoginButton
                            url={`/games-v2/${game.name}/manage`}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
