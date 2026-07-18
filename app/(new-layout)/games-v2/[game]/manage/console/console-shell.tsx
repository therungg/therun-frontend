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
    defaultItem,
    sidebarActiveItem as deriveSidebarActiveItem,
    type NavFlags,
    type NavItemId,
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
    // ever a landing content pane (see the effect below).
    const initialActive = useMemo<NavItemId | null>(() => {
        const requested = searchParams.get('pane');
        const visible = groups.flatMap((g) => g.items).map((it) => it.id);
        if (
            requested &&
            requested !== 'history' &&
            requested !== 'roster' &&
            requested !== 'reports' &&
            visible.includes(requested as NavItemId)
        ) {
            return requested as NavItemId;
        }
        return defaultItem(groups);
    }, [searchParams, groups]);

    const [activeItem, setActiveItem] = useState<NavItemId | null>(
        initialActive,
    );

    // Same-page ?pane= links (health card, moderators pane) update the URL
    // without remounting the shell — sync state to the validated param. This
    // also fires on browser Back/Forward: Next re-renders `useSearchParams()`
    // on popstate, which recomputes `initialActive` and lands here.
    useEffect(() => {
        setActiveItem(initialActive);
    }, [initialActive]);

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

    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        initialCategoryId,
    );
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
        router.replace(`?pane=${id}`, { scroll: false });
        setActiveItem(id);
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
                onSelectCategory={setSelectedCategoryId}
            >
                {setupCompleteness &&
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
                ) : null}
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
                        setSelectedCategoryId(id);
                        setActiveItem('category-settings');
                    }}
                />
            </ConsoleChrome>

            <HistoryDrawer
                gameSlug={game.name}
                open={historyOpen}
                onClose={() => {
                    setHistoryOpen(false);
                    if (activeItem) {
                        router.replace(`?pane=${activeItem}`, {
                            scroll: false,
                        });
                    }
                }}
            />
        </>
    );
}
