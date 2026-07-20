'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import Link from '~src/components/link';
import { buildBoardHref } from '~src/lib/board-url';
import type { ClaimCtaState } from './claim/claim-cta';
import { FilterBar } from './filters/filter-bar';
import { FiltersPopover } from './filters/filters-popover';
import { BoardNavProvider, useBoardNavState } from './filters/use-board-nav';
import { VerifiedToggle } from './filters/verified-toggle';
import styles from './game-page.module.scss';
import { CategoryPills } from './header/category-pills';
import { GameHero } from './header/game-hero';
import { formatSubcategoryKey, type LabelVariableDef } from './labels';
import { LeaderboardPager } from './leaderboard/leaderboard-pager';
import { RulesBody, RulesPanel } from './rules/rules-panel';
import { Sidebar } from './sidebar/sidebar';
import type { GamePageData } from './types';

const WrHistoryDrawer = dynamic(
    () => import('./drawers/wr-history-drawer').then((m) => m.WrHistoryDrawer),
    { ssr: false },
);

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    claim?: ClaimCtaState | null;
}

export function GamePage({ data, canManage, canManageRuns, claim }: Props) {
    const variableKeys = useMemo(
        () => data.variables.map((v) => v.nameNormalized),
        [data.variables],
    );
    const [rulesOpen, setRulesOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    useEffect(() => setRulesOpen(false), [data.selectedCategory.id]);
    useEffect(() => setHistoryOpen(false), [data.selectedCategory.id]);
    // Single owner of every board-URL-push transition (category/subcategory
    // pills, verified toggle, Filters popover) — see use-board-nav.ts.
    // Hooks run unconditionally, so this is created even on the
    // no-categories-yet branch below, where nothing consumes it.
    const boardNav = useBoardNavState();

    if (data.categories.length === 0) {
        return (
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
                    <Link
                        href={`/games-v2/${data.game.name}/submit`}
                        className={`${styles.primaryAction} mt-3`}
                    >
                        Submit the first run
                    </Link>
                </div>
            </div>
        );
    }

    const subcategoryKey = data.activeFilters.combined
        ? ''
        : Object.keys(data.activeFilters.subcategoryValues)
              .sort()
              .map((k) => `${k}=${data.activeFilters.subcategoryValues[k]}`)
              .join('|');
    const showMilliseconds = data.selectedCategory.showMilliseconds ?? true;
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
        data.activeFilters.page > 1;

    return (
        <BoardNavProvider value={boardNav}>
            <div>
                <GameHero
                    game={data.game}
                    stats={data.quickStats}
                    gameMeta={data.gameMeta}
                    categorySlug={data.selectedCategory.name}
                    subcategoryKey={subcategoryKey}
                    canManage={canManage}
                    canModerate={canManageRuns}
                    claim={claim}
                />
                <div className={styles.band}>
                    <div className={styles.bandRow}>
                        <CategoryPills
                            categories={data.categories}
                            groups={data.groups}
                            selectedCategoryName={data.selectedCategory.name}
                            variableKeys={variableKeys}
                        />
                        <div className={styles.bandEnd}>
                            <VerifiedToggle
                                verified={data.activeFilters.verified}
                            />
                            <FiltersPopover
                                defs={data.variables}
                                selectedVarFilters={
                                    data.activeFilters.varFilters
                                }
                            />
                            <RulesPanel
                                rules={data.selectedCategory.rules}
                                open={rulesOpen}
                                onToggle={() => setRulesOpen((o) => !o)}
                            />
                            <button
                                type="button"
                                className={styles.quietLink}
                                onClick={() => setHistoryOpen(true)}
                            >
                                WR history
                            </button>
                        </div>
                    </div>
                    <FilterBar
                        defs={data.variables}
                        selectedSubcategoryValues={
                            data.activeFilters.subcategoryValues
                        }
                        selectedVarFilters={data.activeFilters.varFilters}
                    />
                </div>
                {rulesOpen && data.selectedCategory.rules && (
                    <RulesBody rules={data.selectedCategory.rules} />
                )}
                {historyOpen && (
                    <WrHistoryDrawer
                        show={historyOpen}
                        onHide={() => setHistoryOpen(false)}
                        gameSlug={data.game.name}
                        categorySlug={data.selectedCategory.name}
                        categoryDisplay={data.selectedCategory.display}
                        subcategoryKey={subcategoryKey}
                        showMilliseconds={showMilliseconds}
                    />
                )}
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
                        {data.invalidCombination ? (
                            <InvalidCombinationNotice
                                gameSlug={data.game.name}
                                categorySlug={data.selectedCategory.name}
                                suggestions={
                                    data.invalidCombination.validCombinations
                                }
                                defs={data.variables}
                            />
                        ) : (
                            <LeaderboardPager
                                key={`${data.selectedCategory.id}|${subcategoryKey}|${JSON.stringify(data.activeFilters.varFilters)}|${data.activeFilters.combined}|${data.activeFilters.verified}`}
                                initial={data.leaderboard}
                                query={{
                                    gameSlug: data.game.name,
                                    categorySlug: data.selectedCategory.name,
                                    timing: data.selectedCategory.primaryTiming,
                                    subcategoryValues:
                                        data.activeFilters.subcategoryValues,
                                    combined: data.activeFilters.combined,
                                    varFilters: data.activeFilters.varFilters,
                                    verified: data.activeFilters.verified,
                                    pageSize: data.activeFilters.pageSize,
                                }}
                                sessionUsername={data.sessionUsername}
                                canManage={canManageRuns}
                                gameSlug={data.game.name}
                                variableKeys={variableKeys}
                                primaryTiming={
                                    data.selectedCategory.primaryTiming
                                }
                                filtersActive={filtersActive}
                                showMilliseconds={showMilliseconds}
                                categorySlug={data.selectedCategory.name}
                                subcategoryKey={subcategoryKey}
                                subcategoryDefKeys={subcategoryDefKeys}
                            />
                        )}
                    </div>
                    <aside className={styles.rail}>
                        <Sidebar data={data} claim={claim} />
                    </aside>
                </div>
            </div>
        </BoardNavProvider>
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
                The variable combination you picked isn't an active board for
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
                        className={styles.pill}
                    >
                        {formatSubcategoryKey(key, defs)}
                    </Link>
                ))}
            </div>
        </div>
    );
}
