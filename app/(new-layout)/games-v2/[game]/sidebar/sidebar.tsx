import type { BoardWeeklyActivity } from '~src/lib/board-activity';
import type { GameModerator } from '../../../../../types/board-claims.types';
import type {
    RecentPb,
    ResolvedCategory,
    UserRanking,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import { AboutPanel } from './about-panel';
import { BoardStatsPanel } from './board-stats-panel';
import { LivePanel } from './live-panel';
import { ModeratorsPanel } from './moderators-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import styles from './sidebar.module.scss';
import { YourRunsPanel } from './your-runs-panel';

interface Props {
    game: { name: string; display: string };
    yourRuns: UserRanking[];
    recentPbs: RecentPb[];
    claim?: ClaimCtaState | null;
    about?: string | null;
    moderators?: GameModerator[];
    /** The active board — board view only; the overview has none. */
    board?: ResolvedCategory | null;
    boardActivity?: BoardWeeklyActivity[] | null;
}

export function Sidebar({
    game,
    yourRuns,
    recentPbs,
    claim,
    about,
    moderators,
    board,
    boardActivity,
}: Props) {
    return (
        <>
            <LivePanel gameDisplay={game.display} />
            {board && (
                <BoardStatsPanel
                    category={board}
                    activity={boardActivity ?? null}
                />
            )}
            <YourRunsPanel rankings={yourRuns} gameSlug={game.name} />
            <RecentPbsPanel pbs={recentPbs} gameSlug={game.name} />
            <ModeratorsPanel moderators={moderators ?? []} />
            <AboutPanel about={about ?? null} />
            {claim?.hasModerators && (
                <div className={styles.sidebarFoot}>
                    <ClaimCta
                        claim={claim}
                        gameDisplay={game.display}
                        triggerClassName={styles.quietLink}
                    />
                </div>
            )}
        </>
    );
}
