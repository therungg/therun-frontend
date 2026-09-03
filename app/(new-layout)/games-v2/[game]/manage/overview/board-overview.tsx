'use client';

import { BoxArrowUpRight } from 'react-bootstrap-icons';
import chrome from '~src/components/console-chrome/console.module.scss';
import { NAV_ICON } from '~src/components/console-chrome/nav-icons';
import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { CONCEPT_TILE } from '~src/lib/console/vocabulary';
import { splitLevelBoards } from '~src/lib/levels/display';
import type { BoardCompleteness } from '~src/lib/setup/completeness';
import type { BoardHealth } from '~src/lib/setup/health';
import type { GameModerator } from '../../../../../../types/board-claims.types';
import type { ResolvedGame } from '../../../../../../types/leaderboards.types';
import type {
    SrcCommitChangeSummary,
    SrcImportJob,
} from '../../../../../../types/src-import.types';
import { BoardHealthCard } from '../console/board-health-card';
import type { NavGroup, NavItemId } from '../console/nav-model';
import type { AttentionItem } from '../moderation/attention/attention-model';
import styles from './board-overview.module.scss';
import { buildOverviewStats, timeAgo, topFeaturedRows } from './overview-model';
import { ResyncButton } from './resync-button';

// The staging phases the import worker walks (SrcImportPhase), in order —
// drives the progress bar's filled-segment count while a job is running.
const IMPORT_PHASES = ['meta', 'players', 'matching', 'runs', 'done'] as const;

// Concepts the overview already surfaces directly; everything else the viewer
// can reach becomes a quiet destination link so nothing is unreachable from
// the front door.
const FEATURED_ON_DASHBOARD = new Set<NavItemId>([
    'categories',
    'moderators',
    'import',
    'setup',
    'attention',
]);

const SEV_CLASS = {
    high: 'sevHigh',
    medium: 'sevMedium',
    low: 'sevLow',
} as const;

const SOURCE_LABEL = {
    flag: 'flag',
    report: 'report',
    appeal: 'appeal',
    self_claim: 'claim',
} as const;

/**
 * The delta a re-sync produced, shown under the import status so a moderator
 * sees what changed rather than a bare "done". Lists only non-zero counts; an
 * all-zero summary reads "No changes".
 */
function ChangeSummaryLine({ summary }: { summary: SrcCommitChangeSummary }) {
    const parts: string[] = [];
    if (summary.added > 0) parts.push(`${summary.added} added`);
    if (summary.updated > 0) parts.push(`${summary.updated} updated`);
    if (summary.removed > 0) parts.push(`${summary.removed} removed`);
    if (summary.archived > 0) {
        parts.push(
            `${summary.archived} categor${summary.archived === 1 ? 'y' : 'ies'} archived`,
        );
    }
    return (
        <p className={styles.changeSummary}>
            <span className={styles.changeLabel}>Last sync changed</span>
            {parts.length > 0 ? parts.join(' · ') : 'No changes'}
        </p>
    );
}

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
    /** Permission-filtered console nav — decides which cards and tiles show. */
    navGroups: NavGroup[];
    canModerate: boolean;
    /** Global admin — bypasses the re-sync once-per-day cooldown. */
    isAdmin: boolean;
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
    navGroups,
    canModerate,
    isAdmin,
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

    const navIds = new Set(navGroups.flatMap((g) => g.items.map((i) => i.id)));
    const showImport = navIds.has('import');
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

    // Items arrive sorted severity desc, oldest first within a severity — so
    // the first rows are exactly what a moderator should judge first.
    const attentionTotal = stats.attention.total;
    const topSeverity = attentionItems[0]?.severity ?? null;
    const previewItems = attentionItems.slice(0, 3);
    const oldestCreatedAt =
        attentionItems.length > 0
            ? attentionItems.reduce(
                  (min, it) => (it.createdAt < min ? it.createdAt : min),
                  attentionItems[0].createdAt,
              )
            : null;

    const breakdownParts: string[] = [];
    if (stats.attention.flags > 0) {
        breakdownParts.push(
            `${stats.attention.flags} flag${stats.attention.flags === 1 ? '' : 's'}`,
        );
    }
    if (stats.attention.reports > 0) {
        breakdownParts.push(
            `${stats.attention.reports} report${stats.attention.reports === 1 ? '' : 's'}`,
        );
    }
    if (stats.attention.claims > 0) {
        breakdownParts.push(
            `${stats.attention.claims} claim${stats.attention.claims === 1 ? '' : 's'}`,
        );
    }
    const oldestAgo = timeAgo(oldestCreatedAt);
    if (oldestAgo) breakdownParts.push(`oldest ${oldestAgo}`);

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

            {/* Status headline: the queue state before anything else. */}
            {canModerate && (
                <section
                    className={styles.status}
                    data-sev={attentionTotal > 0 ? topSeverity : undefined}
                    aria-label="Queue status"
                >
                    <div className={styles.statusHead}>
                        <span className={styles.statusCount}>
                            {attentionTotal}
                        </span>
                        <div className={styles.statusText}>
                            <h3 className={styles.statusTitle}>
                                {attentionTotal === 0
                                    ? 'All clear'
                                    : 'Waiting for review'}
                            </h3>
                            <p className={styles.statusSub}>
                                {attentionTotal === 0
                                    ? 'No flags, reports or claims waiting.'
                                    : breakdownParts.join(' · ')}
                            </p>
                        </div>
                        {attentionTotal > 0 && (
                            <button
                                type="button"
                                className={styles.statusOpen}
                                onClick={() => onNavigate('attention')}
                            >
                                Open the queue
                            </button>
                        )}
                    </div>
                    {previewItems.length > 0 && (
                        <ul className={styles.previewList}>
                            {previewItems.map((item) => (
                                <li key={item.key}>
                                    <button
                                        type="button"
                                        className={`${styles.previewRow} ${styles[SEV_CLASS[item.severity]]}`}
                                        onClick={() => onNavigate('attention')}
                                    >
                                        <span className={styles.previewRunner}>
                                            {item.runnerName}
                                        </span>
                                        <span className={styles.previewCat}>
                                            {item.categoryName}
                                        </span>
                                        <span className={styles.previewTime}>
                                            <DurationToFormatted
                                                duration={item.timeMs}
                                                withMillis
                                            />
                                        </span>
                                        <span className={styles.previewSource}>
                                            {item.sources
                                                .map((s) => SOURCE_LABEL[s])
                                                .join(' · ')}
                                        </span>
                                        <span className={styles.previewAge}>
                                            {timeAgo(item.createdAt)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {attentionTotal > previewItems.length && (
                        <p className={styles.previewMore}>
                            + {attentionTotal - previewItems.length} more in the
                            queue
                        </p>
                    )}
                </section>
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
                        <button
                            type="button"
                            className={styles.cardLink}
                            onClick={() => onNavigate('categories')}
                        >
                            Manage
                        </button>
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
                            {remaining > 0 && (
                                <div className={styles.tableFoot}>
                                    + {remaining} more featured ·{' '}
                                    <button
                                        type="button"
                                        className={styles.tableFootLink}
                                        onClick={() => onNavigate('categories')}
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
                                <h3 className={styles.railEyebrow}>
                                    Import &amp; sync
                                </h3>
                                <button
                                    type="button"
                                    className={styles.railLink}
                                    onClick={() => onNavigate('import')}
                                >
                                    Details
                                </button>
                            </header>
                            {syncJob ? (
                                <>
                                    <div className={styles.syncStatusRow}>
                                        <span
                                            className={styles.syncPill}
                                            data-status={syncJob.status}
                                        >
                                            {syncJob.status}
                                        </span>
                                        {lastSyncAgo && (
                                            <span className={styles.syncAge}>
                                                {lastSyncAgo}
                                            </span>
                                        )}
                                    </div>
                                    {(syncJob.status === 'queued' ||
                                        syncJob.status === 'running') && (
                                        <div
                                            className={styles.phaseBar}
                                            aria-hidden
                                        >
                                            {IMPORT_PHASES.map((phase, i) => {
                                                const reached =
                                                    IMPORT_PHASES.indexOf(
                                                        syncJob.phase,
                                                    );
                                                return (
                                                    <span
                                                        key={phase}
                                                        className={
                                                            i <= reached
                                                                ? styles.on
                                                                : ''
                                                        }
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className={styles.syncRow}>
                                        <span className={styles.syncK}>
                                            Players matched
                                        </span>
                                        <span className={styles.syncV}>
                                            {syncJob.playersMatchedCount.toLocaleString()}
                                            {' / '}
                                            {syncJob.playersCount.toLocaleString()}
                                        </span>
                                    </div>
                                    {syncJob.runsImportedAt && (
                                        <div className={styles.syncRow}>
                                            <span className={styles.syncK}>
                                                Runs matched
                                            </span>
                                            <span className={styles.syncV}>
                                                {syncJob.importedRunsCount.toLocaleString()}
                                                {syncJob.importSkippedCount > 0
                                                    ? ` (${syncJob.importSkippedCount.toLocaleString()} skipped)`
                                                    : ''}
                                            </span>
                                        </div>
                                    )}
                                    {syncJob.changeSummary && (
                                        <ChangeSummaryLine
                                            summary={syncJob.changeSummary}
                                        />
                                    )}
                                </>
                            ) : (
                                <p className={styles.syncEmpty}>
                                    No import has been run for this board yet.
                                </p>
                            )}
                            <div className={styles.divider} />
                            {syncJob ? (
                                <>
                                    <ResyncButton
                                        gameId={game.id}
                                        gameSlug={game.name}
                                        kind="settings"
                                        label="Import settings"
                                        lastJobCreatedAt={
                                            syncJob.kind === 'settings'
                                                ? syncJob.createdAt
                                                : null
                                        }
                                        running={
                                            syncJob.status === 'queued' ||
                                            syncJob.status === 'running'
                                        }
                                        bypassCooldown={isAdmin}
                                        onStarted={() => onNavigate('import')}
                                    />
                                    <ResyncButton
                                        gameId={game.id}
                                        gameSlug={game.name}
                                        kind="resync"
                                        label="Import runs of therun runners"
                                        lastJobCreatedAt={
                                            syncJob.kind === 'resync'
                                                ? syncJob.createdAt
                                                : null
                                        }
                                        running={
                                            syncJob.status === 'queued' ||
                                            syncJob.status === 'running'
                                        }
                                        bypassCooldown={isAdmin}
                                        onStarted={() => onNavigate('import')}
                                    />
                                    <p className={styles.railHint}>
                                        Settings pulls categories, rules and
                                        timing. Runs imports and verifies runs
                                        of runners who have a therun account.
                                    </p>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.railBtn}
                                    onClick={() => onNavigate('import')}
                                >
                                    Run import
                                </button>
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
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
            )}
        </div>
    );
}
