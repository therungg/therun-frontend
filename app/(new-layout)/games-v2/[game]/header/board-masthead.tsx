'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '~src/components/link';
import { buildBoardHref } from '~src/lib/board-url';
import type { ClaimCtaState } from '../claim/claim-cta';
import { FilterBar } from '../filters/filter-bar';
import { RulesPanel } from '../rules/rules-panel';
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
    rulesOpen: boolean;
    onToggleRules: () => void;
    onOpenHistory: () => void;
    /** 'moderation' -> the Board/Moderation tab reads as on the Moderation side. */
    view?: 'board' | 'moderation';
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
    view = 'board',
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
    const { sections: categorySections } = useMemo(
        () => computeCategoryVisibility(data.categories, data.groups),
        [data.categories, data.groups],
    );
    const showCategoryRail =
        categorySections.length > 0 &&
        !(
            categorySections.length === 1 &&
            categorySections[0].pills.length <= 1
        );
    const showFilterTier =
        data.variables.some((v) => v.role === 'subcategory') ||
        Object.keys(data.activeFilters.varFilters).length > 0;
    const showRules =
        Boolean(category.rules?.trim()) ||
        Boolean(data.gameMeta.gameRules?.trim()) ||
        data.gameMeta.emulatorPolicy === 'allowed' ||
        data.gameMeta.emulatorPolicy === 'banned';

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
                                ? `/games-v2/${encodeURIComponent(data.game.name)}/standings`
                                : undefined
                        }
                    />
                </div>

                {/* Board / Moderation — a view switch, not a route: the
                    public mod-log tab reuses this same board page (see
                    game-page.tsx's `view` prop). Always shown once there's a
                    real board, since the log is public regardless of who's
                    looking. */}
                <div className={styles.plateSection} inert={stuck}>
                    <nav className={styles.viewTabs} aria-label="Board views">
                        <Link
                            href={buildBoardHref(data.game.name, {
                                categorySlug: category.name,
                                subcategoryKey,
                            })}
                            className={
                                view === 'board'
                                    ? styles.viewTabOn
                                    : styles.viewTab
                            }
                            aria-current={view === 'board' ? 'page' : undefined}
                        >
                            Board
                        </Link>
                        <Link
                            href={buildBoardHref(data.game.name, {
                                categorySlug: category.name,
                                subcategoryKey,
                                view: 'moderation',
                            })}
                            className={
                                view === 'moderation'
                                    ? styles.viewTabOn
                                    : styles.viewTab
                            }
                            aria-current={
                                view === 'moderation' ? 'page' : undefined
                            }
                        >
                            Moderation
                        </Link>
                    </nav>
                </div>
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
                        />
                    </div>
                )}
                {/* Filter tier and Rules share one plate row (density: each
                    used to own a full-width row whose content ended before
                    the halfway point). Rules only falls back to its own row
                    when there's no tier to share with. */}
                {(showFilterTier || showRules) && (
                    <div
                        className={`${styles.plateSection} ${
                            showFilterTier && showRules
                                ? styles.plateSectionSplit
                                : ''
                        }`}
                        inert={stuck}
                    >
                        {showFilterTier && (
                            <FilterBar
                                defs={data.variables}
                                selectedSubcategoryValues={
                                    data.activeFilters.subcategoryValues
                                }
                                selectedVarFilters={
                                    data.activeFilters.varFilters
                                }
                            />
                        )}
                        {showRules && (
                            <div className={styles.plateRulesSlot}>
                                <RulesPanel
                                    rules={category.rules}
                                    gameRules={data.gameMeta.gameRules}
                                    emulatorPolicy={
                                        data.gameMeta.emulatorPolicy
                                    }
                                    open={rulesOpen}
                                    onToggle={onToggleRules}
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
