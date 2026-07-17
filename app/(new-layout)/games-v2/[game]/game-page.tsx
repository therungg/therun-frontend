'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from '~src/components/link';
import type { ClaimCtaState } from './claim/claim-cta';
import { FilterBar } from './filters/filter-bar';
import { FiltersPopover } from './filters/filters-popover';
import styles from './game-page.module.scss';
import { CategoryPills } from './header/category-pills';
import { GameHero } from './header/game-hero';
import { formatSubcategoryKey, type LabelVariableDef } from './labels';
import { LeaderboardPager } from './leaderboard/leaderboard-pager';
import { RulesBody, RulesPanel } from './rules/rules-panel';
import { SelfClaimButton } from './self-claim-button';
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
                    leaderboard={null}
                    subcategoryKey=""
                    canManage={canManage}
                    canModerate={canManageRuns}
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

    return (
        <div>
            <GameHero
                game={data.game}
                stats={data.quickStats}
                category={data.selectedCategory}
                leaderboard={data.invalidCombination ? null : data.leaderboard}
                subcategoryKey={subcategoryKey}
                canManage={canManage}
                canModerate={canManageRuns}
                selfClaim={
                    data.sessionUsername ? (
                        <SelfClaimButton
                            gameId={data.game.id}
                            categories={data.categories.map((c) => ({
                                id: c.id,
                                display: c.display,
                            }))}
                            defaultCategoryId={data.selectedCategory.id}
                        />
                    ) : null
                }
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
                        <FiltersPopover
                            defs={data.variables}
                            selectedVarFilters={data.activeFilters.varFilters}
                            verified={data.activeFilters.verified}
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
