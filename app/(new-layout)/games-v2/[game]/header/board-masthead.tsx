'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClaimCtaState } from '../claim/claim-cta';
import { hasBuiltinFilters } from '../filters/builtin-params';
import { FilterBar } from '../filters/filter-bar';
import type { GamePageData } from '../types';
import { AccentFromCover } from './accent-from-cover';
import { effectiveSubcategoryLabel } from './board-identity';
import { CategoryRail } from './category-rail';
import { computeCategoryVisibility } from './category-visibility';
import { GameHero } from './game-hero';
import styles from './masthead.module.scss';
import { StickyBoardBar } from './sticky-board-bar';

interface Props {
    data: GamePageData;
    canManage: boolean;
    canManageRuns: boolean;
    claim?: ClaimCtaState | null;
    back?: { href: string; label: string };
    /** The board's active subcategory key, used for submit-link context only — never displayed. */
    subcategoryKey: string;
}

export function BoardMasthead({
    data,
    canManage,
    canManageRuns,
    claim,
    back,
    subcategoryKey,
}: Props) {
    const category = data.selectedCategory;
    const suffix = effectiveSubcategoryLabel(
        data.variables,
        data.activeFilters.subcategoryValues,
    );
    const boardName = suffix
        ? `${category.display} · ${suffix}`
        : category.display;
    const variableKeys = data.variables.map((v) => v.nameNormalized);

    // Mirrors each child's own null-render condition so an empty plate
    // section (bare hairline + padding, nothing inside) never shows —
    // the components stayed the source of truth, this just decides
    // whether to render *their wrapper*.
    const { sections: categorySections, levels } = useMemo(
        () =>
            computeCategoryVisibility(
                data.categories,
                data.groups,
                data.game.categoryDisplayMode,
                category.name,
            ),
        [
            data.categories,
            data.groups,
            data.game.categoryDisplayMode,
            category.name,
        ],
    );
    const showCategoryRail =
        (categorySections.length > 0 &&
            !(
                categorySections.length === 1 &&
                categorySections[0].pills.length <= 1
            )) ||
        levels.groups.length > 0;

    const showFilterTier =
        data.variables.some((v) => v.role === 'subcategory') ||
        Object.keys(data.activeFilters.varFilters).length > 0 ||
        hasBuiltinFilters(data.activeFilters.builtins);

    // Band 2 exists only if it has content — a single-category game with no
    // filters renders no empty selector plate.
    const showSelectorBand = showCategoryRail || showFilterTier;

    // Owns the sentinel/observer (moved up from StickyBoardBar) so the plate
    // can react to `stuck` too: once the bar takes over, the plate's rail
    // must stop being a second, off-screen, keyboard-reachable copy — see
    // the `inert` on the `.plateSection`s below.
    const [stuck, setStuck] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);
    // Accent target: AccentFromCover writes --board-accent(-soft) here.
    const plateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sentinel.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) =>
                setStuck(!e.isIntersecting && e.boundingClientRect.top < 0),
            { threshold: 0 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <>
            {/* The topbar: game overview (band 1) then the category selector
                (band 2). AccentFromCover writes --board-accent(-soft) to this
                wrapper; the game plate spends it as its flat 5% cover tint
                (system.md signature #4 — the plate's game-identity tint). */}
            <div className={styles.bands} ref={plateRef}>
                <AccentFromCover
                    coverUrl={data.gameMeta.coverUrl ?? data.game.image ?? null}
                    targetRef={plateRef}
                />
                {/* Band 1 — game overview. */}
                <div className={styles.gamePlate}>
                    <GameHero
                        variant="condensed"
                        game={data.game}
                        stats={data.quickStats}
                        gameMeta={data.gameMeta}
                        categorySlug={category.name}
                        subcategoryKey={subcategoryKey}
                        canManage={canManage}
                        canModerate={canManageRuns}
                        claim={claim}
                        back={back}
                        standingsHref={
                            data.categories.length > 1
                                ? `/games-v2/${encodeURIComponent(data.game.name)}/standings`
                                : undefined
                        }
                    />
                </div>

                {/* Band 2 — the category selector: the rail, filter tier and
                    rules as hairline-divided sections. The category's own
                    header (name + record + stats) is a separate band rendered
                    directly above the board (see game-page.tsx). */}
                {showSelectorBand && (
                    <div className={styles.catPlate}>
                        {/* The public moderation log still lives at ?view=moderation
                    and is still linked from the board's own mod affordances —
                    it just no longer spends a header row on a tab pair. The
                    header is for choosing a board, and a second tab strip
                    directly above the category rail read as one more row of
                    the same undifferentiated stack. */}
                        {/* Category rail / filter tier / rules toggle — each its own
                    hairline-divided section of the same plate, not a second
                    stacked card.
                    `inert` (React 19) — same precedent as game-page.tsx's
                    colMain: pointer-events alone doesn't stop keyboard/AT
                    users reaching an off-screen duplicate once the sticky
                    bar is the interactive copy. CategoryRail and FilterBar
                    are off-screen-but-focusable while stuck, and tabbing
                    into either one triggers the browser's focus-into-view
                    scroll, which un-intersects the sentinel and unmounts
                    the bar mid-navigation. `inert` on each section makes
                    that section's subtree uninteractive/unfocusable for
                    descendants (there's no way for a child to opt back
                    in). */}
                        {showCategoryRail && (
                            <div className={styles.plateSection} inert={stuck}>
                                <CategoryRail
                                    categories={data.categories}
                                    groups={data.groups}
                                    selectedCategoryName={category.name}
                                    variableKeys={variableKeys}
                                    boardCounts={data.categoryBoardCounts}
                                    gameDisplayMode={
                                        data.game.categoryDisplayMode
                                    }
                                    levelTemplates={data.levelTemplates}
                                />
                            </div>
                        )}
                        {showFilterTier && (
                            <div className={styles.plateSection} inert={stuck}>
                                <FilterBar
                                    defs={data.variables}
                                    selectedSubcategoryValues={
                                        data.activeFilters.subcategoryValues
                                    }
                                    selectedVarFilters={
                                        data.activeFilters.varFilters
                                    }
                                    subcategoryValueCounts={
                                        data.subcategoryValueCounts
                                    }
                                    totalItems={data.leaderboard.totalItems}
                                    builtins={data.activeFilters.builtins}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div ref={sentinel} className={styles.sentinel} aria-hidden />
            {stuck && (
                <StickyBoardBar
                    coverUrl={data.gameMeta.coverUrl ?? data.game.image ?? null}
                    gameDisplay={data.game.display}
                    boardName={boardName}
                    categoryIconUrl={category.imageUrl}
                    categories={data.categories}
                    groups={data.groups}
                    selectedCategoryName={category.name}
                    variableKeys={variableKeys}
                    levelTemplates={data.levelTemplates}
                />
            )}
        </>
    );
}
