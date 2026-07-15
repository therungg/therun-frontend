import type { ReactNode } from 'react';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    canManage?: boolean;
    canModerate?: boolean;
    sessionUsername?: string | null;
    claim?: ClaimCtaState | null;
    selfClaim?: ReactNode;
}

export function GameHeader({
    game,
    stats,
    canManage,
    canModerate,
    sessionUsername,
    claim,
    selfClaim,
}: Props) {
    return (
        <header className={styles.header}>
            {game.image && (
                <img
                    src={game.image}
                    alt={game.display}
                    width={48}
                    height={64}
                    className={styles.cover}
                    loading="eager"
                />
            )}
            <div>
                <h1 className={styles.title}>{game.display}</h1>
                <div className={styles.metaLine}>
                    <span>{stats.uniqueRunners.toLocaleString()}</span> runners
                    ·{' '}
                    <span>
                        <DurationToFormatted duration={stats.totalRunTime} />
                    </span>{' '}
                    total
                </div>
            </div>
            {(sessionUsername || canManage || canModerate) && (
                <div className={styles.actions}>
                    {claim && sessionUsername && (
                        <ClaimCta claim={claim} gameDisplay={game.display} />
                    )}
                    {selfClaim}
                    {sessionUsername && (
                        <Link
                            href={`/games-v2/${game.name}/submit`}
                            className="btn btn-sm btn-primary"
                        >
                            Submit a run
                        </Link>
                    )}
                    {(canManage || canModerate) && (
                        // One entry into the unified admin console. It opens on
                        // the viewer's default pane (the moderation queue for
                        // moderators, game/category settings for config-only
                        // admins), so a single button serves both — labelled
                        // for whichever they primarily do.
                        <Link
                            href={`/games-v2/${game.name}/manage`}
                            className="btn btn-sm btn-outline-secondary"
                        >
                            {canModerate ? 'Moderate' : 'Manage'}
                        </Link>
                    )}
                </div>
            )}
        </header>
    );
}
