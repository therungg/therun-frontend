'use client';

import { useMemo } from 'react';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { MinimumsSection } from '../minimums/minimums-section';
import { TimingSettingsSection } from '../timing/timing-settings-section';
import type { ManagePageData } from '../types';
import { CombinationsSection } from '../variables/combinations-section';
import { VariablesSection } from '../variables/variables-section';
import { CategoryHeaderStrip } from './category-header-strip';
import { CategoryRail } from './category-rail';
import { CategorySettingsSection } from './category-settings-section';
import { RulesSection } from './rules-section';

interface Props {
    data: ManagePageData;
    rows: ManageCategoryRow[];
    selectedCategoryId: number;
    onSelectCategory: (id: number) => void;
    onVisibilityChange?: (
        categoryId: number,
        patch: { isMain?: boolean; active?: boolean },
    ) => void;
}

export function CategoryTab({
    data,
    rows,
    selectedCategoryId,
    onSelectCategory,
    onVisibilityChange,
}: Props) {
    const selected: ResolvedCategory | null = useMemo(
        () => data.categories.find((c) => c.id === selectedCategoryId) ?? null,
        [data.categories, selectedCategoryId],
    );

    if (data.categories.length === 0) {
        return (
            <p className="text-center text-muted my-5">
                No categories to edit yet. Add one from the Game tab.
            </p>
        );
    }

    return (
        <div className="row g-3">
            <div className="col-12 col-md-4 col-lg-3">
                <CategoryRail
                    rows={rows}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={onSelectCategory}
                />
            </div>
            <div className="col-12 col-md-8 col-lg-9">
                {selected ? (
                    <>
                        <CategoryHeaderStrip
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            category={selected}
                            row={rows.find((r) => r.id === selected.id)}
                            onVisibilityChange={onVisibilityChange}
                        />
                        <TimingSettingsSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            category={selected}
                        />
                        <RulesSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            category={selected}
                        />
                        <CategorySettingsSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            category={selected}
                        />
                        <VariablesSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            selectedCategory={selected}
                        />
                        <CombinationsSection
                            gameSlug={data.game.name}
                            gameId={data.game.id}
                            selectedCategory={selected}
                        />
                        <MinimumsSection
                            data={data}
                            selectedCategory={selected}
                        />
                    </>
                ) : (
                    <p className="text-muted">
                        Pick a category from the list to edit.
                    </p>
                )}
            </div>
        </div>
    );
}
