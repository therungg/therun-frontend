'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowClockwise } from 'react-bootstrap-icons';
import { countAttentionAction } from '~src/actions/count-attention.action';
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
import type { ReorderChange } from '../game-tab/reorder-changes';
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
    /** How many games this viewer moderates — the "All your games" link to
     * the cross-game hub only shows when there's more than one. */
    moderatedGamesCount?: number;
    modApplications?: BoardClaimRequest[];
    initialCategoryId: number | null;
    initialSlug: string | null;
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
    moderatedGamesCount = 0,
    modApplications,
    initialCategoryId,
    initialSlug,
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
    // open. When that happens, the resolved pane is written straight back
    // into the URL via `router.replace` (preserving any other params, e.g.
    // `?pane=history` never reaches here — see the guard below). That makes
    // every history entry self-describing: entry #0 becomes `?pane=timing`
    // instead of staying bare, so browser Back always lands on a URL that
    // already names its pane instead of silently falling through to the
    // default and re-clobbering storage. Every subsequent run (pane
    // switches, Back/Forward) just syncs to `initialActive` — the URL alone
    // is authoritative once this one-time bootstrap has run.
    const appliedStoredPaneRef = useRef(false);
    useEffect(() => {
        if (!appliedStoredPaneRef.current) {
            appliedStoredPaneRef.current = true;
            const urlPane = searchParams.get('pane');
            if (!urlPane && typeof window !== 'undefined') {
                const stored = window.localStorage.getItem(
                    `console:${game.id}:lastPane`,
                );
                const resolved = resolveInitialPane(urlPane, stored, groups);
                setActiveItem(resolved);
                if (resolved) {
                    const params = new URLSearchParams(searchParams);
                    params.set('pane', resolved);
                    router.replace(`?${params.toString()}`, {
                        scroll: false,
                    });
                }
                return;
            }
        }
        setActiveItem(initialActive);
    }, [initialActive, searchParams, groups, game.id, router]);

    // Remember this viewer's last pane per game so their next visit lands
    // where they left off instead of always the default — a `?pane=` deep
    // link still always wins (see the effect above). Skip the write when
    // it wouldn't change anything (e.g. the sync effect above re-running
    // after its own `router.replace`) to avoid a redundant localStorage hit.
    useEffect(() => {
        if (typeof window === 'undefined' || !activeItem) return;
        const key = `console:${game.id}:lastPane`;
        if (window.localStorage.getItem(key) !== activeItem) {
            window.localStorage.setItem(key, activeItem);
        }
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
    // count from before the reload. Also clears any stale "new items"
    // banner — the refresh it just served IS the fresh load.
    useEffect(() => {
        setLiveAttentionCount(attentionItems.length);
        setHasNewAttention(false);
    }, [attentionItems]);

    // Live poll: notice new flags/reports/self-claims without a manual
    // reload. Mirrors NotificationsBell's visibility-aware interval
    // (src/components/Topbar/NotificationsBell.tsx) plus a focus-triggered
    // refresh, since coming back to the tab is the moment staleness is
    // most likely to be visible.
    //
    // A HIGHER fetched count never mutates `rows`/`attentionItems`
    // mid-triage — it only flips a banner so the moderator finishes what
    // they're doing before pulling in new cards. A LOWER count (their own
    // triage already landing server-side, or another mod acting
    // concurrently) just updates the badge silently — nothing to warn
    // about, the console already reflects reality.
    const [hasNewAttention, setHasNewAttention] = useState(false);
    const liveAttentionCountRef = useRef(liveAttentionCount);
    useEffect(() => {
        liveAttentionCountRef.current = liveAttentionCount;
    }, [liveAttentionCount]);

    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            if (document.hidden) return;
            // A failed count poll is invisible — network blips shouldn't
            // surface as an unhandled rejection in a long-lived tab.
            let result: Awaited<ReturnType<typeof countAttentionAction>>;
            try {
                result = await countAttentionAction(game.name);
            } catch {
                return;
            }
            if (cancelled) return;
            if (result.count > liveAttentionCountRef.current) {
                setHasNewAttention(true);
            } else {
                setLiveAttentionCount(result.count);
            }
        };
        const interval = setInterval(poll, 90_000);
        window.addEventListener('focus', poll);
        return () => {
            cancelled = true;
            clearInterval(interval);
            window.removeEventListener('focus', poll);
        };
    }, [game.name]);

    // Tab title mirrors the live count while the console is mounted, e.g.
    // "(3) Manage — Celeste" — no "(0)" prefix when clear. Restores
    // whatever the browser tab's title was before this component mounted.
    const originalTitleRef = useRef<string | null>(null);
    useEffect(() => {
        if (originalTitleRef.current === null) {
            originalTitleRef.current = document.title;
        }
        document.title =
            liveAttentionCount > 0
                ? `(${liveAttentionCount}) Manage — ${game.display}`
                : `Manage — ${game.display}`;
    }, [liveAttentionCount, game.display]);

    useEffect(() => {
        return () => {
            if (originalTitleRef.current !== null) {
                document.title = originalTitleRef.current;
            }
        };
    }, []);

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

    const applyRowsReorder = useCallback((changes: ReorderChange[]) => {
        if (changes.length === 0) return;
        const byId = new Map(changes.map((c) => [c.categoryId, c.sortOrder]));
        setRows((rs) =>
            rs.map((r) =>
                byId.has(r.id)
                    ? { ...r, sortOrder: byId.get(r.id) as number }
                    : r,
            ),
        );
    }, []);

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
        // preventScroll: a section-anchor scroll inside the new pane (e.g.
        // GameTab's own scrollIntoView) shouldn't get clobbered back to the
        // top by this focus call — see game-tab.tsx.
        paneHeadingRef.current?.focus({ preventScroll: true });
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
                moderatedGamesCount={moderatedGamesCount}
                categories={categoryOptions}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
            >
                {hasNewAttention && (
                    <div className={styles.liveBanner} role="status">
                        <span>New items — refresh to load</span>
                        <button
                            type="button"
                            className={styles.liveBannerRefresh}
                            onClick={() => router.refresh()}
                        >
                            <ArrowClockwise size={14} aria-hidden="true" />
                            Refresh
                        </button>
                    </div>
                )}
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
                    rows={rows}
                    groups={manageGroups}
                    onGroupsChange={setManageGroups}
                    onRowChange={applyRowPatch}
                    onRowsReorder={applyRowsReorder}
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
