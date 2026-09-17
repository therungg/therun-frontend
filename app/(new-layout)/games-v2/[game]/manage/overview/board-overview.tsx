'use client';

import { BoxArrowUpRight } from 'react-bootstrap-icons';
import chrome from '~src/components/console-chrome/console.module.scss';
import { NAV_ICON } from '~src/components/console-chrome/nav-icons';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { CONCEPT_TILE } from '~src/lib/console/vocabulary';
import { splitLevelBoards } from '~src/lib/levels/display';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
import type { GameModerator } from '../../../../../../types/board-claims.types';
import type {
    ResolvedGame,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { SrcImportJob } from '../../../../../../types/src-import.types';
import type {
    WorklistDigest,
    WorklistPage,
} from '../../../../../../types/worklist.types';
import { BoardHealthCard } from '../console/board-health-card';
import {
    firstWorkspacePane,
    type NavGroup,
    type NavItemId,
    navItemLongLabel,
} from '../console/nav-model';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { isSettled } from '../src-import/use-src-import-job';
import styles from './board-overview.module.scss';
import { buildOverviewStats, timeAgo, topFeaturedRows } from './overview-model';
import { QueueSummary } from './queue-summary';

/** "Never" or a short date of the last finished job of one kind. */
function lastLine(job: SrcImportJob | null): string {
    if (!job) return 'Never';
    const d = new Date(job.finishedAt ?? job.createdAt);
    if (Number.isNaN(d.getTime())) return 'Never';
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// Concepts the overview already surfaces directly; everything else the viewer
// can reach becomes a quiet destination link so nothing is unreachable from
// the front door.
const FEATURED_ON_DASHBOARD = new Set<NavItemId>([
    'categories/list',
    'moderators',
    'import',
    'setup',
    'attention',
]);

interface Props {
    game: Pick<ResolvedGame, 'id' | 'name' | 'display'>;
    rows: ManageCategoryRow[];
    /** Category groups — splits level boards out of the category table and
     * supplies the group/level counts. */
    groups: ManageGroup[];
    attentionItems: AttentionItem[];
    moderators: GameModerator[];
    pendingApplications: number;
    setupCompleteness?: BoardCompleteness | null;
    boardHealth?: BoardHealth | null;
    syncJob?: SrcImportJob | null;
    /** Latest settings import — the import card's "Settings" line. */
    settingsJob?: SrcImportJob | null;
    /** Latest runs import — the import card's "Runs" line. */
    runsJob?: SrcImportJob | null;
    /** Seven-day summary of what the worklist decided and flagged. */
    digest?: WorklistDigest | null;
    /** First page of the mod queue — drives the queue summary. */
    worklist?: WorklistPage | null;
    /** The game's variables, to name each run's subcategory. */
    variables?: VariableRow[];
    /** Permission-filtered console nav — decides which cards and tiles show. */
    navGroups: NavGroup[];
    canModerate: boolean;
    onNavigate: (id: NavItemId) => void;
    onEditCategory: (categoryId: number) => void;
}

/**
 * The console front door. Leads with the queue state (does anything need a
 * moderator right now?), then the board's vitals, the category table, board
 * health and import status — built entirely from data the /manage page
 * already loads. The sidebar is still the fast path; this is the "what's the
 * state of my board?" view.
 */
export function BoardOverview({
    game,
    rows,
    groups,
    attentionItems,
    moderators,
    pendingApplications,
    setupCompleteness,
    boardHealth,
    syncJob,
    settingsJob,
    runsJob,
    digest,
    worklist,
    variables,
    navGroups,
    canModerate,
    onNavigate,
    onEditCategory,
}: Props) {
    const stats = buildOverviewStats({
        rows,
        groups,
        attentionItems,
        moderatorCount: moderators.length,
        pendingApplications,
    });
    // The category table lists full-game categories only — level boards are
    // counted under stats.levels and reached via the Levels pane, not mixed in.
    const { fullGame } = splitLevelBoards(rows, groups);
    const { shown: topRows, remaining } = topFeaturedRows(fullGame, 6);
    const maxRuns = Math.max(
        1,
        ...topRows.map((r) => r.totalFinishedAttemptCount),
    );

    // A moderator who cannot configure has Settings but not List.
    const categoriesPane = firstWorkspacePane(navGroups, 'categories');
    const navIds = new Set(navGroups.flatMap((g) => g.items.map((i) => i.id)));
    const showImport = navIds.has('import');
    // Same settle rule the import pane polls on — a resync is not done at
    // 'applied'/'imported', it still has import-runs and prune ahead of it.
    const importRunning = syncJob != null && !isSettled(syncJob);
    const showModerators = navIds.has('moderators');

    const setupIncomplete =
        setupCompleteness != null &&
        setupCompleteness.steps.find((s) => s.step === 'boards')?.status !==
            'done';

    // Every reachable concept that isn't already surfaced above, as one quiet
    // row of doors — the sidebar stays the real navigation.
    const jumpItems = navGroups
        .flatMap((g) => g.items)
        .filter(
            (it) => !FEATURED_ON_DASHBOARD.has(it.id) && it.id in CONCEPT_TILE,
        );

    const lastSyncAgo = timeAgo(
        syncJob?.runsImportedAt ?? syncJob?.finishedAt ?? syncJob?.createdAt,
    );

    return (
        <div className={styles.wrap}>
            <header className={chrome.paneHeader}>
                <div>
                    <div className={chrome.paneEyebrow}>Console</div>
                    <h2 className={chrome.paneTitle}>Overview</h2>
                </div>
                <div className={chrome.paneActions}>
                    <Link
                        className={styles.publicLink}
                        href={`/games-v2/${encodeURIComponent(game.name)}`}
                    >
                        View public board
                        <BoxArrowUpRight size={12} aria-hidden />
                    </Link>
                </div>
            </header>
            <p className={chrome.paneLede}>
                What needs a moderator, and the board's vitals.
            </p>

            {/* The mod queue before anything else: does anything need me? */}
            {canModerate && (
                <QueueSummary
                    worklist={worklist ?? null}
                    digest={digest ?? null}
                    variables={variables ?? []}
                    onOpenQueue={() => onNavigate('mod-queue')}
                    onOpenDecided={() => onNavigate('queue-history')}
                />
            )}

            {/* Vitals band */}
            <div className={styles.kpis}>
                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Categories</span>
                    <span className={styles.kpiVal}>{stats.featured}</span>
                    <span className={styles.kpiSub}>
                        {stats.categoryGroups > 0
                            ? `in ${stats.categoryGroups} group${stats.categoryGroups === 1 ? '' : 's'}`
                            : stats.archived > 0
                              ? `${stats.archived} archived`
                              : 'on the board'}
                    </span>
                </div>

                {stats.levels > 0 && (
                    <div className={styles.kpi}>
                        <span className={styles.kpiLabel}>Levels</span>
                        <span className={styles.kpiVal}>{stats.levels}</span>
                        <span className={styles.kpiSub}>individual levels</span>
                    </div>
                )}

                <div className={styles.kpi}>
                    <span className={styles.kpiLabel}>Finished runs</span>
                    <span className={styles.kpiVal}>
                        {stats.finishedRuns.toLocaleString()}
                    </span>
                    <span className={styles.kpiSub}>across all boards</span>
                </div>

                {showModerators && (
                    <button
                        type="button"
                        className={styles.kpiBtn}
                        onClick={() => onNavigate('moderators')}
                    >
                        <span className={styles.kpiLabel}>Moderators</span>
                        <span className={styles.kpiVal}>
                            {stats.moderatorCount}
                        </span>
                        <span
                            className={`${styles.kpiSub} ${pendingApplications > 0 ? styles.kpiSubAlert : ''}`}
                        >
                            {pendingApplications > 0
                                ? `${pendingApplications} application${pendingApplications === 1 ? '' : 's'} waiting`
                                : 'on the team'}
                        </span>
                    </button>
                )}

                {showImport && (
                    <button
                        type="button"
                        className={styles.kpiBtn}
                        onClick={() => onNavigate('import')}
                    >
                        <span className={styles.kpiLabel}>Last sync</span>
                        <span className={styles.kpiVal}>
                            {lastSyncAgo ?? 'Never'}
                        </span>
                        <span className={styles.kpiSub}>
                            {syncJob ? syncJob.status : 'no import yet'}
                        </span>
                    </button>
                )}
            </div>

            {/* Main grid */}
            <div className={styles.grid}>
                {/* Categories */}
                <section className={styles.card}>
                    <header className={styles.cardHead}>
                        <h3 className={styles.cardEyebrow}>Categories</h3>
                        <span className={styles.cardCount}>
                            {stats.featured}
                        </span>
                        {categoriesPane && (
                            <button
                                type="button"
                                className={styles.cardLink}
                                onClick={() => onNavigate(categoriesPane)}
                            >
                                Manage
                            </button>
                        )}
                    </header>
                    {topRows.length === 0 ? (
                        <div className={styles.cardEmpty}>
                            <p className={styles.cardEmptyTitle}>
                                No categories on the board yet
                            </p>
                        </div>
                    ) : (
                        <>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Finished runs</th>
                                        <th>Runners</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topRows.map((r) => (
                                        <tr
                                            key={r.id}
                                            tabIndex={0}
                                            onClick={() => onEditCategory(r.id)}
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === 'Enter' ||
                                                    e.key === ' '
                                                ) {
                                                    e.preventDefault();
                                                    onEditCategory(r.id);
                                                }
                                            }}
                                        >
                                            <td>
                                                <span
                                                    className={styles.catName}
                                                >
                                                    {r.display}
                                                </span>
                                            </td>
                                            <td className={styles.num}>
                                                <span
                                                    className={styles.barCell}
                                                >
                                                    <span
                                                        className={styles.bar}
                                                        aria-hidden
                                                    >
                                                        <i
                                                            style={{
                                                                width: `${Math.round((r.totalFinishedAttemptCount / maxRuns) * 100)}%`,
                                                            }}
                                                        />
                                                    </span>
                                                    {r.totalFinishedAttemptCount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td
                                                className={`${styles.num} ${styles.numMuted}`}
                                            >
                                                {r.uniqueRunners.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {remaining > 0 && categoriesPane && (
                                <div className={styles.tableFoot}>
                                    + {remaining} more featured ·{' '}
                                    <button
                                        type="button"
                                        className={styles.tableFootLink}
                                        onClick={() =>
                                            onNavigate(categoriesPane)
                                        }
                                    >
                                        See all categories
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Rail: health / setup progress + import status */}
                <div className={styles.rail}>
                    {setupIncomplete && setupCompleteness ? (
                        <section className={styles.railCard}>
                            <header className={styles.railHead}>
                                <h3 className={styles.railEyebrow}>
                                    Setup progress
                                </h3>
                            </header>
                            <div className={styles.setupMeter} aria-hidden>
                                <div
                                    className={styles.setupFill}
                                    style={{
                                        width: `${Math.round((setupCompleteness.doneCount / Math.max(1, setupCompleteness.totalCount)) * 100)}%`,
                                    }}
                                />
                            </div>
                            <p className={styles.setupSub}>
                                {setupCompleteness.doneCount} of{' '}
                                {setupCompleteness.totalCount} steps done
                            </p>
                            <button
                                type="button"
                                className={styles.railBtn}
                                onClick={() => onNavigate('setup')}
                            >
                                Continue setup
                            </button>
                        </section>
                    ) : (
                        boardHealth && (
                            <BoardHealthCard
                                gameSlug={game.name}
                                health={boardHealth}
                                className={styles.railFlush}
                            />
                        )
                    )}

                    {showImport && (
                        <section className={styles.railCard}>
                            <header className={styles.railHead}>
                                <h3 className={styles.railEyebrow}>Import</h3>
                                <button
                                    type="button"
                                    className={styles.railLink}
                                    onClick={() => onNavigate('import')}
                                >
                                    Open
                                </button>
                            </header>
                            {syncJob ? (
                                <>
                                    {importRunning && (
                                        <p className={styles.syncEmpty}>
                                            An import is running.
                                        </p>
                                    )}
                                    <div className={styles.syncRow}>
                                        <span className={styles.syncK}>
                                            Settings
                                        </span>
                                        <span className={styles.syncV}>
                                            {lastLine(settingsJob ?? null)}
                                        </span>
                                    </div>
                                    <div className={styles.syncRow}>
                                        <span className={styles.syncK}>
                                            Runs
                                        </span>
                                        <span className={styles.syncV}>
                                            {lastLine(runsJob ?? null)}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className={styles.syncEmpty}>
                                        This board isn’t linked to its source
                                        yet.
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.railBtn}
                                        onClick={() => onNavigate('import')}
                                    >
                                        Link and import
                                    </button>
                                </>
                            )}
                        </section>
                    )}
                </div>
            </div>

            {/* Other destinations: one quiet row, not a wall of boxes. */}
            {jumpItems.length > 0 && (
                <nav className={styles.jump} aria-label="Also in this console">
                    <span className={styles.jumpLabel}>Also here</span>
                    {jumpItems.map((item) => {
                        const Icon = NAV_ICON[item.id];
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={styles.jumpLink}
                                onClick={() => onNavigate(item.id)}
                            >
                                <Icon size={14} aria-hidden />
                                {navItemLongLabel(item)}
                            </button>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
