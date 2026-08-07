import type { Race } from '~app/(new-layout)/races/races.types';
import type { GameSeriesSibling } from '~src/lib/game-mgmt';
import type { GameModerator } from '../../../../../types/board-claims.types';
import type {
    RecentPb,
    ResolvedCategory,
    UserRanking,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import { AboutPanel } from './about-panel';
import { ActiveRacesPanel } from './active-races-panel';
import { BoardStatsPanel } from './board-stats-panel';
import { LivePanel } from './live-panel';
import { ModeratorsPanel } from './moderators-panel';
import { RecentPbsPanel } from './recent-pbs-panel';
import { SeriesPanel } from './series-panel';
import styles from './sidebar.module.scss';
import { YourRunsPanel } from './your-runs-panel';

interface Props {
    game: { name: string; display: string };
    yourRuns: UserRanking[];
    recentPbs: RecentPb[];
    claim?: ClaimCtaState | null;
    about?: string | null;
    moderators?: GameModerator[];
    /** Series cross-navigation — empty until pageData carries seriesGames. */
    series?: {
        display: string | null;
        games: GameSeriesSibling[];
    };
    /** Active races for this game, fetched with the page. */
    activeRaces?: Race[];
    /** The active board — board view only; the overview has none. */
    board?: ResolvedCategory | null;
}

export function Sidebar({
    game,
    yourRuns,
    recentPbs,
    claim,
    about,
    moderators,
    series,
    activeRaces,
    board,
}: Props) {
    return (
        <>
            <LivePanel gameDisplay={game.display} />
            <ActiveRacesPanel races={activeRaces ?? []} />
            {board && <BoardStatsPanel category={board} />}
            <YourRunsPanel rankings={yourRuns} gameSlug={game.name} />
            <RecentPbsPanel pbs={recentPbs} gameSlug={game.name} />
            {series && (
                <SeriesPanel
                    seriesDisplay={series.display}
                    games={series.games}
                />
            )}
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
