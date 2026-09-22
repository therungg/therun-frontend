'use client';

import { useMemo } from 'react';
import type { Race } from '~app/(new-layout)/races/races.types';
import Link from '~src/components/link';
import { buildBoardHref } from '~src/lib/board-url';
import type { GameModerator } from '../../../../types/board-claims.types';
import type {
    PublicModLogPage,
    SelfAnonymizeState,
} from '../../../../types/moderation.types';
import type { ClaimCtaState } from './claim/claim-cta';
import { hasBuiltinFilters } from './filters/builtin-params';
import { BoardNavProvider, useBoardNavState } from './filters/use-board-nav';
import styles from './game-page.module.scss';
import { BoardMasthead } from './header/board-masthead';
import { CategoryBandHeader } from './header/category-band-header';
import { GameHero } from './header/game-hero';
import mastheadStyles from './header/masthead.module.scss';
import { ViewTabs } from './header/view-tabs';
import { formatSubcategoryKey, type LabelVariableDef } from './labels';
import { LeaderboardPager } from './leaderboard/leaderboard-pager';
import { ModerationLogView } from './leaderboard/moderation/moderation-log-view';
import { hasLevels } from './levels/order';
import { ImportSourceLine } from './shared/import-source-line';
import { Sidebar } from './sidebar/sidebar';
import { hasStandings, hasStats } from './standings/order';
import { SubmitDialogProvider } from './submit-dialog/submit-dialog-context';
import { SubmitLink } from './submit-dialog/submit-link';
import type { GamePageData } from './types';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    /** Admins only — RunnerDialog's "Entire site" scope in the row menu. */
    canSiteBan?: boolean;
    claim?: ClaimCtaState | null;
    moderators?: GameModerator[];
    activeRaces?: Race[];
    /** Game has finished races — the Races tab on a single-board game. */
    showRaces?: boolean;
    /** 'moderation' -> render the public Moderation tab instead of the board. */
    view?: 'board' | 'moderation';
    /** First page of the public mod-log, fetched only when `view === 'moderation'`. */
    initialModLog?: PublicModLogPage | null;
    /**
     * The signed-in visitor's own anonymize state in this game (null when
     * signed out). Read in `page.tsx` rather than `loadGamePageData` because
     * it needs the session's bearer token, which the page data loader — a
     * public, cache-shared read keyed only by slug + filters — deliberately
     * never sees. Threaded straight to the pager, which owns the un-hide
     * affordance; see its `selfHidden` prop for why that can't live on a row.
     */
    selfHidden?: SelfAnonymizeState | null;
    /** The page's own query string, so a `?submit=1` deep link opens on arrival. */
    initialSearch: string;
}

export function GamePage({
    data,
    canManage,
    canManageRuns,
    canSiteBan = false,
    claim,
    moderators,
    activeRaces,
    showRaces = false,
    view = 'board',
    initialModLog,
    selfHidden = null,
    initialSearch,
}: Props) {
    const variableKeys = useMemo(
        () => data.variables.map((v) => v.nameNormalized),
        [data.variables],
    );
    // Single owner of every board-URL-push transition (category/subcategory
    // pills, verified toggle, Filters popover) — see use-board-nav.ts.
    // Hooks run unconditionally, so this is created even on the
    // no-categories-yet branch below, where nothing consumes it.
    const boardNav = useBoardNavState();

    if (data.categories.length === 0) {
        return (
            <SubmitDialogProvider
                game={data.game}
                coverUrl={data.gameMeta.coverUrl}
                categories={[]}
                groups={data.groups}
                gameRules={data.gameMeta.gameRules}
                emulatorPolicy={data.gameMeta.emulatorPolicy}
                canModerate={canManageRuns}
                sessionUsername={data.sessionUsername}
                initialSearch={initialSearch}
            >
                <div>
                    <GameHero
                        game={data.game}
                        stats={data.quickStats}
                        gameMeta={data.gameMeta}
                        categorySlug={null}
                        subcategoryKey=""
                        canManage={canManage}
                        canModerate={canManageRuns}
                        claim={claim}
                    />
                    <div className={styles.notice}>
                        <p className="text-muted mb-0">
                            No runs uploaded for this game yet.
                        </p>
                        <SubmitLink
                            gameSlug={data.game.name}
                            className={`${styles.primaryAction} mt-3`}
                        >
                            Submit the first run
                        </SubmitLink>
                    </div>
                </div>
            </SubmitDialogProvider>
        );
    }

    // The category wall only exists as a route when 2+ full-game boards are
    // featured (`hasStandings`, the threshold decideGameRootView applies) —
    // a single-board game goes straight to its board, where "All categories"
    // would just reload this same page.
    const wallExists = hasStandings(data.categories, data.groups);
    // An extensions board goes back to the extensions, not to the game's own
    // wall: that is where it came from and where its neighbours are.
    const backToWall = data.onExtensions
        ? {
              href: `/games/${encodeURIComponent(data.game.name)}/extensions`,
              label: 'Category Extensions',
          }
        : wallExists
          ? {
                // Asks for the wall by name rather than linking the bare
                // root. A game whose landing view is one of its own boards
                // resolves the root to that board, so the bare link put you
                // back on the board you were trying to leave — the wall was
                // unreachable on exactly the games that had chosen not to
                // open on it.
                href: buildBoardHref(data.game.name, { view: 'categories' }),
                label: 'All categories',
            }
          : undefined;

    const subcategoryKey = data.activeFilters.combined
        ? ''
        : Object.keys(data.activeFilters.subcategoryValues)
              .sort()
              .map((k) => `${k}=${data.activeFilters.subcategoryValues[k]}`)
              .join('|');
    const showMilliseconds = data.selectedCategory.showMilliseconds ?? true;
    // One platform on the whole category is not information — every row would
    // repeat it — so the column only earns its width once the board has runs
    // from more than one.
    const showPlatform = (data.facets.platforms ?? []).length > 1;
    // Restricts an entry's own `variables` map down to subcategory-role
    // keys, so row-level "Correct this time" links carry that row's own
    // subcategory rather than any board-level filter/variable noise.
    const subcategoryDefKeys = data.variables
        .filter((v) => v.role === 'subcategory')
        .map((v) => v.nameNormalized);

    // Whether the board is narrowed by any user-set filter — drives the empty
    // state copy ("no runs match these filters" vs "no runs on this board
    // yet"). Mirrors exactly what ClearFiltersButton would clear from the URL
    // (page included — a deep link to page 99 of an otherwise-unfiltered
    // board is still a filtered view, not an honestly-empty one).
    const filtersActive =
        data.activeFilters.verified ||
        data.activeFilters.combined ||
        Object.keys(data.activeFilters.subcategoryValues).length > 0 ||
        Object.keys(data.activeFilters.varFilters).length > 0 ||
        data.activeFilters.page > 1 ||
        hasBuiltinFilters(data.activeFilters.builtins);

    return (
        <SubmitDialogProvider
            game={data.game}
            coverUrl={data.gameMeta.coverUrl}
            categories={data.categories}
            groups={data.groups}
            gameRules={data.gameMeta.gameRules}
            emulatorPolicy={data.gameMeta.emulatorPolicy}
            canModerate={canManageRuns}
            sessionUsername={data.sessionUsername}
            defaultCategorySlug={data.selectedCategory.name}
            defaultSubcategoryValues={data.activeFilters.subcategoryValues}
            initialSearch={initialSearch}
        >
            <BoardNavProvider value={boardNav}>
                <div>
                    <BoardMasthead
                        data={data}
                        canManage={canManage}
                        canManageRuns={canManageRuns}
                        claim={claim}
                        back={backToWall}
                        subcategoryKey={subcategoryKey}
                        view={view}
                    />
                    <div className={styles.grid}>
                        <div
                            className={`${styles.colMain} ${boardNav.isPending ? styles.colMainPending : ''}`}
                            // `pointer-events: none` (colMainPending) only stops
                            // pointer input — keyboard/AT users could still tab
                            // into the stale pager controls mid-navigation.
                            // `inert` (React 19) removes the whole region from
                            // the tab order and AT tree while a nav is pending;
                            // the controls inside are stale during the pend
                            // regardless, so going inert is harmless.
                            inert={boardNav.isPending}
                        >
                            {/* The same view switcher the category wall
                                shows. It used to render only on a game with
                                no wall (`!backToWall`), which meant the one
                                place people actually land — a board — was
                                also the only page on the game with no way to
                                reach Stats, Levels or Races except by going
                                back up to the wall first. Standings is
                                offered exactly when there is a wall to have
                                it, which is the same 2+-featured-boards test
                                `backToWall` was standing in for. */}
                            <ViewTabs
                                gameSlug={data.game.name}
                                showRaces={showRaces}
                                showLevels={hasLevels(
                                    data.categories,
                                    data.groups,
                                )}
                                showStandings={wallExists}
                                showStats={hasStats(data.categories)}
                                showExtensions={data.showExtensions}
                                onExtensions={data.onExtensions}
                            />
                            {view === 'moderation' ? (
                                <ModerationLogView
                                    gameId={data.game.id}
                                    gameSlug={data.game.name}
                                    categories={data.categories}
                                    canManage={canManageRuns}
                                    initial={
                                        initialModLog ?? {
                                            items: [],
                                            total: 0,
                                            limit: 25,
                                            offset: 0,
                                            hasMore: false,
                                        }
                                    }
                                />
                            ) : (
                                <>
                                    {/* The board's own header: the category
                                        named as the subject, its stats, and
                                        its record in gold mono — a separate
                                        band directly above the board, under
                                        the game/selector topbar. */}
                                    <CategoryBandHeader
                                        data={data}
                                        showMilliseconds={showMilliseconds}
                                    />
                                    {data.invalidCombination ? (
                                        <InvalidCombinationNotice
                                            gameSlug={data.game.name}
                                            categorySlug={
                                                data.selectedCategory.name
                                            }
                                            suggestions={
                                                data.invalidCombination
                                                    .validCombinations
                                            }
                                            defs={data.variables}
                                        />
                                    ) : (
                                        <LeaderboardPager
                                            key={`${data.selectedCategory.id}|${subcategoryKey}|${JSON.stringify(data.activeFilters.varFilters)}|${data.activeFilters.combined}|${data.activeFilters.verified}|${JSON.stringify(data.activeFilters.builtins)}`}
                                            initial={data.leaderboard}
                                            query={{
                                                gameSlug: data.game.name,
                                                categorySlug:
                                                    data.selectedCategory.name,
                                                timing: data.activeFilters
                                                    .timing,
                                                subcategoryValues:
                                                    data.activeFilters
                                                        .subcategoryValues,
                                                combined:
                                                    data.activeFilters.combined,
                                                varFilters:
                                                    data.activeFilters
                                                        .varFilters,
                                                verified:
                                                    data.activeFilters.verified,
                                                video:
                                                    data.activeFilters.builtins
                                                        .video ?? undefined,
                                                from:
                                                    data.activeFilters.builtins
                                                        .from ?? undefined,
                                                to:
                                                    data.activeFilters.builtins
                                                        .to ?? undefined,
                                                country:
                                                    data.activeFilters.builtins
                                                        .country ?? undefined,
                                                playedon:
                                                    data.activeFilters.builtins
                                                        .playedon.length > 0
                                                        ? data.activeFilters
                                                              .builtins.playedon
                                                        : undefined,
                                                pageSize:
                                                    data.activeFilters.pageSize,
                                                sort: data.activeFilters.sort,
                                                dir: data.activeFilters.dir,
                                            }}
                                            sessionUsername={
                                                data.sessionUsername
                                            }
                                            canManage={canManageRuns}
                                            canSiteBan={canSiteBan}
                                            gameSlug={data.game.name}
                                            gameId={data.game.id}
                                            gameDisplay={data.game.display}
                                            selfHidden={selfHidden}
                                            variableKeys={variableKeys}
                                            // The clock actually ranking this
                                            // render, not the category's
                                            // configured one: the table
                                            // derives column order and the
                                            // "Ranked" tag from this, so a
                                            // ?timing= override moves both.
                                            primaryTiming={
                                                data.activeFilters.timing
                                            }
                                            defaultTiming={
                                                data.selectedCategory
                                                    .primaryTiming
                                            }
                                            gameTimeLabel={
                                                data.selectedCategory
                                                    .gameTimeLabel ?? 'igt'
                                            }
                                            filtersActive={filtersActive}
                                            showMilliseconds={showMilliseconds}
                                            showPlatform={showPlatform}
                                            categorySlug={
                                                data.selectedCategory.name
                                            }
                                            categoryDisplay={
                                                data.selectedCategory.display
                                            }
                                            categoryId={
                                                data.selectedCategory.id
                                            }
                                            requireVideo={
                                                data.selectedCategory
                                                    .requireVideo ?? false
                                            }
                                            subcategoryKey={subcategoryKey}
                                            subcategoryDefKeys={
                                                subcategoryDefKeys
                                            }
                                            rtaFallback={
                                                data.selectedCategory
                                                    .rtaFallback ?? false
                                            }
                                            variableDefs={data.variables}
                                            selectedVarFilters={
                                                data.activeFilters.varFilters
                                            }
                                            builtins={
                                                data.activeFilters.builtins
                                            }
                                            facets={data.facets}
                                        />
                                    )}
                                    {/* Second home for the source line. The
                                        rules dialog is the primary one, but a
                                        board with no rules written at all
                                        never renders that pill — and the
                                        attribution is owed for the runs in
                                        the table either way. */}
                                    <ImportSourceLine
                                        provenance={
                                            data.gameMeta.importProvenance
                                        }
                                        categoryId={data.selectedCategory.id}
                                        placement="footer"
                                    />
                                </>
                            )}
                        </div>
                        <aside className={styles.rail}>
                            <Sidebar
                                game={data.game}
                                yourRuns={data.yourRuns}
                                yourStanding={data.yourStanding}
                                recentPbs={data.recentPbs}
                                activeRunners={data.activeRunners}
                                claim={claim}
                                moderators={moderators}
                                activeRaces={activeRaces}
                                series={{
                                    display: data.gameMeta.seriesDisplay,
                                    games: data.gameMeta.seriesGames,
                                }}
                                board={data.selectedCategory}
                                boardSize={data.leaderboard?.totalItems ?? null}
                                pbRanks={data.pbRanks}
                                categories={data.categories}
                                about={
                                    data.gameMeta.summaryOverride ??
                                    data.gameMeta.summary
                                }
                            />
                        </aside>
                    </div>
                </div>
            </BoardNavProvider>
        </SubmitDialogProvider>
    );
}

function InvalidCombinationNotice({
    gameSlug,
    categorySlug,
    suggestions,
    defs,
}: {
    gameSlug: string;
    categorySlug: string;
    suggestions: string[];
    defs: LabelVariableDef[];
}) {
    return (
        <div className={styles.notice}>
            <h3 className="h5 mb-2">No leaderboard for this combination</h3>
            <p className="text-muted small">
                The variable combination you picked isn’t an active board for
                this category. Try one of these instead:
            </p>
            <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                {suggestions.slice(0, 12).map((key) => (
                    <Link
                        key={key}
                        href={buildBoardHref(gameSlug, {
                            categorySlug,
                            subcategoryKey: key,
                        })}
                        className={mastheadStyles.chip}
                    >
                        {formatSubcategoryKey(key, defs)}
                    </Link>
                ))}
            </div>
        </div>
    );
}
