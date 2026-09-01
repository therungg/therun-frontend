'use client';

import moment from 'moment';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import consoleStyles from '~src/components/console-chrome/console.module.scss';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../../types/leaderboards.types';
import type {
    AnonymizeRuleWithNames,
    GameExclusionRuleRow,
    LeaderboardRosterRow,
    ManualTimeRow,
    PublicModLogEntry,
} from '../../../../../../../../types/moderation.types';
import { formatSubcategoryKey } from '../../../../labels';
import bulkBarStyles from '../../../../leaderboard/bulk-bar.module.scss';
import { LogRow } from '../../../../leaderboard/moderation/moderation-log-view';
import logStyles from '../../../../leaderboard/moderation/moderation-log-view.module.scss';
import {
    normalizeVerificationStatus,
    VerificationBadge,
} from '../../../../run-view/run-badges';
import { BackLink } from '../../../../shared/back-link';
import { RunnerDialog } from '../../../boards/runner-dialog';
import { ManualTimeVerdictRow } from '../../attention/manual-time-verdict-row';
import { deleteRuleAction } from '../../rules/actions/delete-rule.action';
import type { ModVerb, RunActionTarget } from '../../shared/action-model';
import {
    anonymizeUserAction,
    anonymizeUserGloballyAction,
    liftAnonymizeRuleAction,
} from '../../shared/actions/anonymize-rules.action';
import { deleteManualTimeAction } from '../../shared/actions/manual-times.action';
import { ManualTimeDialog } from '../../shared/manual-time-dialog';
import { RunActionDialog } from '../../shared/run-action-dialog';
import {
    publicBoardHref,
    type RunnerBanState,
    type RunnerCombo,
    type RunnerSummary,
} from './runner-model';
import styles from './runner-view.module.scss';

interface Props {
    gameSlug: string;
    gameDisplay: string;
    userId: number;
    runnerName: string;
    combos: RunnerCombo[];
    banState: RunnerBanState;
    summary: RunnerSummary;
    categories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
    /** This runner's slice of the game's public mod log (workstream F's
     * endpoint, `targetUserId` filter) — reused verbatim via `LogRow`. */
    modLog: PublicModLogEntry[];
    modLogTotal: number;
    /**
     * Every anonymize rule targeting this runner — live AND lifted, this
     * game's plus any site-wide one. Carries REAL identities; this page is
     * mod-gated, so that is the point (mods need the name to enforce).
     * Run-scoped rules are absent by contract: the backend's `targetUserId`
     * filter matches `type: 'user'` rules only.
     */
    anonymizeRules: AnonymizeRuleWithNames[];
    /** Where "Back" goes — resolved server-side in page.tsx. */
    backHref: string;
    backLabel: string;
}

type DialogState =
    | { kind: 'action'; verb: ModVerb; target: RunActionTarget }
    | { kind: 'manual'; combo: RunnerCombo; existing?: ManualTimeRow }
    | null;

type RunnerDialogState = {
    scope: 'board' | 'game' | 'site';
    category: ResolvedCategory;
    subcategoryKey: string;
} | null;

const MIN_REASON = 10;

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/** One-shot reason capture for lift-ban / delete-manual-time inline flows. */
function InlineReasonForm({
    id,
    label,
    cta,
    onSubmit,
    onCancel,
}: {
    id: string;
    label: string;
    cta: string;
    /** Returns an error message, or null on success. */
    onSubmit: (reason: string) => Promise<string | null>;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isWorking, startWork] = useTransition();
    const reasonOk = reason.trim().length >= MIN_REASON;

    return (
        <div className={styles.inlineForm}>
            <label htmlFor={id} className="form-label small text-muted mb-0">
                {label} (required, min {MIN_REASON} characters, audit-logged)
            </label>
            <textarea
                id={id}
                className="form-control form-control-sm"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isWorking}
            />
            {error && (
                <div className="text-danger small" role="alert">
                    {error}
                </div>
            )}
            <div className="d-flex gap-2">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onCancel}
                    disabled={isWorking}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={isWorking || !reasonOk}
                    onClick={() => {
                        setError(null);
                        startWork(async () => {
                            const err = await onSubmit(reason.trim());
                            if (err) setError(err);
                        });
                    }}
                >
                    {isWorking ? 'Working…' : cta}
                </button>
            </div>
        </div>
    );
}

export function RunnerView({
    gameSlug,
    gameDisplay,
    userId,
    runnerName,
    combos,
    banState,
    summary,
    categories,
    variables,
    canSiteBan,
    modLog,
    modLogTotal,
    anonymizeRules,
    backHref,
    backLabel,
}: Props) {
    const router = useRouter();

    // A single flat selection spans every board's runs — the runner
    // dossier's "everything about this runner" list is one bulk-bar
    // surface, not one per board (mock fig. 7's note: "same checkbox
    // column as the board, so a selection here feeds the same bulk bar").
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<DialogState>(null);
    const [runnerDialog, setRunnerDialog] = useState<RunnerDialogState>(null);
    const [liftingRuleId, setLiftingRuleId] = useState<number | null>(null);
    // Identity card: which scope is mid-apply, and which rule is mid-lift.
    // `hidingScope` is 'game' | 'global' | a category id, never both at once.
    const [hidingScope, setHidingScope] = useState<
        'game' | 'global' | number | null
    >(null);
    const [liftingAnonId, setLiftingAnonId] = useState<number | null>(null);
    const [deletingManualId, setDeletingManualId] = useState<number | null>(
        null,
    );

    const comboLabel = (c: RunnerCombo) => {
        const sub = formatSubcategoryKey(c.subcategoryKey);
        return sub ? `${c.categoryDisplay} · ${sub}` : c.categoryDisplay;
    };

    const isBanned =
        banState.gameRule != null || banState.categoryRules.length > 0;

    const afterMutation = () => {
        setDialog(null);
        setRunnerDialog(null);
        setSelected(new Set());
        setLiftingRuleId(null);
        setDeletingManualId(null);
        setHidingScope(null);
        setLiftingAnonId(null);
        // Everything on this page came from the server loader; refetch.
        router.refresh();
    };

    const toggleRun = (runId: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(runId)) next.delete(runId);
            else next.add(runId);
            return next;
        });
    };

    const openRunsAction = (verb: ModVerb, runIds: number[], label: string) => {
        if (runIds.length === 0) return;
        setDialog({
            kind: 'action',
            verb,
            target: { kind: 'runs', runIds, label },
        });
    };

    const liftBan = async (rule: GameExclusionRuleRow, reason: string) => {
        const res = await deleteRuleAction(gameSlug, rule.ruleId, reason);
        if ('error' in res) return res.error;
        toast.success(
            `Ban lifted. ${res.result.reinstatedRunCount} run${
                res.result.reinstatedRunCount === 1 ? '' : 's'
            } reinstated.`,
        );
        afterMutation();
        return null;
    };

    const deleteManual = async (row: ManualTimeRow, reason: string) => {
        const res = await deleteManualTimeAction(gameSlug, row.id, reason);
        if ('error' in res) return res.error;
        toast.success('Manual time deleted.');
        afterMutation();
        return null;
    };

    const unbanRow = (rule: GameExclusionRuleRow, label: string) =>
        liftingRuleId === rule.ruleId ? (
            <InlineReasonForm
                id={`lift-ban-${rule.ruleId}`}
                label="Lift reason"
                cta="Lift ban"
                onSubmit={(reason) => liftBan(rule, reason)}
                onCancel={() => setLiftingRuleId(null)}
            />
        ) : (
            <button
                type="button"
                className={`${styles.pillBtn} ${styles.pillBtnDanger}`}
                onClick={() => setLiftingRuleId(rule.ruleId)}
            >
                Unban…
            </button>
        );

    // ── Identity (anonymize, design doc §C / mocks fig. 7) ──────────────────
    // Anonymize is deliberately NOT part of the ban card: banning removes runs
    // from boards, anonymizing leaves every run and rank exactly where it is
    // and only replaces the public name. Its own block, with its permanence
    // stated, is what the mock asks for.
    // `type: 'run'` rules also carry a null gameId, so narrow to user rules
    // before reading a null gameId as "global" — the page's own query filters
    // run rules out today, but the invariant should not live in the caller.
    const liveAnonRules = anonymizeRules.filter(
        (r) => r.liftedAt == null && r.type === 'user',
    );
    const globalAnon = liveAnonRules.find((r) => r.gameId == null) ?? null;
    const gameAnon =
        liveAnonRules.find((r) => r.gameId != null && r.categoryId == null) ??
        null;
    const categoryAnonFor = (categoryId: number) =>
        liveAnonRules.find((r) => r.categoryId === categoryId) ?? null;
    // A wider live rule already masks this runner here — a narrower one would
    // change nothing, so say so instead of offering a no-op button.
    const coveringAnon = globalAnon ?? gameAnon;

    const applyAnonymize = async (
        scope: 'game' | 'global' | number,
        reason: string,
    ): Promise<string | null> => {
        const res =
            scope === 'global'
                ? await anonymizeUserGloballyAction(gameSlug, {
                      userId,
                      reason,
                  })
                : await anonymizeUserAction(gameSlug, {
                      userId,
                      reason,
                      categoryId: scope === 'game' ? null : scope,
                  });
        if ('error' in res) return res.error;
        toast.success(
            res.result.alreadyExists
                ? 'Already hidden at this scope. Nothing changed.'
                : `Identity hidden. The public now sees ${res.result.rule.displayName}.`,
        );
        afterMutation();
        return null;
    };

    const liftAnonymize = async (
        rule: AnonymizeRuleWithNames,
        reason: string,
    ): Promise<string | null> => {
        const res = await liftAnonymizeRuleAction(gameSlug, {
            ruleId: rule.ruleId,
            reason,
            targetUserId: rule.type === 'user' ? rule.targetId : null,
            global: rule.gameId == null,
        });
        if ('error' in res) return res.error;
        toast.success('Identity restored. The real name is public again.');
        afterMutation();
        return null;
    };

    /**
     * Trailing control for one Identity scope row. Verbs are never hidden:
     * a game mod sees the Lift button, disabled, with the reason in its
     * tooltip — hiding it would leave them guessing why nothing is offered.
     */
    const anonScopeControl = (
        key: 'game' | 'global' | number,
        rule: AnonymizeRuleWithNames | null,
        opts: { canApply: boolean; applyDisabledReason?: string },
    ) => {
        if (rule) {
            return liftingAnonId === rule.ruleId ? (
                <InlineReasonForm
                    id={`lift-anon-${rule.ruleId}`}
                    label="Lift reason"
                    cta="Restore identity"
                    onSubmit={(reason) => liftAnonymize(rule, reason)}
                    onCancel={() => setLiftingAnonId(null)}
                />
            ) : (
                <button
                    type="button"
                    className={styles.pillBtn}
                    disabled={!canSiteBan}
                    title={
                        canSiteBan
                            ? 'Lift this rule, so the real name becomes public again'
                            : 'Lifting requires a site admin'
                    }
                    onClick={() => setLiftingAnonId(rule.ruleId)}
                >
                    Lift…
                </button>
            );
        }
        if (hidingScope === key) {
            return (
                <InlineReasonForm
                    id={`hide-identity-${String(key)}`}
                    label="Reason"
                    cta="Hide identity"
                    onSubmit={(reason) => applyAnonymize(key, reason)}
                    onCancel={() => setHidingScope(null)}
                />
            );
        }
        return (
            <button
                type="button"
                className={styles.pillBtn}
                disabled={!opts.canApply}
                title={opts.applyDisabledReason}
                onClick={() => setHidingScope(key)}
            >
                Hide…
            </button>
        );
    };

    // One row per distinct category the runner appears on — a combo is
    // (category, subcategoryKey), but a ban rule is category-scoped, so
    // subcategories of the same category share one scope row.
    const categoriesInPlay = Array.from(
        new Map(
            combos.map((c) => [
                c.categoryId,
                { id: c.categoryId, display: c.categoryDisplay },
            ]),
        ).values(),
    );
    const resolvedCategoryFor = (categoryId: number): ResolvedCategory =>
        (categories.find((c) => c.id === categoryId) ??
            categories[0]) as ResolvedCategory;
    const firstCombo = combos[0] ?? null;

    // RunnerDialog wants a LeaderboardRosterRow; only userId/runnerName are
    // ever read off it (it acts on the runner, not one specific run), so a
    // representative run (or zeroed placeholder when the runner has none)
    // satisfies the shape without a live run backing it.
    const rosterRow: LeaderboardRosterRow = {
        runId: firstCombo?.board?.runId ?? 0,
        userId,
        runnerName,
        subcategoryKey: firstCombo?.subcategoryKey ?? '',
        time: firstCombo?.board?.time ?? null,
        gameTime: firstCombo?.board?.gameTime ?? null,
        verificationStatus: firstCombo?.board?.verificationStatus ?? 'verified',
        vodUrl: null,
        endedAt: '',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: true,
    };

    const selectedRunIds = Array.from(selected);

    return (
        <div>
            <div className={consoleStyles.paneHeader}>
                <h1 className={consoleStyles.paneTitle}>
                    {runnerName}{' '}
                    <span className="text-muted fs-6">in {gameDisplay}</span>{' '}
                    {banState.gameRule && (
                        <span className="badge text-bg-danger align-middle">
                            Banned from game
                        </span>
                    )}
                    {!banState.gameRule &&
                        banState.categoryRules.length > 0 && (
                            <span className="badge text-bg-warning align-middle">
                                {banState.categoryRules.length} board ban
                                {banState.categoryRules.length === 1 ? '' : 's'}
                            </span>
                        )}
                </h1>
                <div className={`${consoleStyles.paneActions} flex-wrap`}>
                    <BackLink href={backHref} label={backLabel} />
                </div>
            </div>
            <p className={consoleStyles.paneLede}>
                User #{userId} · everything this game's moderation knows about{' '}
                {runnerName}.
            </p>

            <div className={styles.tiles}>
                <div className={styles.tile}>
                    <span className={styles.tileLabel}>Boards</span>
                    <span className={styles.tileValue}>
                        {summary.comboCount}
                    </span>
                </div>
                <div className={styles.tile}>
                    <span className={styles.tileLabel}>Eligible runs</span>
                    <span className={styles.tileValue}>{summary.runCount}</span>
                </div>
                {summary.bestRank && (
                    <div className={styles.tile}>
                        <span className={styles.tileLabel}>Best rank</span>
                        <span className={styles.tileValue}>
                            #{summary.bestRank.rank}
                        </span>
                    </div>
                )}
                {summary.manualCount > 0 && (
                    <div className={styles.tile}>
                        <span className={styles.tileLabel}>Manual times</span>
                        <span className={styles.tileValue}>
                            {summary.manualCount}
                        </span>
                    </div>
                )}
                {summary.lastActive && (
                    <div className={styles.tile}>
                        <span className={styles.tileLabel}>Last active</span>
                        <span className={styles.tileValue}>
                            {fmtDate(summary.lastActive)}
                        </span>
                    </div>
                )}
                {isBanned && (
                    <div className={`${styles.tile} ${styles.tileDanger}`}>
                        <span className={styles.tileLabel}>Ban status</span>
                        <span className={styles.tileValue}>Banned</span>
                    </div>
                )}
            </div>

            <div className={styles.layout}>
                <div className={styles.runsPanel}>
                    {combos.length === 0 ? (
                        <p className="text-muted">
                            No eligible runs or manual times for this runner in
                            this game.
                        </p>
                    ) : (
                        combos.map((combo) => (
                            <section
                                key={combo.key}
                                className={styles.boardGroup}
                            >
                                <div className={styles.boardGroupHead}>
                                    <h2 className={styles.boardGroupTitle}>
                                        {comboLabel(combo)}
                                    </h2>
                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() =>
                                                setDialog({
                                                    kind: 'manual',
                                                    combo,
                                                })
                                            }
                                        >
                                            Set a time…
                                        </button>
                                        {(() => {
                                            const href = publicBoardHref(
                                                gameSlug,
                                                combo,
                                            );
                                            return href ? (
                                                <a
                                                    className="btn btn-sm btn-outline-secondary"
                                                    href={href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    View board ↗
                                                </a>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>

                                {combo.runs.length === 0 ? (
                                    <p className="text-muted small">
                                        No eligible runs on this board, only
                                        manual times below.
                                    </p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th
                                                        style={{ width: '1%' }}
                                                    />
                                                    <th className="text-end">
                                                        Rank
                                                    </th>
                                                    <th className="text-end">
                                                        Time
                                                    </th>
                                                    <th>Date</th>
                                                    <th className="text-center">
                                                        Status
                                                    </th>
                                                    <th className="text-end">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {combo.runs.map((r) => {
                                                    const status =
                                                        normalizeVerificationStatus(
                                                            r.verificationStatus,
                                                        );
                                                    const primaryMs =
                                                        combo.primaryTiming ===
                                                        'gametime'
                                                            ? r.gameTime
                                                            : r.time;
                                                    return (
                                                        <tr key={r.runId}>
                                                            <td>
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input"
                                                                    aria-label={`Select run ${r.runId}`}
                                                                    checked={selected.has(
                                                                        r.runId,
                                                                    )}
                                                                    onChange={() =>
                                                                        toggleRun(
                                                                            r.runId,
                                                                        )
                                                                    }
                                                                />
                                                            </td>
                                                            <td className="text-end">
                                                                {r.rank != null
                                                                    ? `#${r.rank}`
                                                                    : '—'}
                                                            </td>
                                                            <td className="text-end">
                                                                {primaryMs !=
                                                                null ? (
                                                                    <DurationToFormatted
                                                                        duration={
                                                                            primaryMs
                                                                        }
                                                                    />
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </td>
                                                            <td className="small">
                                                                {moment(
                                                                    r.endedAt,
                                                                ).fromNow()}
                                                            </td>
                                                            <td className="text-center">
                                                                <VerificationBadge
                                                                    status={
                                                                        status
                                                                    }
                                                                />
                                                            </td>
                                                            <td className="text-end">
                                                                <div
                                                                    className={
                                                                        styles.rowActions
                                                                    }
                                                                >
                                                                    {status ===
                                                                        'pending' && (
                                                                        <button
                                                                            type="button"
                                                                            className={
                                                                                styles.approveBtn
                                                                            }
                                                                            onClick={() =>
                                                                                openRunsAction(
                                                                                    'approve',
                                                                                    [
                                                                                        r.runId,
                                                                                    ],
                                                                                    `this ${comboLabel(combo)} run`,
                                                                                )
                                                                            }
                                                                        >
                                                                            Verify
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        className={
                                                                            styles.removeBtn
                                                                        }
                                                                        onClick={() =>
                                                                            openRunsAction(
                                                                                'remove',
                                                                                [
                                                                                    r.runId,
                                                                                ],
                                                                                `this ${comboLabel(combo)} run`,
                                                                            )
                                                                        }
                                                                    >
                                                                        Remove…
                                                                    </button>
                                                                    <a
                                                                        className={
                                                                            styles.pillBtn
                                                                        }
                                                                        href={`/games-v2/${encodeURIComponent(gameSlug)}/manage/run/${r.runId}`}
                                                                    >
                                                                        Open
                                                                    </a>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {combo.manualTimes.length > 0 && (
                                    <div className={styles.manualList}>
                                        {combo.manualTimes.map((m) => (
                                            <div
                                                key={m.id}
                                                className={styles.manualRow}
                                            >
                                                <div
                                                    className={styles.manualTop}
                                                >
                                                    <span
                                                        className={
                                                            styles.manualTime
                                                        }
                                                    >
                                                        <DurationToFormatted
                                                            duration={m.timeMs}
                                                        />
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.timingPill
                                                        }
                                                    >
                                                        {m.timing === 'gametime'
                                                            ? 'GT'
                                                            : 'RT'}
                                                    </span>
                                                    <VerificationBadge
                                                        status={
                                                            m.verificationStatus
                                                        }
                                                    />
                                                    <div
                                                        className={
                                                            styles.manualActions
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.pillBtn
                                                            }
                                                            onClick={() =>
                                                                setDialog({
                                                                    kind: 'manual',
                                                                    combo,
                                                                    existing: m,
                                                                })
                                                            }
                                                        >
                                                            Edit…
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.removeBtn
                                                            }
                                                            onClick={() =>
                                                                setDeletingManualId(
                                                                    deletingManualId ===
                                                                        m.id
                                                                        ? null
                                                                        : m.id,
                                                                )
                                                            }
                                                        >
                                                            Delete…
                                                        </button>
                                                    </div>
                                                </div>
                                                <span
                                                    className={
                                                        styles.manualMeta
                                                    }
                                                >
                                                    {m.source === 'mod'
                                                        ? `Set by moderator ${m.createdByName}`
                                                        : m.source === 'self'
                                                          ? 'Self-claimed by the runner'
                                                          : 'System-generated'}
                                                    {' · '}
                                                    {fmtDate(m.createdAt)}
                                                    {m.reason &&
                                                        ` · "${m.reason}"`}
                                                </span>
                                                {m.verificationStatus ===
                                                    'pending' && (
                                                    <ManualTimeVerdictRow
                                                        gameSlug={gameSlug}
                                                        manualTimeId={m.id}
                                                        onDone={afterMutation}
                                                    />
                                                )}
                                                {deletingManualId === m.id && (
                                                    <InlineReasonForm
                                                        id={`delete-manual-${m.id}`}
                                                        label="Delete reason"
                                                        cta="Delete manual time"
                                                        onSubmit={(reason) =>
                                                            deleteManual(
                                                                m,
                                                                reason,
                                                            )
                                                        }
                                                        onCancel={() =>
                                                            setDeletingManualId(
                                                                null,
                                                            )
                                                        }
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ))
                    )}
                </div>

                <div className={styles.sidePanel}>
                    <div className={styles.sideCard}>
                        <div className={styles.sideCardHead}>Ban state</div>
                        {categoriesInPlay.map((cat) => {
                            const rule = banState.categoryRules.find(
                                (r) => r.categoryId === cat.id,
                            );
                            return (
                                <div key={cat.id} className={styles.scopeRow}>
                                    <div className={styles.scopeLabel}>
                                        <div className={styles.scopeA}>
                                            This board · {cat.display}
                                        </div>
                                        <div className={styles.scopeB}>
                                            {rule
                                                ? `Banned by ${rule.excludedByName} on ${fmtDate(rule.createdAt)}`
                                                : banState.gameRule
                                                  ? 'Covered by game-wide ban'
                                                  : 'Not banned'}
                                        </div>
                                    </div>
                                    {rule ? (
                                        unbanRow(rule, cat.display)
                                    ) : banState.gameRule ? null : (
                                        <button
                                            type="button"
                                            className={`${styles.pillBtn} ${styles.pillBtnDanger}`}
                                            onClick={() =>
                                                setRunnerDialog({
                                                    scope: 'board',
                                                    category:
                                                        resolvedCategoryFor(
                                                            cat.id,
                                                        ),
                                                    subcategoryKey:
                                                        combos.find(
                                                            (c) =>
                                                                c.categoryId ===
                                                                cat.id,
                                                        )?.subcategoryKey ?? '',
                                                })
                                            }
                                        >
                                            Ban…
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        <div className={styles.scopeRow}>
                            <div className={styles.scopeLabel}>
                                <div className={styles.scopeA}>
                                    This game · {gameDisplay}
                                </div>
                                <div className={styles.scopeB}>
                                    {banState.gameRule
                                        ? `Banned by ${banState.gameRule.excludedByName} on ${fmtDate(banState.gameRule.createdAt)}`
                                        : 'Not banned'}
                                </div>
                            </div>
                            {banState.gameRule ? (
                                unbanRow(banState.gameRule, gameDisplay)
                            ) : (
                                <button
                                    type="button"
                                    className={`${styles.pillBtn} ${styles.pillBtnDanger}`}
                                    disabled={firstCombo == null}
                                    onClick={() =>
                                        firstCombo &&
                                        setRunnerDialog({
                                            scope: 'game',
                                            category: resolvedCategoryFor(
                                                firstCombo.categoryId,
                                            ),
                                            subcategoryKey:
                                                firstCombo.subcategoryKey,
                                        })
                                    }
                                >
                                    Ban…
                                </button>
                            )}
                        </div>
                        <div className={styles.scopeRow}>
                            <div className={styles.scopeLabel}>
                                <div className={styles.scopeA}>Entire site</div>
                                <div className={styles.scopeB}>Admins only</div>
                            </div>
                            <button
                                type="button"
                                className={styles.pillBtn}
                                disabled={!canSiteBan || firstCombo == null}
                                onClick={() =>
                                    firstCombo &&
                                    setRunnerDialog({
                                        scope: 'site',
                                        category: resolvedCategoryFor(
                                            firstCombo.categoryId,
                                        ),
                                        subcategoryKey:
                                            firstCombo.subcategoryKey,
                                    })
                                }
                            >
                                Ban…
                            </button>
                        </div>
                    </div>

                    <div className={styles.sideCard}>
                        <div className={styles.sideCardHead}>Identity</div>
                        <p className={styles.identityBlurb}>
                            {coveringAnon
                                ? `Hidden from the public as ${coveringAnon.displayName}. Every run and rank is untouched. The name, avatar, flag and profile link are gone.`
                                : 'Public. Hiding is permanent and keeps every run and rank in place; moderators always still see the real name.'}
                        </p>
                        {categoriesInPlay.map((cat) => {
                            const rule = categoryAnonFor(cat.id);
                            return (
                                <div key={cat.id} className={styles.scopeRow}>
                                    <div className={styles.scopeLabel}>
                                        <div className={styles.scopeA}>
                                            This board · {cat.display}
                                        </div>
                                        <div className={styles.scopeB}>
                                            {rule
                                                ? `Hidden as ${rule.displayName} by ${rule.createdByName}`
                                                : coveringAnon
                                                  ? `Covered by the ${coveringAnon.scope} rule`
                                                  : 'Public'}
                                        </div>
                                    </div>
                                    {anonScopeControl(cat.id, rule, {
                                        canApply: coveringAnon == null,
                                        applyDisabledReason:
                                            coveringAnon == null
                                                ? undefined
                                                : 'Already hidden at a wider scope',
                                    })}
                                </div>
                            );
                        })}
                        <div className={styles.scopeRow}>
                            <div className={styles.scopeLabel}>
                                <div className={styles.scopeA}>
                                    This game · {gameDisplay}
                                </div>
                                <div className={styles.scopeB}>
                                    {gameAnon
                                        ? `Hidden as ${gameAnon.displayName} by ${gameAnon.createdByName} on ${fmtDate(gameAnon.createdAt)}`
                                        : globalAnon
                                          ? 'Covered by the site-wide rule'
                                          : 'Public'}
                                </div>
                            </div>
                            {anonScopeControl('game', gameAnon, {
                                canApply: globalAnon == null,
                                applyDisabledReason:
                                    globalAnon == null
                                        ? undefined
                                        : 'Already hidden site-wide',
                            })}
                        </div>
                        {/* Site scope is admin-only on both ends: only an
                            admin can create a global rule, and only an admin
                            can lift one. Shown to game mods as state, with
                            the verb disabled and the reason in the tooltip. */}
                        <div className={styles.scopeRow}>
                            <div className={styles.scopeLabel}>
                                <div className={styles.scopeA}>Entire site</div>
                                <div className={styles.scopeB}>
                                    {globalAnon
                                        ? `Hidden everywhere as ${globalAnon.displayName} by ${globalAnon.createdByName}`
                                        : 'Admins only'}
                                </div>
                            </div>
                            {anonScopeControl('global', globalAnon, {
                                canApply: canSiteBan,
                                applyDisabledReason: canSiteBan
                                    ? undefined
                                    : 'Site-wide hiding requires a site admin',
                            })}
                        </div>
                        {anonymizeRules.length > 0 && (
                            <ul className={styles.ruleList}>
                                {anonymizeRules.map((rule) => (
                                    <li
                                        key={rule.ruleId}
                                        className={styles.ruleItem}
                                    >
                                        <span className={styles.ruleHead}>
                                            {rule.displayName}
                                            <span className={styles.ruleScope}>
                                                {rule.scope}
                                            </span>
                                            {rule.liftedAt && (
                                                <span
                                                    className={styles.ruleScope}
                                                >
                                                    lifted
                                                </span>
                                            )}
                                        </span>
                                        <span className={styles.manualMeta}>
                                            {rule.createdByName} ·{' '}
                                            {fmtDate(rule.createdAt)} · “
                                            {rule.reason}”
                                        </span>
                                        {rule.liftedAt && (
                                            <span className={styles.manualMeta}>
                                                Lifted by{' '}
                                                {rule.liftedByName ??
                                                    'an admin'}{' '}
                                                on {fmtDate(rule.liftedAt)}
                                                {rule.liftReason &&
                                                    ` · “${rule.liftReason}”`}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className={styles.sideCard}>
                        <div className={styles.sideCardHead}>
                            This runner in the log
                            <span className={styles.sideCardCount}>
                                {modLogTotal}
                            </span>
                        </div>
                        {modLog.length === 0 ? (
                            <p className={styles.mutedSmall}>
                                No moderation events involve this runner.
                            </p>
                        ) : (
                            <ul className={logStyles.log}>
                                {modLog.map((entry) => (
                                    <LogRow
                                        key={entry.id}
                                        entry={entry}
                                        gameSlug={gameSlug}
                                        categories={categories}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {selected.size > 0 && (
                <div className={bulkBarStyles.bar}>
                    <span className={bulkBarStyles.count}>
                        {selected.size} run{selected.size === 1 ? '' : 's'}
                    </span>
                    <span className={bulkBarStyles.sub}>selected</span>
                    <button
                        type="button"
                        className={bulkBarStyles.clear}
                        onClick={() => setSelected(new Set())}
                    >
                        Clear
                    </button>
                    <span className={bulkBarStyles.verbs}>
                        <button
                            type="button"
                            className={bulkBarStyles.pill}
                            onClick={() =>
                                openRunsAction(
                                    'approve',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
                        >
                            Verify
                        </button>
                        <button
                            type="button"
                            className={`${bulkBarStyles.pill} ${bulkBarStyles.pillDanger}`}
                            onClick={() =>
                                openRunsAction(
                                    'remove',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
                        >
                            Remove…
                        </button>
                        <button
                            type="button"
                            className={bulkBarStyles.pill}
                            onClick={() =>
                                openRunsAction(
                                    'restore',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
                        >
                            Restore
                        </button>
                    </span>
                </div>
            )}

            {dialog?.kind === 'action' && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={dialog.verb}
                    target={dialog.target}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {dialog?.kind === 'manual' && (
                <ManualTimeDialog
                    gameSlug={gameSlug}
                    runnerRef={{ userId }}
                    runnerLabel={runnerName}
                    categoryId={dialog.combo.categoryId}
                    categoryLabel={comboLabel(dialog.combo)}
                    subcategoryKey={dialog.combo.subcategoryKey}
                    existing={dialog.existing}
                    onDone={afterMutation}
                    onClose={() => setDialog(null)}
                />
            )}
            {runnerDialog && (
                <RunnerDialog
                    open
                    onClose={() => setRunnerDialog(null)}
                    row={rosterRow}
                    category={runnerDialog.category}
                    variables={variables}
                    gameSlug={gameSlug}
                    subcategoryKey={runnerDialog.subcategoryKey}
                    canSiteBan={canSiteBan}
                    initialScope={runnerDialog.scope}
                    hideDossierLink
                    onMutated={afterMutation}
                />
            )}
        </div>
    );
}
