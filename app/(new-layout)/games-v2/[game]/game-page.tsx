'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { FilterBar } from './filters/filter-bar';
import { CategoryPills } from './header/category-pills';
import { GameHeader } from './header/game-header';
import { LeaderboardTable } from './leaderboard/leaderboard-table';
import { PaginationBar } from './leaderboard/pagination-bar';
import { RulesPanel } from './rules/rules-panel';
import { Sidebar } from './sidebar/sidebar';
import type { GamePageData } from './types';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
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

export function GamePage({ data, canManage, canManageRuns }: Props) {
    const variableKeys = useMemo(
        () => data.variables.map((v) => v.nameNormalized),
        [data.variables],
    );

    if (data.categories.length === 0) {
        return (
            <div>
                <GameHeader
                    game={data.game}
                    stats={data.quickStats}
                    canManage={canManage}
                    canModerate={canManageRuns}
                />
                <p className="text-center text-muted my-5">
                    No runs uploaded for this game yet.
                </p>
            </div>
        );
    }

    return (
        <div>
            <GameHeader
                game={data.game}
                stats={data.quickStats}
                canManage={canManage}
                canModerate={canManageRuns}
            />
            <CategoryPills
                categories={data.categories}
                groups={data.groups}
                selectedCategoryName={data.selectedCategory.name}
                variableKeys={variableKeys}
            />
            <div className="row">
                <div className="col-lg-8">
                    <FilterBar
                        defs={data.variables}
                        selectedSubcategoryValues={
                            data.activeFilters.subcategoryValues
                        }
                        selectedVarFilters={data.activeFilters.varFilters}
                        verified={data.activeFilters.verified}
                    />
                    <RulesPanel
                        rules={data.selectedCategory.rules}
                        categoryId={data.selectedCategory.id}
                    />
                    {data.invalidCombination ? (
                        <InvalidCombinationNotice
                            gameSlug={data.game.name}
                            categorySlug={data.selectedCategory.name}
                            suggestions={
                                data.invalidCombination.validCombinations
                            }
                        />
                    ) : (
                        <>
                            <LeaderboardTable
                                leaderboard={data.leaderboard}
                                sessionUsername={data.sessionUsername}
                                canManage={canManageRuns}
                                gameSlug={data.game.name}
                                variableKeys={variableKeys}
                            />
                            <PaginationBar
                                page={data.leaderboard.page}
                                totalPages={data.leaderboard.totalPages}
                            />
                        </>
                    )}
                </div>
                <div className="col-lg-4">
                    <Sidebar data={data} />
                </div>
            </div>
        </div>
    );
}

function InvalidCombinationNotice({
    gameSlug,
    categorySlug,
    suggestions,
}: {
    gameSlug: string;
    categorySlug: string;
    suggestions: string[];
}) {
    return (
        <div className="border rounded p-4 my-3 text-center">
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
                            className="btn btn-sm btn-outline-secondary"
                        >
                            {key.replace(/\|/g, ' · ')}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
