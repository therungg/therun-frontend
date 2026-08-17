import type { Race } from '~app/(new-layout)/races/races.types';
import type { GameMetadata, GameSeriesSibling } from '~src/lib/game-mgmt';
import type { GameModerator } from '../../../../../types/board-claims.types';
import type {
    RecentPb,
    ResolvedCategory,
    UserRanking,
} from '../../../../../types/leaderboards.types';
import type { ClaimCtaState } from '../claim/claim-cta';
import type { LabelVariableDef } from '../labels';
import { ActiveRacesPanel } from './active-races-panel';
import { BoardStatsPanel } from './board-stats-panel';
import { LivePanel } from './live-panel';
import { RailScopeProvider, ScopeSwitch } from './rail-scope-context';
import { RecentPbsPanel } from './recent-pbs-panel';
import { SeriesPanel } from './series-panel';
import styles from './sidebar.module.scss';
import { type TrustFacts, TrustFoot } from './trust-foot';
import { YourRunsPanel } from './your-runs-panel';

interface Props {
    game: { name: string; display: string };
    yourRuns: UserRanking[];
    recentPbs: RecentPb[];
    claim?: ClaimCtaState | null;
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
    /** Every Featured category: scoping, board links, and per-board timing. */
    categories?: ResolvedCategory[];
    /** The board's variable defs, so Your runs prints display values. */
    variableDefs?: LabelVariableDef[];
    /** Game facts for the trust foot. */
    gameMeta: Pick<
        GameMetadata,
        | 'platforms'
        | 'releaseYear'
        | 'companies'
        | 'igdbUrl'
        | 'summaryOverride'
    >;
}

/**
 * The board page's rail, in three zones of descending weight:
 *
 * 1. You: the signed-in runner's own standing (green-spined, first, so it's
 *    the first thing a runner sees about themselves).
 * 2. Pulse: what's happening now: live runs, races, recent PBs, this board's
 *    numbers. Scoped to the board on a board page.
 * 3. Trust: unboxed reference at the foot: game facts, moderators, links.
 *
 * On narrow screens the zones flow around the main column (see
 * game-page.module.scss `.rail`): You and Live above the board, the rest
 * below it.
 */
export function Sidebar({
    game,
    yourRuns,
    recentPbs,
    claim,
    moderators,
    series,
    activeRaces,
    board,
    boardSize,
    categories,
    variableDefs,
    gameMeta,
}: Props) {
    const facts: TrustFacts = {
        platforms: gameMeta.platforms,
        releaseYear: gameMeta.releaseYear,
        developer:
            gameMeta.companies.find((c) => c.isDeveloper)?.name ??
            gameMeta.companies[0]?.name ??
            null,
        igdbUrl: gameMeta.igdbUrl,
        description: gameMeta.summaryOverride,
    };

    return (
        <RailScopeProvider board={board}>
            <div className={styles.zoneTop}>
                <YourRunsPanel
                    rankings={yourRuns}
                    gameSlug={game.name}
                    variableDefs={variableDefs}
                />
                {board && <ScopeSwitch board={board} />}
                <LivePanel
                    gameDisplay={game.display}
                    gameSlug={game.name}
                    categories={categories ?? []}
                    board={board}
                />
                <ActiveRacesPanel races={activeRaces ?? []} />
            </div>
            <div className={styles.zoneRest}>
                <RecentPbsPanel
                    pbs={recentPbs}
                    gameSlug={game.name}
                    categories={categories}
                    board={board}
                />
                {board && (
                    <BoardStatsPanel category={board} boardSize={boardSize} />
                )}
                {series && (
                    <SeriesPanel
                        seriesDisplay={series.display}
                        games={series.games}
                    />
                )}
                <TrustFoot
                    gameDisplay={game.display}
                    facts={facts}
                    moderators={moderators ?? []}
                    claim={claim}
                />
            </div>
        </RailScopeProvider>
    );
}
