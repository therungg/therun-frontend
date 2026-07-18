'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '~src/components/link';
import type { ClaimCtaState } from './claim/claim-cta';
import { FilterBar } from './filters/filter-bar';
import { FiltersPopover } from './filters/filters-popover';
import { VerifiedToggle } from './filters/verified-toggle';
import styles from './game-page.module.scss';
import { CategoryPills } from './header/category-pills';
import { GameHero } from './header/game-hero';
import { formatSubcategoryKey, type LabelVariableDef } from './labels';
import { LeaderboardPager } from './leaderboard/leaderboard-pager';
import { RulesBody, RulesPanel } from './rules/rules-panel';
import { Sidebar } from './sidebar/sidebar';
import type { GamePageData } from './types';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    claim?: ClaimCtaState | null;
}

function parseSubcategoryKey(key: string): Record<string, string> {
    if (!key) return {};
    const out: Record<string, string> = {};
    for (const pair of key.split('|')) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        out[pair.slice(0, eq)] = pair.slice(eq + 1);
    }
    return out;
}

export function GamePage({ data, canManage, canManageRuns, claim }: Props) {
    const variableKeys = useMemo(
        () => data.variables.map((v) => v.nameNormalized),
        [data.variables],
    );
    const [rulesOpen, setRulesOpen] = useState(false);
    useEffect(() => setRulesOpen(false), [data.selectedCategory.id]);

    if (data.categories.length === 0) {
        return (
            <div>
                <GameHero
                    game={data.game}
                    stats={data.quickStats}
                    category={null}
                    wrEntry={null}
                    boardIsEmpty={false}
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
                        className="btn btn-sm btn-primary mt-3"
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
    const subcategoryLabel = formatSubcategoryKey(
        subcategoryKey,
        data.variables,
    );
    const showMilliseconds = data.selectedCategory.showMilliseconds ?? true;

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
        <div>
            <GameHero
                game={data.game}
                stats={data.quickStats}
                category={data.selectedCategory}
                wrEntry={data.wrEntry}
                boardIsEmpty={data.boardIsEmpty}
                subcategoryKey={subcategoryKey}
                subcategoryLabel={subcategoryLabel}
                canManage={canManage}
                canModerate={canManageRuns}
                claim={claim}
                showMilliseconds={showMilliseconds}
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
                            selectedVarFilters={data.activeFilters.varFilters}
                        />
                        <RulesPanel
                            rules={data.selectedCategory.rules}
                            open={rulesOpen}
                            onToggle={() => setRulesOpen((o) => !o)}
                        />
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
            <div className={styles.grid}>
                <div className={styles.colMain}>
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
                            primaryTiming={data.selectedCategory.primaryTiming}
                            filtersActive={filtersActive}
                            showMilliseconds={showMilliseconds}
                        />
                    )}
                </div>
                <aside className={styles.rail}>
                    <Sidebar data={data} claim={claim} />
                </aside>
            </div>
        </div>
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
                {suggestions.slice(0, 12).map((key) => {
                    const values = parseSubcategoryKey(key);
                    const sp = new URLSearchParams();
                    sp.set('category', categorySlug);
                    for (const [k, v] of Object.entries(values)) sp.set(k, v);
                    return (
                        <Link
                            key={key}
                            href={`/games-v2/${gameSlug}?${sp.toString()}`}
                            className={styles.pill}
                        >
                            {formatSubcategoryKey(key, defs)}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
