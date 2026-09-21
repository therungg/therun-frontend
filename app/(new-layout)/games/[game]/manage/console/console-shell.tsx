'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import styles from '~src/components/console-chrome/console.module.scss';
import { ConsoleChrome } from '~src/components/console-chrome/console-chrome';
import { NAV_ICON } from '~src/components/console-chrome/nav-icons';
import type { NavBadge } from '~src/components/console-chrome/nav-types';
import Link from '~src/components/link';
import { gameBackLink } from '~src/lib/board-url';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { CategoryConfigRow } from '~src/lib/console/category-rows';
import { legacyPaneRedirect } from '~src/lib/console/legacy-panes';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
import { kindOfCategory } from '~src/lib/setup/workspace';
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
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import type {
    WorklistDigest,
    WorklistPage,
} from '../../../../../../types/worklist.types';
import type { EmulatorPolicy } from '../../rules/rules-panel';
import { BackLink } from '../../shared/back-link';
import type { AttentionItem } from '../moderation/attention/attention-model';
import type { AttentionData } from '../moderation/attention/load-attention';
import { HistoryDrawer } from '../moderation/configure/history-drawer';
import { ContentRouter } from './content-router';
import type { GameDetailsData } from './game-details-pane';
import { historyCloseQuery } from './history-close-query';
import {
    buildFooterNav,
    buildNav,
    sidebarActiveItem as deriveSidebarActiveItem,
    type NavFlags,
    type NavItemId,
    navItemLongLabel,
    resolveInitialPane,
} from './nav-model';
import { StreamedValue } from './streamed-value';

// Stable empty values, so a console still waiting on its inbox doesn't hand
// every consumer a fresh array on each render.
const EMPTY_ITEMS: AttentionItem[] = [];
const EMPTY_SOURCES: string[] = [];

export interface ConsoleShellProps {
    game: ResolvedGame;
    categories: ResolvedCategory[];
    flags: NavFlags;
    /** Flags, reports and self-claims. Handed over unresolved: the flags call
     * is one of the slowest on the page, so the inbox streams in rather than
     * holding the console back. */
    attention: Promise<AttentionData>;
    /** How many games this viewer moderates — the "All your games" link to
     * the cross-game hub only shows when there's more than one. */
    moderatedGamesCount?: number;
    modApplications?: BoardClaimRequest[];
    initialRows: ManageCategoryRow[];
    /** Per-category configuration for the index matrix. */
    categoryConfig: CategoryConfigRow[];
    initialGroups: ManageGroup[];
    /** Board-order groups for the Boards pane (category-grouping sections) —
     * distinct from `initialGroups`, the ManageGroup shape the overview
     * uses. Comes free from the same `resolveCategory` call as `categories`. */
    boardGroups: ResolvedGroup[];
    /** Variables + policies for the Boards pane — loaded whenever a viewer
     * can reach it (canModerate || canConfigure), not gated on canConfigure
     * alone, so a moderator without configure still sees the real board. */
    variables: VariableRow[];
    policies: BoardPolicyRow[];
    /** The game's own rules, shown inline where a run is judged. */
    gameRules?: string | null;
    emulatorPolicy?: EmulatorPolicy;
    setupCompleteness?: BoardCompleteness | null;
    boardHealth?: BoardHealth | null;
    gameDetails?: GameDetailsData | null;
    moderators?: GameModerator[];
    /** Latest import job of any kind — drives the sidebar's import status dot. */
    syncJob?: SrcImportJob | null;
    /** Latest settings import, for the overview card's per-kind lines. */
    settingsJob?: SrcImportJob | null;
    /** Latest runs import, for the overview card's per-kind lines. */
    runsJob?: SrcImportJob | null;
    /** Seven-day history of what was decided and flagged, for the overview's
     * queue summary. Unresolved, like `worklist`. */
    digest?: Promise<WorklistDigest | null>;
    /** First page of the mod queue, for the overview's queue summary and the
     * sidebar's pending count. Handed over unresolved — on a big board this
     * one call can take tens of seconds, and nothing else waits for it. */
    worklist?: Promise<WorklistPage | null>;
}

export function ConsoleShell({
    game,
    categories,
    flags,
    attention,
    moderatedGamesCount = 0,
    modApplications,
    initialRows,
    categoryConfig,
    initialGroups,
    boardGroups,
    gameRules,
    emulatorPolicy,
    variables,
    policies,
    setupCompleteness,
    boardHealth,
    gameDetails,
    moderators,
    syncJob,
    settingsJob,
    runsJob,
    digest,
    worklist,
}: ConsoleShellProps) {
    const groups = useMemo(() => buildNav(flags), [flags]);
    const footerItems = useMemo(() => buildFooterNav(flags), [flags]);
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const base = `/games/${encodeURIComponent(game.name)}/manage`;

    // Real links for every sidebar destination. History stays a button — it
    // is an overlay, and writing ?pane=history from inside the console would
    // yank the pane out from under the drawer (see handleNavigate).
    const hrefFor = useCallback(
        (id: string): string | undefined => {
            if (id === 'history') return undefined;
            if (id === 'setup')
                return `/games/${encodeURIComponent(game.name)}/setup`;
            if (id === 'overview') return base;
            return `${base}?pane=${id}`;
        },
        [game.name, base],
    );

    // The board still has setup steps outstanding (the final 'boards' step is
    // done only once the mod marks the board configured). Drives the sidebar
    // dot on the Setup wizard item — the standing "finish setup" signal now
    // that the inline checklist card is gone.
    const setupIncomplete =
        setupCompleteness != null &&
        setupCompleteness.steps.find((s) => s.step === 'boards')?.status !==
            'done';

    // Filled in when the mod queue lands (see the StreamedValue below), then
    // kept current by the worklist pane so the badge drops as the moderator
    // approves. Null means "not known yet" — the badge simply isn't drawn.
    const [liveQueueCount, setLiveQueueCount] = useState<number | null>(null);
    const takeWorklistCount = useCallback((page: WorklistPage | null) => {
        setLiveQueueCount(page?.counts.needsYou ?? null);
    }, []);

    // The inbox arrives on its own schedule too. Until it does there is no
    // Needs attention badge and the pane says it is still loading, rather
    // than claiming an empty queue.
    const [inbox, setInbox] = useState<AttentionData | null>(null);
    const attentionItems = inbox?.items ?? EMPTY_ITEMS;
    const degradedSources = inbox?.degradedSources ?? EMPTY_SOURCES;

    // Ambient sidebar status from data the shell already holds. The count
    // pill wins over a dot when both could apply.
    const badges = useMemo(() => {
        const map: Record<string, NavBadge | undefined> = {
            // No badge at all until the inbox lands — a 0 here would read as
            // "all clear" while the flags call is still running.
            attention: inbox
                ? {
                      count: attentionItems.length,
                      degraded: degradedSources.length > 0,
                  }
                : undefined,
        };
        // The one number a moderator checks daily: runs waiting on them.
        if (liveQueueCount != null && liveQueueCount > 0) {
            map['mod-queue'] = { count: liveQueueCount };
        }
        const pending = modApplications?.length ?? 0;
        if (pending > 0) map.moderators = { count: pending };
        if (syncJob?.status === 'queued' || syncJob?.status === 'running') {
            map.import = { dot: 'info', dotLabel: 'Import running' };
        } else if (syncJob?.status === 'failed') {
            map.import = { dot: 'danger', dotLabel: 'Import failed' };
        }
        if (setupIncomplete) {
            map.setup = { dot: 'warning', dotLabel: 'Setup incomplete' };
        }
        if (boardHealth?.items.some((i) => i.severity === 'blocker')) {
            map.overview = { dot: 'danger', dotLabel: 'Board has a blocker' };
        } else if (boardHealth?.items.some((i) => i.severity === 'warning')) {
            map.overview = { dot: 'warning', dotLabel: 'Board has warnings' };
        }
        return map;
    }, [
        inbox,
        attentionItems.length,
        degradedSources.length,
        liveQueueCount,
        modApplications,
        syncJob,
        boardHealth,
        setupIncomplete,
    ]);

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

    // The category a legacy `rules` link was pointing at, held here rather
    // than left in the URL: it is consumed once, by the table that opens the
    // dialog on arrival. In the query string it would reopen that dialog on
    // every reload and every Back, over a screen the reader has since moved
    // on from.
    const [legacyRulesCategoryId, setLegacyRulesCategoryId] = useState<
        number | null
    >(null);

    // Legacy deep links: `?pane=rules&cat=12` was one of six category-scoped
    // panes; that work is the workspace settings table. Runs once per mount,
    // before the plain sync effect below applies `initialActive` — same-page
    // `?pane=` links (health card, moderators pane) and browser Back/Forward
    // both recompute `initialActive` and land there without remounting the
    // shell.
    const legacyHandledRef = useRef(false);
    useEffect(() => {
        if (legacyHandledRef.current) return;
        legacyHandledRef.current = true;

        const redirect = legacyPaneRedirect(
            searchParams.get('pane'),
            searchParams.get('cat'),
        );
        if (!redirect) return;
        if (redirect.kind === 'pane') {
            router.replace(`?pane=${redirect.pane}`, { scroll: false });
            return;
        }
        // Which workspace the category lives in decides where its settings
        // are: a level's are on the Levels screen, and sending one to
        // Categories lands on a table its row is not in. A category the board
        // no longer has falls back to Categories, which is where a reader
        // looking for a missing one would go next anyway.
        const kind =
            kindOfCategory(redirect.categoryId, categories, boardGroups) ??
            'categories';
        setLegacyRulesCategoryId(
            redirect.openRules ? redirect.categoryId : null,
        );
        // `cat=` is deliberately not carried over — see the state above.
        router.replace(`?pane=${kind}/${redirect.screen}`, { scroll: false });
    }, [searchParams, router, categories, boardGroups]);

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

    // Server data for the overview; the workspace pages refresh the route
    // after every write, so these stay current without local copies.
    const rows = initialRows;
    const manageGroups = initialGroups;
    const [historyOpen, setHistoryOpen] = useState(false);

    // The browser tab title stays the plain page name — it doesn't track
    // the active pane or any live count. The sidebar badge above is what
    // shows the server-rendered Needs attention count.
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

    // History is a quick-reference overlay, not a destination pane. Setup
    // always leaves the console for its dedicated route.
    const handleNavigate = (id: NavItemId) => {
        // The wizard is a full-focus page with its own "Back to console"
        // link — it must not write `?pane=` or become activeItem here.
        if (id === 'setup') {
            router.push(`/games/${encodeURIComponent(game.name)}/setup`);
            return;
        }
        if (id === 'overview') {
            router.push(base, { scroll: false });
            setActiveItem(null);
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
        // No `cat=`: a pane is a screen, not a screen plus a selection — only
        // a legacy deep link still carries one.
        router.push(`?pane=${id}`, { scroll: false });
        setActiveItem(id);
        // A deliberate pane switch spends the legacy selection: coming back
        // to the settings table later must not reopen a dialog the reader
        // already dismissed.
        setLegacyRulesCategoryId(null);
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
        if (item) return navItemLongLabel(item);
        // `queue-history` is a hidden landing pane — it never
        // appears in `groups` (see hiddenLandingIds in nav-model.ts).
        if (activeItem === 'queue-history') return 'Decided runs';
        return 'Admin console';
    }, [groups, activeItem]);

    const paneHeadingRef = useRef<HTMLHeadingElement>(null);
    const skipFocusRef = useRef(true);

    useEffect(() => {
        if (skipFocusRef.current) {
            skipFocusRef.current = false;
            return;
        }
        // preventScroll: a section-anchor scroll inside the new pane shouldn't
        // get clobbered back to the top by this focus call.
        paneHeadingRef.current?.focus({ preventScroll: true });
    }, [activeItem]);

    return (
        <>
            {/* The slow calls, parked off the render path. Each sits in its
                own boundary so waiting on one holds up nothing but itself. */}
            <Suspense fallback={null}>
                <StreamedValue promise={attention} onValue={setInbox} />
            </Suspense>
            {worklist && (
                <Suspense fallback={null}>
                    <StreamedValue
                        promise={worklist}
                        onValue={takeWorklistCount}
                    />
                </Suspense>
            )}
            <ConsoleChrome
                header={{
                    title: game.display,
                    titleHref: `/games/${encodeURIComponent(game.name)}/manage`,
                    image: game.image,
                    actions: (
                        <>
                            {moderatedGamesCount > 1 && (
                                <Link
                                    href="/games/manage"
                                    className={styles.allGamesLink}
                                >
                                    All your games
                                </Link>
                            )}
                            <BackLink
                                {...gameBackLink(
                                    game,
                                    flags.boardsVisible === true,
                                )}
                            />
                        </>
                    ),
                }}
                icons={NAV_ICON}
                navAriaLabel="Game admin console"
                cockpit
                groups={groups}
                activeItem={activeSidebarItem}
                onNavigate={(id) => handleNavigate(id as NavItemId)}
                badges={badges}
                hrefFor={hrefFor}
                footerItems={footerItems}
            >
                <h2
                    ref={paneHeadingRef}
                    tabIndex={-1}
                    className="visually-hidden"
                >
                    {activeLabel}
                </h2>
                <div className="visually-hidden" aria-live="polite">
                    {activeLabel}
                </div>
                <ContentRouter
                    activeItem={activeItem}
                    initialOpenCategoryId={legacyRulesCategoryId}
                    game={game}
                    categories={categories.map((c) => ({
                        id: c.id,
                        display: c.display,
                    }))}
                    boardCategories={categories}
                    boardGroups={boardGroups}
                    variables={variables}
                    policies={policies}
                    gameRules={gameRules}
                    emulatorPolicy={emulatorPolicy}
                    canConfigureBoards={flags.canConfigure}
                    canSiteBan={flags.canSiteBan ?? false}
                    boardsVisible={flags.boardsVisible === true}
                    categoryConfig={categoryConfig}
                    gameDetails={gameDetails}
                    attentionItems={attentionItems}
                    degradedSources={degradedSources}
                    attentionPending={inbox === null}
                    modApplications={modApplications}
                    moderators={moderators}
                    rows={rows}
                    groups={manageGroups}
                    navGroups={groups}
                    onNavigate={handleNavigate}
                    attentionCount={attentionItems.length}
                    setupCompleteness={setupCompleteness}
                    boardHealth={boardHealth}
                    syncJob={syncJob}
                    settingsJob={settingsJob}
                    runsJob={runsJob}
                    digest={digest}
                    worklist={worklist}
                    canModerate={flags.canModerate}
                    onQueueCountChange={setLiveQueueCount}
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
