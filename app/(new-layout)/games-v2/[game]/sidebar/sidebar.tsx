import type { Race } from '~app/(new-layout)/races/races.types';
import type { GameSeriesSibling } from '~src/lib/game-mgmt';
import type { GameModerator } from '../../../../../types/board-claims.types';
import type {
    RecentPb,
    ResolvedCategory,
    UserRanking,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import type { YourStanding } from '../types';
import { AboutPanel } from './about-panel';
import { ActiveRacesPanel } from './active-races-panel';
import type { ActiveRunner } from './active-runners';
import { BoardStatsPanel } from './board-stats-panel';
import { LivePanel } from './live-panel';
import { ModeratorsPanel } from './moderators-panel';
import { MostActivePanel } from './most-active-panel';
import type { PbRankMap } from './pb-ranks';
import { RecentPbsPanel } from './recent-pbs-panel';
import { SeriesPanel } from './series-panel';
import styles from './sidebar.module.scss';
import { YourRunsPanel } from './your-runs-panel';

interface Props {
    game: { name: string; display: string };
    yourRuns: UserRanking[];
    /** Gaps for the open board; rides YourRunsPanel. */
    yourStanding?: YourStanding | null;
    recentPbs: RecentPb[];
    /** Most PBs in the last 30 days, derived from `recentPbs`. */
    activeRunners?: ActiveRunner[];
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
    /** Entry count of the board as currently viewed (leaderboard totalItems). */
    boardSize?: number | null;
    /** Board rank by run id for the recent PBs — see loadPbRanks. */
    pbRanks?: PbRankMap;
    /**
     * Every Featured category, so the game-wide Recent PBs panel can show each
     * PB in its own board's primary timing instead of always in RTA.
     */
    categories?: ResolvedCategory[];
}

/**
 * The game page's right rail.
 *
 * Order is by what a visitor can act on, and depth follows it: the three
 * panels that answer "what is happening / where do I stand / what just
 * happened" keep the raised board surface, and the reference panels below
 * them sit flat on the canvas. The rail used to be a stack of identically
 * raised boxes led by an empty one — see live-chip.tsx for where the empty
 * Live state went.
 */
export function Sidebar({
    game,
    yourRuns,
    yourStanding,
    recentPbs,
    activeRunners,
    claim,
    about,
    moderators,
    series,
    activeRaces,
    board,
    boardSize,
    pbRanks,
    categories,
}: Props) {
    return (
        <>
            <LivePanel gameDisplay={game.display} />
            <ActiveRacesPanel races={activeRaces ?? []} />
            <YourRunsPanel
                rankings={yourRuns}
                gameSlug={game.name}
                standing={yourStanding ?? null}
            />
            <RecentPbsPanel
                pbs={recentPbs}
                gameSlug={game.name}
                gameDisplay={game.display}
                categories={categories}
                activeCategoryId={board?.id ?? null}
                pbRanks={pbRanks}
            />
            {board && (
                <BoardStatsPanel category={board} boardSize={boardSize} flat />
            )}
            <MostActivePanel runners={activeRunners ?? []} flat />
            {series && (
                <SeriesPanel
                    seriesDisplay={series.display}
                    games={series.games}
                    flat
                />
            )}
            <ModeratorsPanel moderators={moderators ?? []} flat />
            <AboutPanel about={about ?? null} flat />
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
