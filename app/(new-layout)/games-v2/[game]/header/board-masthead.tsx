'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClaimCtaState } from '../claim/claim-cta';
import { FilterBar } from '../filters/filter-bar';
import { RulesPanel } from '../rules/rules-panel';
import type { GamePageData } from '../types';
import { AccentFromCover } from './accent-from-cover';
import { effectiveSubcategoryLabel } from './board-identity';
import { CategoryRail } from './category-rail';
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
    rulesOpen: boolean;
    onToggleRules: () => void;
    onOpenHistory: () => void;
}

export function BoardMasthead({
    data,
    canManage,
    canManageRuns,
    claim,
    back,
    subcategoryKey,
    rulesOpen,
    onToggleRules,
    onOpenHistory,
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

    // Owns the sentinel/observer (moved up from StickyBoardBar) so the plate
    // can react to `stuck` too: once the bar takes over, the plate's rail
    // must stop being a second, off-screen, keyboard-reachable copy — see
    // the `inert` on `.railCard` below.
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
            <div className={styles.plate} ref={plateRef}>
                <AccentFromCover
                    coverUrl={data.gameMeta.coverUrl ?? data.game.image ?? null}
                    targetRef={plateRef}
                />
                <div className={styles.plateTop}>
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
                                ? `/games-v2/${data.game.name}/standings`
                                : undefined
                        }
                    />
                </div>
            </div>

            {/* Standalone selector card — deliberately OUTSIDE the plate:
                the header is game identity, this is navigation. */}
            <div
                // `inert` (React 19) — same precedent as
                // game-page.tsx's colMain: pointer-events alone doesn't
                // stop keyboard/AT users reaching an off-screen
                // duplicate once the sticky bar is the interactive
                // copy. CategoryRail and FilterBar are
                // off-screen-but-focusable while stuck, and tabbing
                // into either one triggers the browser's
                // focus-into-view scroll, which un-intersects the
                // sentinel and unmounts the bar mid-navigation.
                // `inert` on the parent makes the whole subtree
                // uninteractive/unfocusable for descendants (there's no
                // way for a child to opt back in).
                className={styles.railCard}
                inert={stuck}
            >
                <CategoryRail
                    categories={data.categories}
                    groups={data.groups}
                    selectedCategoryName={category.name}
                    variableKeys={variableKeys}
                />
                <FilterBar
                    defs={data.variables}
                    selectedSubcategoryValues={
                        data.activeFilters.subcategoryValues
                    }
                    selectedVarFilters={data.activeFilters.varFilters}
                />
                <RulesPanel
                    rules={category.rules}
                    open={rulesOpen}
                    onToggle={onToggleRules}
                />
            </div>
            <div ref={sentinel} className={styles.sentinel} aria-hidden />
            {stuck && (
                <StickyBoardBar
                    coverUrl={data.gameMeta.coverUrl ?? data.game.image ?? null}
                    gameDisplay={data.game.display}
                    boardName={boardName}
                    onOpenHistory={onOpenHistory}
                    categories={data.categories}
                    groups={data.groups}
                    selectedCategoryName={category.name}
                    variableKeys={variableKeys}
                />
            )}
        </>
    );
}
