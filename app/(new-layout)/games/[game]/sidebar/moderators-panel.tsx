import { UserLink } from '~src/components/links/links';
import type { GameModerator } from '../../../../../types/board-claims.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import { RunnerAvatar } from '../leaderboard/runner-avatar';
import styles from './sidebar.module.scss';

const MAX_SHOWN = 8;

const ROLE_RANK: Record<GameModerator['role'], number> = {
    'game-admin': 0,
    'game-mod': 1,
    'game-verifier': 2,
};

/**
 * Who runs this board — the trust signal a leaderboard needs at its foot:
 * runs are only as credible as the people verifying them. Renders nothing on
 * unmoderated games (the claim CTA covers that state). Applying to join
 * the team sits under the team.
 */
export function ModeratorsPanel({
    moderators,
    claim,
    gameDisplay,
}: {
    moderators: GameModerator[];
    claim?: ClaimCtaState | null;
    gameDisplay: string;
}) {
    if (moderators.length === 0) return null;
    // Array.sort is stable, so the API's order holds within each tier.
    const team = [...moderators].sort(
        (a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role],
    );
    const shown = team.slice(0, MAX_SHOWN);
    const overflow = team.length - shown.length;

    return (
        <section className={styles.panel}>
            <span className={`${styles.eyebrow} d-block mb-2`}>Moderators</span>
            <ul className="list-unstyled mb-0">
                {shown.map((m) => (
                    <li key={m.assignmentId} className={styles.row}>
                        <span className={styles.rowUser}>
                            <RunnerAvatar
                                name={m.username}
                                picture={m.picture}
                                size="xs"
                            />
                            <UserLink
                                username={m.username}
                                url={undefined}
                                to="leaderboards"
                            />
                        </span>
                        {m.role === 'game-admin' && (
                            <span className={styles.rowMeta}>admin</span>
                        )}
                        {m.role === 'game-verifier' && (
                            <span className={styles.rowMeta}>verifier</span>
                        )}
                    </li>
                ))}
            </ul>
            {overflow > 0 && (
                <p className={`${styles.rowMeta} mb-0`}>+{overflow} more</p>
            )}
            {claim && (
                <div className={styles.claimRow}>
                    <ClaimCta
                        claim={claim}
                        gameDisplay={gameDisplay}
                        triggerClassName={styles.claimAction}
                    />
                </div>
            )}
        </section>
    );
}
