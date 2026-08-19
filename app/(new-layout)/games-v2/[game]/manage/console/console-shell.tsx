'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import { legacyPaneRedirect } from '~src/lib/console/legacy-panes';
import { CONCEPT_LABEL } from '~src/lib/console/vocabulary';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
import type {
    BoardClaimRequest,
    GameModerator,
} from '../../../../../../types/board-claims.types';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { LevelTemplate } from '../../../../../../types/levels.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import type { ReorderChange } from '../game-tab/reorder-changes';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { HistoryDrawer } from '../moderation/configure/history-drawer';
import { BoardHealthCard } from './board-health-card';
import styles from './console.module.scss';
import { ConsoleChrome } from './console-chrome';
import { ContentRouter } from './content-router';
import type { GameDetailsData } from './game-details-pane';
import { historyCloseQuery } from './history-close-query';
import {
    buildNav,
    sidebarActiveItem as deriveSidebarActiveItem,
    type NavFlags,
    type NavItemId,
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
    initialRows: ManageCategoryRow[];
    /** Per-category configuration for the index matrix. */
    categoryConfig: CategoryConfigRow[];
    initialGroups: ManageGroup[];
    /** Level categories for the Levels pane's empty state — see
     * ContentRouterProps.levelTemplates. */
    levelTemplates?: LevelTemplate[];
    /** Board-order groups for the Boards pane (category-grouping sections) —
     * distinct from `initialGroups`, the ManageGroup shape the index/GameTab
     * use. Comes free from the same `resolveCategory` call as `categories`. */
    boardGroups: ResolvedGroup[];
    /** Variables + policies for the Boards pane — loaded whenever a viewer
     * can reach it (canModerate || canConfigure), not gated on canConfigure
     * alone, so a moderator without configure still sees the real board. */
    variables: VariableRow[];
    policies: BoardPolicyRow[];
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
    initialRows,
    categoryConfig,
    initialGroups,
    levelTemplates = [],
    boardGroups,
    variables,
    policies,
    setupCompleteness,
    boardHealth,
    gameDetails,
    moderators,
}: ConsoleShellProps) {
    const groups = useMemo(() => buildNav(flags), [flags]);
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // A `?pane=` deep link (used by sub-route pages navigating back) decides
    // the pane. Anything else — a bare /manage — resolves to `null`, the tile
    // grid. `history` is an overlay and `setup` leaves the console, so
    // neither is ever a landing pane.
    const initialActive = useMemo<NavItemId | null>(
        () => resolveInitialPane(searchParams.get('pane'), groups, flags),
        [searchParams, groups, flags],
    );

    const [activeItem, setActiveItem] = useState<NavItemId | null>(
        initialActive,
    );

    // Legacy deep links: `?pane=rules&cat=12` became
    // /manage/category/12#rules. Runs once per mount, before the plain sync
    // effect below applies `initialActive` — same-page `?pane=` links
    // (health card, moderators pane) and browser Back/Forward both recompute
    // `initialActive` and land there without remounting the shell.
    const legacyHandledRef = useRef(false);
    useEffect(() => {
        if (legacyHandledRef.current) return;
        legacyHandledRef.current = true;

        const redirect = legacyPaneRedirect(
            searchParams.get('pane'),
            searchParams.get('cat'),
        );
        if (!redirect) return;
        if (redirect.kind === 'detail') {
            router.replace(
                `/games-v2/${encodeURIComponent(game.name)}/manage/category/${redirect.categoryId}#${redirect.hash}`,
            );
        } else {
            router.replace(`?pane=${redirect.pane}`, { scroll: false });
        }
    }, [searchParams, router, game.id, game.name]);

    useEffect(() => {
        setActiveItem(initialActive);
    }, [initialActive]);

    // Deliberately written but never read. Bare /manage now always lands on
    // the tile grid, so nothing consults this — it is kept for the agreed
    // per-user "skip the grid" setting, which will most likely skip to the
    // viewer's last pane. Keeping the write means that lands as a one-line
    // change rather than a re-derivation of this bookkeeping.
    // The retired-pane purge that used to run alongside the read was removed
    // with it, so this key can now silently accumulate pane ids that no
    // longer exist (retired panes, or ids a permission change made
    // unreachable). That's safe only because any future read MUST validate
    // the stored value through `isLandingPaneId` (see nav-model.ts) before
    // treating it as a landing pane — never trust it raw.
    useEffect(() => {
        if (typeof window === 'undefined' || !activeItem) return;
        const key = `console:${game.id}:lastPane`;
        if (window.localStorage.getItem(key) !== activeItem) {
            window.localStorage.setItem(key, activeItem);
        }
    }, [activeItem, game.id]);

    const [rows, setRows] = useState<ManageCategoryRow[]>(initialRows);
    const [manageGroups, setManageGroups] =
        useState<ManageGroup[]>(initialGroups);
    const [historyOpen, setHistoryOpen] = useState(false);

    // Needs attention is out of the console for now, so there is no live
    // count to poll or badge — the tab title is just the plain page name.
    // Restores whatever the browser tab's title was before this component
    // mounted.
    const originalTitleRef = useRef<string | null>(null);
    useEffect(() => {
        if (originalTitleRef.current === null) {
            originalTitleRef.current = document.title;
        }
        document.title = `Manage — ${game.display}`;
    }, [game.display]);

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

    // History is a quick-reference overlay, not a destination pane. Setup
    // always leaves the console for its dedicated route.
    const handleNavigate = (id: NavItemId) => {
        // The wizard is a full-focus page with its own "Back to console"
        // link — it must not write `?pane=` or become activeItem here.
        if (id === 'setup') {
            router.push(`/games-v2/${encodeURIComponent(game.name)}/setup`);
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
        // normalization — push so Back retraces panes one switch at a time.
        // No `cat=` any more: per-category work lives on its own route
        // (/manage/category/[id]), so a pane no longer carries a selection.
        router.push(`?pane=${id}`, { scroll: false });
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

    // Focus + announce the pane heading on every switch after the initial
    // mount, so keyboard/AT users get the same "you're here now" signal
    // sighted users get from the highlighted sidebar item. Skipping the
    // first render matches standard SPA route-change focus management —
    // full page loads already put focus at the top of the document.
    const activeLabel = useMemo(() => {
        const item = groups
            .flatMap((g) => g.items)
            .find((it) => it.id === activeItem);
        if (item) return item.label;
        // Attention is a hidden landing pane (deep-linkable but not in the
        // nav), so it never appears in `groups` — label it directly.
        if (activeItem === 'attention') return CONCEPT_LABEL.attention;
        return 'Admin console';
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
                attentionCount={attentionItems.length}
                badgeDegraded={degradedSources.length > 0}
                moderatedGamesCount={moderatedGamesCount}
            >
                {showSetupCard(groups, activeItem) &&
                    (setupCompleteness &&
                    setupCompleteness.steps.find((s) => s.step === 'boards')
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
                    categories={categories.map((c) => ({
                        id: c.id,
                        display: c.display,
                    }))}
                    boardCategories={categories}
                    boardGroups={boardGroups}
                    variables={variables}
                    policies={policies}
                    canConfigureBoards={flags.canConfigure}
                    canSiteBan={flags.canSiteBan ?? false}
                    categoryConfig={categoryConfig}
                    gameDetails={gameDetails}
                    attentionItems={attentionItems}
                    degradedSources={degradedSources}
                    modApplications={modApplications}
                    moderators={moderators}
                    rows={rows}
                    groups={manageGroups}
                    levelTemplates={levelTemplates}
                    navGroups={groups}
                    onNavigate={handleNavigate}
                    attentionCount={attentionItems.length}
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
                        // A deliberate jump to one category's configuration.
                        // That is now its own route rather than a pane +
                        // `cat=`, so Back returns to the index cleanly.
                        router.push(
                            `/games-v2/${encodeURIComponent(game.name)}/manage/category/${id}`,
                        );
                    }}
                />
            </ConsoleChrome>

            <HistoryDrawer
                gameSlug={game.name}
                open={historyOpen}
                onClose={() => {
                    setHistoryOpen(false);
                    const query = historyCloseQuery(
                        searchParams.toString(),
                        activeItem,
                    );
                    router.replace(query ? `?${query}` : pathname, {
                        scroll: false,
                    });
                }}
            />
        </>
    );
}
