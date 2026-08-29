'use client';

import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { NAV_ICON } from '~src/components/console-chrome/nav-icons';
import Link from '~src/components/link';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { CONCEPT_TILE, type TileConceptId } from '~src/lib/console/vocabulary';
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
import { SetupChecklistCard } from '../console/setup-checklist-card';
import type { AttentionItem } from '../moderation/attention/attention-model';
import styles from './board-overview.module.scss';
import { buildOverviewStats, timeAgo, topFeaturedRows } from './overview-model';
import { ResyncButton } from './resync-button';

// The four staging phases the import worker walks (SrcImportPhase), in order —
// drives the progress bar's filled-segment count.
const IMPORT_PHASES = ['meta', 'runs', 'matching', 'done'] as const;

// Concepts the dashboard already gives a dedicated panel; everything else the
// viewer can reach becomes a "Jump to" tile so the front door still leads
// everywhere the sidebar does.
const FEATURED_ON_DASHBOARD = new Set<NavItemId>([
    'categories',
    'moderators',
    'import',
    'setup',
    'attention',
]);

const AVATAR_HUES = [210, 160, 32, 280, 340, 130];
function avatarStyle(name: string): { background: string } {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    const hue = AVATAR_HUES[Math.abs(h) % AVATAR_HUES.length];
    return { background: `hsl(${hue} 55% 42%)` };
}

function humanRole(role: string): string {
    return role.replace(/[-_]/g, ' ');
}

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
    onNavigate: (id: NavItemId) => void;
    onEditCategory: (categoryId: number) => void;
}

/**
 * The console front door. A scannable board summary — KPIs, the featured
 * categories with their stats, board health, import status and the mod team —
 * built entirely from data the /manage page already loads (plus the latest
 * import job). Replaces the navigation-only tile grid: the sidebar is still the
 * fast path; this is the "what's the state of my board?" view.
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

    // The demoted tile grid: every reachable concept that isn't already a
    // dashboard panel, so nothing becomes unreachable from the front door.
    const jumpItems = navGroups
        .flatMap((g) => g.items)
        .filter(
            (it) => !FEATURED_ON_DASHBOARD.has(it.id) && it.id in CONCEPT_TILE,
        );

    return (
        <div className={styles.wrap}>
            <div className={styles.statusLine}>
                {setupIncomplete ? (
                    <span className={`${styles.statusPill} ${styles.setup}`}>
                        <span className={styles.beat} aria-hidden />
                        Setup in progress
                    </span>
                ) : (
                    <span className={`${styles.statusPill} ${styles.live}`}>
                        <span className={styles.beat} aria-hidden />
                        Board is live
                    </span>
                )}
                <span>
                    {stats.featured} categor{stats.featured === 1 ? 'y' : 'ies'}
                    {stats.categoryGroups > 0 &&
                        ` · ${stats.categoryGroups} group${stats.categoryGroups === 1 ? '' : 's'}`}
                    {stats.levels > 0 &&
                        ` · ${stats.levels} level${stats.levels === 1 ? '' : 's'}`}
                </span>
                <Link
                    className={styles.publicLink}
                    href={`/games-v2/${encodeURIComponent(game.name)}`}
                >
                    View public page
                    <BoxArrowUpRight size={12} aria-hidden className="ms-1" />
                </Link>
            </div>

            {/* KPI row */}
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

                {canModerate && (
                    <button
                        type="button"
                        className={`${styles.kpi} ${stats.attention.total > 0 ? styles.flag : ''}`}
                        onClick={() => onNavigate('attention')}
                    >
                        <span className={styles.kpiLabel}>Needs attention</span>
                        <span className={styles.kpiVal}>
                            {stats.attention.total}
                        </span>
                        <span className={styles.kpiSub}>
                            {stats.attention.total === 0
                                ? 'nothing waiting'
                                : `${stats.attention.flags} flags · ${stats.attention.reports} reports · ${stats.attention.claims} claims`}
                        </span>
                    </button>
                )}

                {showModerators && (
                    <button
                        type="button"
                        className={styles.kpi}
                        onClick={() => onNavigate('moderators')}
                    >
                        <span className={styles.kpiLabel}>Moderators</span>
                        <span className={styles.kpiVal}>
                            {stats.moderatorCount}
                        </span>
                        <span className={styles.kpiSub}>
                            {pendingApplications > 0
                                ? `${pendingApplications} application${pendingApplications === 1 ? '' : 's'} waiting`
                                : 'team'}
                        </span>
                    </button>
                )}

                {showImport && (
                    <button
                        type="button"
                        className={styles.kpi}
                        onClick={() => onNavigate('import')}
                    >
                        <span className={styles.kpiLabel}>Last import</span>
                        <span className={styles.kpiVal}>
                            {timeAgo(
                                syncJob?.runsImportedAt ??
                                    syncJob?.finishedAt ??
                                    syncJob?.createdAt,
                            ) ?? 'Never'}
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
                        <h2 className={styles.cardTitle}>Categories</h2>
                        <span className={styles.cardCount}>
                            {stats.featured} on board
                        </span>
                        <button
                            type="button"
                            className={styles.cardLink}
                            onClick={() => onNavigate('categories')}
                        >
                            Manage →
                        </button>
                    </header>
                    {topRows.length === 0 ? (
                        <p className={styles.emptyRow}>
                            No categories on the board yet.
                        </p>
                    ) : (
                        <>
                            <div className={styles.tableScroll}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Status</th>
                                            <th>Finished runs</th>
                                            <th>Runners</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topRows.map((r) => (
                                            <tr
                                                key={r.id}
                                                onClick={() =>
                                                    onEditCategory(r.id)
                                                }
                                            >
                                                <td>
                                                    <span
                                                        className={
                                                            styles.catName
                                                        }
                                                    >
                                                        {r.display}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`${styles.tag} ${styles.feat}`}
                                                    >
                                                        Featured
                                                    </span>
                                                </td>
                                                <td className={styles.num}>
                                                    <span
                                                        className={
                                                            styles.barCell
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.bar
                                                            }
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
                                                    className={`${styles.num} ${styles.muted}`}
                                                >
                                                    {r.uniqueRunners.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {remaining > 0 && (
                                <div className={styles.tableFoot}>
                                    + {remaining} more featured ·{' '}
                                    <button
                                        type="button"
                                        onClick={() => onNavigate('categories')}
                                    >
                                        See all categories →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* Rail */}
                <div className={styles.rail}>
                    {setupIncomplete && setupCompleteness ? (
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

                    {showImport && (
                        <section className={styles.card}>
                            <header className={styles.cardHead}>
                                <h2 className={styles.cardTitle}>
                                    Import &amp; sync
                                </h2>
                                <button
                                    type="button"
                                    className={styles.cardLink}
                                    onClick={() => onNavigate('import')}
                                >
                                    View details →
                                </button>
                            </header>
                            <div className={styles.cardBody}>
                                {syncJob ? (
                                    <>
                                        <div className={styles.syncRow}>
                                            <span className={styles.syncK}>
                                                Status
                                            </span>
                                            <span
                                                className={`${styles.syncV} ${styles.syncStatus} ${styles[syncJob.status] ?? ''}`}
                                            >
                                                {syncJob.status}
                                            </span>
                                        </div>
                                        <div className={styles.syncRow}>
                                            <span className={styles.syncK}>
                                                Last activity
                                            </span>
                                            <span className={styles.syncV}>
                                                {timeAgo(
                                                    syncJob.runsImportedAt ??
                                                        syncJob.finishedAt ??
                                                        syncJob.createdAt,
                                                ) ?? '—'}
                                            </span>
                                        </div>
                                        <div className={styles.syncRow}>
                                            <span className={styles.syncK}>
                                                Players matched
                                            </span>
                                            <span
                                                className={`${styles.syncV} ${styles.mono}`}
                                            >
                                                {syncJob.playersMatchedCount.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className={styles.syncRow}>
                                            <span className={styles.syncK}>
                                                Players unmatched
                                            </span>
                                            <span
                                                className={`${styles.syncV} ${styles.mono}`}
                                            >
                                                {Math.max(
                                                    0,
                                                    syncJob.playersCount -
                                                        syncJob.playersMatchedCount,
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        {syncJob.runsImportedAt && (
                                            <>
                                                <div className={styles.syncRow}>
                                                    <span
                                                        className={styles.syncK}
                                                    >
                                                        Runs matched
                                                    </span>
                                                    <span
                                                        className={`${styles.syncV} ${styles.mono}`}
                                                    >
                                                        {syncJob.importedRunsCount.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className={styles.syncRow}>
                                                    <span
                                                        className={styles.syncK}
                                                    >
                                                        Runs unmatched
                                                    </span>
                                                    <span
                                                        className={`${styles.syncV} ${styles.mono}`}
                                                    >
                                                        {syncJob.importSkippedCount.toLocaleString()}
                                                    </span>
                                                </div>
                                            </>
                                        )}
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
                                        {syncJob.changeSummary && (
                                            <ChangeSummaryLine
                                                summary={syncJob.changeSummary}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <p className={styles.syncEmpty}>
                                        No import has been run for this board
                                        yet.
                                    </p>
                                )}
                                <div className={styles.divider} />
                                {syncJob ? (
                                    <ResyncButton
                                        gameId={game.id}
                                        gameSlug={game.name}
                                        lastJobCreatedAt={syncJob.createdAt}
                                        running={
                                            syncJob.status === 'queued' ||
                                            syncJob.status === 'running'
                                        }
                                        onStarted={() => onNavigate('import')}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.railBtn}
                                        onClick={() => onNavigate('import')}
                                    >
                                        Run import
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

                    {showModerators && (
                        <section className={styles.card}>
                            <header className={styles.cardHead}>
                                <h2 className={styles.cardTitle}>Moderators</h2>
                                <span className={styles.cardCount}>
                                    {moderators.length}
                                </span>
                                <button
                                    type="button"
                                    className={styles.cardLink}
                                    onClick={() => onNavigate('moderators')}
                                >
                                    Manage →
                                </button>
                            </header>
                            <div className={styles.cardBody}>
                                {moderators.slice(0, 4).map((m) => (
                                    <div
                                        key={m.assignmentId}
                                        className={styles.modRow}
                                    >
                                        <span
                                            className={styles.avatar}
                                            style={avatarStyle(m.username)}
                                            aria-hidden
                                        >
                                            {m.username.slice(0, 2)}
                                        </span>
                                        <span>
                                            <span className={styles.modName}>
                                                {m.username}
                                            </span>
                                            <br />
                                            <span className={styles.modRole}>
                                                {humanRole(m.role)}
                                            </span>
                                        </span>
                                    </div>
                                ))}
                                {moderators.length > 4 && (
                                    <div className={styles.modRole}>
                                        + {moderators.length - 4} more
                                    </div>
                                )}
                                {moderators.length === 0 && (
                                    <p className={styles.syncEmpty}>
                                        No moderators yet.
                                    </p>
                                )}
                                {pendingApplications > 0 && (
                                    <button
                                        type="button"
                                        className={styles.appNote}
                                        onClick={() => onNavigate('moderators')}
                                    >
                                        {pendingApplications} application
                                        {pendingApplications === 1 ? '' : 's'}{' '}
                                        waiting — review
                                    </button>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Jump to */}
            {jumpItems.length > 0 && (
                <section className={styles.jump} aria-label="Jump to">
                    <h3 className={styles.jumpLabel}>Jump to</h3>
                    <div className={styles.tiles}>
                        {jumpItems.map((item) => {
                            const Icon = NAV_ICON[item.id];
                            const tile = CONCEPT_TILE[item.id as TileConceptId];
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={styles.tile}
                                    onClick={() => onNavigate(item.id)}
                                >
                                    <span className={styles.tileTop}>
                                        <Icon size={18} aria-hidden />
                                    </span>
                                    <span className={styles.tileAction}>
                                        {tile.action}
                                    </span>
                                    <span className={styles.tileBlurb}>
                                        {tile.blurb}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
