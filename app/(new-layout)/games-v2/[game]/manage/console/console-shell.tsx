'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
import type {
    BoardClaimRequest,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import type {
    ResolvedCategory,
    ResolvedGame,
} from '../../../../../../types/leaderboards.types';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { HistoryDrawer } from '../moderation/configure/history-drawer';
import { BoardHealthCard } from './board-health-card';
import styles from './console.module.scss';
import { ConsoleChrome } from './console-chrome';
import { ContentRouter } from './content-router';
import type { GameDetailsData } from './game-details-pane';
import {
    buildNav,
    sidebarActiveItem as deriveSidebarActiveItem,
    isLandingPaneId,
    type NavFlags,
    type NavItemId,
    resolveCategoryId,
    resolveInitialPane,
    showSetupCard,
} from './nav-model';
import { SetupChecklistCard } from './setup-checklist-card';

export interface ConsoleShellProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    flags: NavFlags;
    attentionItems: AttentionItem[];
    degradedSources: string[];
    modApplications?: BoardClaimRequest[];
    initialCategoryId: number | null;
    initialSlug: string | null;
    initialAbbreviation: string | null;
    initialRows: ManageCategoryRow[];
    initialGroups: ManageGroup[];
    setupCompleteness?: BoardCompleteness | null;
    boardHealth?: BoardHealth | null;
    gameDetails?: GameDetailsData | null;
    moderators?: GameModerator[];
}

export function ConsoleShell({
    game,
    categories,
    flags,
    attentionItems,
    degradedSources,
    modApplications,
    initialCategoryId,
    initialSlug,
    initialAbbreviation,
    initialRows,
    initialGroups,
    setupCompleteness,
    boardHealth,
    gameDetails,
    moderators,
}: ConsoleShellProps) {
    const groups = useMemo(() => buildNav(flags), [flags]);
    const router = useRouter();
    const searchParams = useSearchParams();

    // A `?pane=` deep-link (used by sub-route pages navigating back) wins over
    // the default landing pane — but only if it's a pane this viewer can see.
    // `history` is an overlay, `roster` always leaves for its own route, and
    // `reports` normalizes into the attention pane — none of the three is
    // ever a landing content pane. Per-game localStorage memory isn't
    // consulted here — reading it during the initial render would desync
    // from the server-rendered HTML and trip a hydration mismatch — the
    // mount effect below applies it once, after hydration, instead.
    const initialActive = useMemo<NavItemId | null>(
        () => resolveInitialPane(searchParams.get('pane'), null, groups),
        [searchParams, groups],
    );

    const [activeItem, setActiveItem] = useState<NavItemId | null>(
        initialActive,
    );

    // Same-page ?pane= links (health card, moderators pane) update the URL
    // without remounting the shell — sync state to the validated param. This
    // also fires on browser Back/Forward: Next re-renders `useSearchParams()`
    // on popstate, which recomputes `initialActive` and lands here.
    //
    // The first run (post-hydration only) additionally consults this
    // viewer's per-game "last pane" memory, but ONLY when the URL carries no
    // `?pane=` at all — a deep link always wins over what they last had
    // open. Every subsequent run (pane switches, Back/Forward) just syncs to
    // `initialActive` like before.
    const checkedStoredPaneRef = useRef(false);
    useEffect(() => {
        if (!checkedStoredPaneRef.current) {
            checkedStoredPaneRef.current = true;
            if (!searchParams.get('pane') && typeof window !== 'undefined') {
                const stored = window.localStorage.getItem(
                    `console:${game.id}:lastPane`,
                );
                const visible = groups
                    .flatMap((g) => g.items)
                    .map((it) => it.id);
                if (isLandingPaneId(stored, visible)) {
                    setActiveItem(stored);
                    return;
                }
            }
        }
        setActiveItem(initialActive);
    }, [initialActive, searchParams, groups, game.id]);

    // Remember this viewer's last pane per game so their next visit lands
    // where they left off instead of always the default — a `?pane=` deep
    // link still always wins (see the effect above).
    useEffect(() => {
        if (typeof window === 'undefined' || !activeItem) return;
        window.localStorage.setItem(`console:${game.id}:lastPane`, activeItem);
    }, [activeItem, game.id]);

    // Deep links that never land as content: `?pane=roster` sends the viewer
    // straight to the roster route (the placeholder pane is gone); `?pane=
    // reports` normalizes to the attention pane pre-filtered to reports.
    useEffect(() => {
        const pane = searchParams.get('pane');
        if (pane === 'roster') {
            router.replace(`/games-v2/${game.name}/manage/moderation/roster`);
        } else if (pane === 'reports') {
            router.replace('?pane=attention&kind=report', { scroll: false });
        }
    }, [searchParams, router, game.name]);

    // A valid `?cat=` deep-link seeds the selection on mount (a refresh
    // mid-edit of, say, "Rules — 100%" returns to 100%, not the server's
    // computed default); an absent/invalid one falls back to
    // `initialCategoryId`.
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        () =>
            resolveCategoryId(
                searchParams.get('cat'),
                categories,
                initialCategoryId,
            ),
    );

    // Browser Back/Forward (or a fresh `?cat=` deep link) restores the
    // category a history entry was showing — but only when that entry's URL
    // actually names one. Category-scoped navigation always writes `cat`
    // alongside `pane` (see handleNavigate/onSelectCategory/onEditCategory
    // below), so every history entry for a category-scoped pane carries it;
    // entries for non-category-scoped panes simply don't, which must NOT be
    // read as "reset to the default category" — that would blow away the
    // selection the moment the viewer glances at an unrelated pane like
    // Moderators.
    useEffect(() => {
        const requested = searchParams.get('cat');
        if (requested == null) return;
        setSelectedCategoryId((prev) =>
            resolveCategoryId(requested, categories, prev),
        );
    }, [searchParams, categories]);

    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [manageGroups, setManageGroups] =
        useState<ManageGroup[]>(initialGroups);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [liveAttentionCount, setLiveAttentionCount] = useState(
        attentionItems.length,
    );

    // A full page reload (e.g. router.refresh() after a degraded-source
    // retry) re-sends a fresh server-computed total through this prop —
    // resync so the badge doesn't stay pinned to a stale, already-triaged
    // count from before the reload.
    useEffect(() => {
        setLiveAttentionCount(attentionItems.length);
    }, [attentionItems]);

    // `?pane=history` opens the drawer on arrival — from a deep link (the
    // sub-route sidebar's History item) or from a same-page URL change.
    useEffect(() => {
        if (searchParams.get('pane') === 'history') {
            setHistoryOpen(true);
        }
    }, [searchParams]);

    const selectedCategory = useMemo<ResolvedCategory | null>(
        () => categories.find((c) => c.id === selectedCategoryId) ?? null,
        [categories, selectedCategoryId],
    );

    const applyRowPatch = useCallback(
        (categoryId: number, patch: { isMain?: boolean; active?: boolean }) => {
            setRows((rs) =>
                rs.map((r) => (r.id === categoryId ? { ...r, ...patch } : r)),
            );
        },
        [],
    );

    // History is a quick-reference overlay, not a destination pane. Roster
    // always leaves the console for its dedicated route. Reports is a
    // pre-filtered view of the attention pane, not a pane of its own.
    const handleNavigate = (id: NavItemId) => {
        if (id === 'roster') {
            router.push(`/games-v2/${game.name}/manage/moderation/roster`);
            return;
        }
        if (id === 'reports') {
            router.replace('?pane=attention&kind=report', { scroll: false });
            setActiveItem('attention');
            return;
        }
        // Opening History from the sidebar is an overlay, not a navigation —
        // it must NOT touch the URL or activeItem. Writing `?pane=history`
        // here would make `initialActive` (which excludes `history` as a
        // landing pane) recompute to the default pane, and the sync effect
        // above would then overwrite activeItem out from under the open
        // drawer, silently dropping the current pane AND any `?kind=` filter.
        // Deep-linked opens (`?pane=history` in the URL on arrival) are
        // handled separately by the mount effect above, which never routes
        // through here.
        if (id === 'history') {
            setHistoryOpen(true);
            return;
        }
        // Every other pane switch is a real destination, not a
        // normalization — push so Back retraces panes one switch at a time
        // (requirement 2). Category-scoped panes carry the current
        // selection along as `cat=` so a refresh, share, or Back/Forward
        // lands on the same category the viewer was editing.
        const item = groups.flatMap((g) => g.items).find((it) => it.id === id);
        const params = new URLSearchParams();
        params.set('pane', id);
        if (item?.categoryScoped && selectedCategoryId != null) {
            params.set('cat', String(selectedCategoryId));
        }
        router.push(`?${params.toString()}`, { scroll: false });
        setActiveItem(id);
    };

    // The category picker only renders while a category-scoped pane is
    // active (console-sidebar.tsx), so `activeItem` here is always that
    // pane. Kept as `replace` rather than `push`: picking through categories
    // within the same pane is a filter refinement, not a new destination —
    // mirrors the roster page's own category select, which is also
    // `replace` (roster-view.tsx). The pane itself is still push-navigable
    // via handleNavigate; this only ever rewrites `cat`.
    const handleSelectCategory = (id: number) => {
        setSelectedCategoryId(id);
        if (activeItem) {
            const params = new URLSearchParams(searchParams);
            params.set('pane', activeItem);
            params.set('cat', String(id));
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    };

    // The sidebar highlight for Reports vs. Needs attention is derived, not
    // stored — see `sidebarActiveItem` in nav-model.ts. Deriving from
    // searchParams means dismissing the kind chip in NeedsAttention (which
    // updates the URL itself) automatically flips the highlight back without
    // the shell needing to know about it.
    const activeSidebarItem = useMemo(
        () => deriveSidebarActiveItem(activeItem, searchParams.get('kind')),
        [activeItem, searchParams],
    );

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ id: c.id, display: c.display })),
        [categories],
    );

    // Focus + announce the pane heading on every switch after the initial
    // mount, so keyboard/AT users get the same "you're here now" signal
    // sighted users get from the highlighted sidebar item. Skipping the
    // first render matches standard SPA route-change focus management —
    // full page loads already put focus at the top of the document.
    const activeLabel = useMemo(() => {
        const item = groups
            .flatMap((g) => g.items)
            .find((it) => it.id === activeItem);
        return item?.label ?? 'Admin console';
    }, [groups, activeItem]);

    const paneHeadingRef = useRef<HTMLHeadingElement>(null);
    const skipFocusRef = useRef(true);

    useEffect(() => {
        if (skipFocusRef.current) {
            skipFocusRef.current = false;
            return;
        }
        paneHeadingRef.current?.focus();
    }, [activeItem]);

    return (
        <>
            <ConsoleChrome
                game={game}
                groups={groups}
                activeItem={activeSidebarItem}
                onNavigate={handleNavigate}
                attentionCount={liveAttentionCount}
                badgeDegraded={degradedSources.length > 0}
                categories={categoryOptions}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
            >
                {showSetupCard(groups, activeItem) &&
                    (setupCompleteness &&
                    setupCompleteness.steps.find((s) => s.step === 'finish')
                        ?.status !== 'done' ? (
                        <SetupChecklistCard
                            gameSlug={game.name}
                            completeness={setupCompleteness}
                        />
                    ) : boardHealth ? (
                        <BoardHealthCard
                            gameSlug={game.name}
                            health={boardHealth}
                        />
                    ) : null)}
                <h2
                    ref={paneHeadingRef}
                    tabIndex={-1}
                    className={`visually-hidden-focusable ${styles.paneHeading}`}
                >
                    {activeLabel}
                </h2>
                <div className="visually-hidden" aria-live="polite">
                    {activeLabel}
                </div>
                <ContentRouter
                    activeItem={activeItem}
                    game={game}
                    categories={categoryOptions}
                    selectedCategory={selectedCategory}
                    canEditStandards={flags.canEditStandards}
                    gameDetails={gameDetails}
                    attentionItems={attentionItems}
                    degradedSources={degradedSources}
                    modApplications={modApplications}
                    moderators={moderators}
                    onAttentionCountChange={setLiveAttentionCount}
                    initialSlug={initialSlug}
                    initialAbbreviation={initialAbbreviation}
                    rows={rows}
                    groups={manageGroups}
                    onGroupsChange={setManageGroups}
                    onRowChange={applyRowPatch}
                    onRowGroupChange={(categoryId, groupId, groupName) =>
                        setRows((rs) =>
                            rs.map((r) =>
                                r.id === categoryId
                                    ? { ...r, groupId, groupName }
                                    : r,
                            ),
                        )
                    }
                    onEditCategory={(id) => {
                        // A deliberate jump to a specific category's
                        // settings (e.g. an "Edit" click from the
                        // categories table) — pushed, like handleNavigate,
                        // so Back returns to the table instead of skipping
                        // over this stop. `cat` travels with `pane` so a
                        // refresh doesn't lose place.
                        setSelectedCategoryId(id);
                        const params = new URLSearchParams();
                        params.set('pane', 'category-settings');
                        params.set('cat', String(id));
                        router.push(`?${params.toString()}`, {
                            scroll: false,
                        });
                        setActiveItem('category-settings');
                    }}
                />
            </ConsoleChrome>

            <HistoryDrawer
                gameSlug={game.name}
                open={historyOpen}
                onClose={() => {
                    setHistoryOpen(false);
                    if (searchParams.get('pane') === 'history' && activeItem) {
                        const params = new URLSearchParams(searchParams);
                        params.set('pane', activeItem);
                        router.replace(`?${params.toString()}`, {
                            scroll: false,
                        });
                    }
                }}
            />
        </>
    );
}
