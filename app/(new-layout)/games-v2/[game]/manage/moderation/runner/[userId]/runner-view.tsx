'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { DurationToFormatted } from '~src/components/util/datetime';
import type {
    GameExclusionRuleRow,
    ManualTimeRow,
    ModActionRow,
} from '../../../../../../../../types/moderation.types';
import { formatSubcategoryKey } from '../../../../labels';
import {
    normalizeVerificationStatus,
    VerificationBadge,
} from '../../../../run-view/run-badges';
import { BackLink } from '../../../../shared/back-link';
import consoleStyles from '../../../console/console.module.scss';
import { ManualTimeVerdictRow } from '../../attention/manual-time-verdict-row';
import { historyActionLabel } from '../../configure/history-labels';
import { deleteRuleAction } from '../../rules/actions/delete-rule.action';
import {
    type BanScope,
    defaultBanScopeForCategories,
    type ModVerb,
    type RunActionTarget,
} from '../../shared/action-model';
import { deleteManualTimeAction } from '../../shared/actions/manual-times.action';
import { ManualTimeDialog } from '../../shared/manual-time-dialog';
import { RunActionDialog } from '../../shared/run-action-dialog';
import {
    publicBoardHref,
    type RunnerBanState,
    type RunnerCombo,
    type RunnerSummary,
    ruleForCombo,
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
    /** This runner's slice of the game's mod-action log, newest first. */
    actions: ModActionRow[];
    /** Where "Back" goes — resolved server-side in page.tsx. */
    backHref: string;
    backLabel: string;
}

type DialogState =
    | {
          kind: 'action';
          verb: ModVerb;
          target: RunActionTarget;
          banScope?: BanScope;
      }
    | { kind: 'manual'; combo: RunnerCombo; existing?: ManualTimeRow }
    | null;

const MIN_REASON = 10;

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
                {label} — required, min {MIN_REASON} characters, audit-logged
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
    actions,
    backHref,
    backLabel,
}: Props) {
    const router = useRouter();

    const [selectedKey, setSelectedKey] = useState<string | null>(
        combos[0]?.key ?? null,
    );
    // Selected combo falls back to the band's first chip when the stored key
    // disappears after a refresh (e.g. the last run of a combo was removed).
    const combo =
        combos.find((c) => c.key === selectedKey) ?? combos[0] ?? null;

    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [dialog, setDialog] = useState<DialogState>(null);
    const [liftingRuleId, setLiftingRuleId] = useState<number | null>(null);
    const [deletingManualId, setDeletingManualId] = useState<number | null>(
        null,
    );

    const comboLabel = (c: RunnerCombo) => {
        const sub = formatSubcategoryKey(c.subcategoryKey);
        return sub ? `${c.categoryDisplay} · ${sub}` : c.categoryDisplay;
    };

    const bestRankCombo = useMemo(
        () =>
            summary.bestRank
                ? combos.find((c) => c.key === summary.bestRank?.comboKey)
                : undefined,
        [combos, summary.bestRank],
    );

    const activeRule = combo ? ruleForCombo(banState, combo.categoryId) : null;
    const isBanned =
        banState.gameRule != null || banState.categoryRules.length > 0;

    const afterMutation = () => {
        setDialog(null);
        setSelected(new Set());
        setLiftingRuleId(null);
        setDeletingManualId(null);
        // Everything on this page came from the server loader; refetch.
        router.refresh();
    };

    const selectCombo = (key: string) => {
        setSelectedKey(key);
        setSelected(new Set());
        setLiftingRuleId(null);
        setDeletingManualId(null);
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

    const openBan = (target: RunnerCombo, scope: BanScope) => {
        setDialog({
            kind: 'action',
            verb: 'ban',
            target: {
                kind: 'runner',
                runnerId: userId,
                runnerName,
                categoryId: target.categoryId,
                categoryDisplay: target.categoryDisplay,
                gameDisplay,
            },
            banScope: scope,
        });
    };

    const liftBan = async (rule: GameExclusionRuleRow, reason: string) => {
        const res = await deleteRuleAction(gameSlug, rule.ruleId, reason);
        if ('error' in res) return res.error;
        toast.success(
            `Ban lifted — ${res.result.reinstatedRunCount} run${
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

    const banBanner = (rule: GameExclusionRuleRow) => (
        <div className={styles.banBanner} role="alert">
            <strong>
                Banned from{' '}
                {rule.categoryId == null
                    ? 'the entire game'
                    : (rule.categoryName ?? 'this category')}
            </strong>
            <span>
                by {rule.excludedByName} on {fmtDate(rule.createdAt)}
            </span>
            {rule.reason && <span>“{rule.reason}”</span>}
            {liftingRuleId === rule.ruleId ? (
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
                    className="btn btn-sm btn-outline-danger ms-auto"
                    onClick={() => setLiftingRuleId(rule.ruleId)}
                >
                    Lift ban…
                </button>
            )}
        </div>
    );

    const selectedRunIds = Array.from(selected);
    const comboRunIds = combo ? combo.runs.map((r) => r.runId) : [];
    const comboAllSelected =
        comboRunIds.length > 0 && comboRunIds.every((id) => selected.has(id));

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
                    {combo && (
                        <>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() =>
                                    setDialog({ kind: 'manual', combo })
                                }
                            >
                                Set a time…
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                    openBan(
                                        combo,
                                        defaultBanScopeForCategories(
                                            combos.map((c) => c.categoryId),
                                        ),
                                    )
                                }
                            >
                                Ban runner…
                            </button>
                        </>
                    )}
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
                        {bestRankCombo && (
                            <span className={styles.tileSub}>
                                {comboLabel(bestRankCombo)}
                            </span>
                        )}
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
                    <div className={clsx(styles.tile, styles.tileDanger)}>
                        <span className={styles.tileLabel}>Ban status</span>
                        <span className={styles.tileValue}>Banned</span>
                        <span className={styles.tileSub}>
                            {banState.gameRule
                                ? 'entire game'
                                : banState.categoryRules
                                      .map((r) => r.categoryName ?? 'category')
                                      .join(', ')}
                        </span>
                    </div>
                )}
            </div>

            {combos.length === 0 ? (
                <>
                    {banState.gameRule && banBanner(banState.gameRule)}
                    <p className="text-muted">
                        No eligible runs or manual times for this runner in this
                        game.
                    </p>
                </>
            ) : (
                <>
                    <div
                        className={styles.band}
                        role="tablist"
                        aria-label="Boards this runner appears on"
                    >
                        {combos.map((c) => {
                            const rule = ruleForCombo(banState, c.categoryId);
                            const active = combo?.key === c.key;
                            const sub = formatSubcategoryKey(c.subcategoryKey);
                            return (
                                <button
                                    key={c.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={clsx(
                                        styles.chip,
                                        active && styles.chipActive,
                                        rule && styles.chipBanned,
                                    )}
                                    onClick={() => selectCombo(c.key)}
                                >
                                    {rule && (
                                        <span
                                            className={styles.chipBanDot}
                                            title="A ban rule covers this board"
                                        />
                                    )}
                                    <span className={styles.chipNames}>
                                        <span className={styles.chipCategory}>
                                            {c.categoryDisplay}
                                        </span>
                                        {sub && (
                                            <span className={styles.chipSub}>
                                                {sub}
                                            </span>
                                        )}
                                    </span>
                                    <span className={styles.chipStats}>
                                        <span className={styles.chipTime}>
                                            {c.bestTime != null ? (
                                                <DurationToFormatted
                                                    duration={c.bestTime}
                                                />
                                            ) : (
                                                '—'
                                            )}
                                        </span>
                                        <span className={styles.chipRank}>
                                            {c.rank != null
                                                ? `#${c.rank}${c.totalRunners != null ? ` / ${c.totalRunners}` : ''}`
                                                : c.runs.length > 0
                                                  ? `${c.runs.length} run${c.runs.length === 1 ? '' : 's'}`
                                                  : 'manual only'}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {combo && (
                        <>
                            {activeRule && banBanner(activeRule)}

                            <div className={styles.standing}>
                                <div>
                                    <span className={styles.standingRank}>
                                        {combo.rank != null
                                            ? `#${combo.rank}`
                                            : '—'}
                                    </span>{' '}
                                    <span className={styles.standingRankOf}>
                                        {combo.rank != null
                                            ? combo.totalRunners != null
                                                ? `of ${combo.totalRunners} on ${comboLabel(combo)}`
                                                : `on ${comboLabel(combo)}`
                                            : 'not on this board'}
                                    </span>
                                </div>
                                {combo.board?.time != null && (
                                    <div className={styles.standingCell}>
                                        <span className={styles.standingLabel}>
                                            RT
                                        </span>
                                        <span className={styles.standingValue}>
                                            <DurationToFormatted
                                                duration={combo.board.time}
                                            />
                                        </span>
                                    </div>
                                )}
                                {combo.board?.gameTime != null && (
                                    <div className={styles.standingCell}>
                                        <span className={styles.standingLabel}>
                                            GT
                                        </span>
                                        <span className={styles.standingValue}>
                                            <DurationToFormatted
                                                duration={combo.board.gameTime}
                                            />
                                        </span>
                                    </div>
                                )}
                                {combo.board && (
                                    <div className={styles.standingCell}>
                                        <span className={styles.standingLabel}>
                                            Status
                                        </span>
                                        <VerificationBadge
                                            status={normalizeVerificationStatus(
                                                combo.board.verificationStatus,
                                            )}
                                        />
                                    </div>
                                )}
                                <div className={styles.standingActions}>
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
                                                View public board ↗
                                            </a>
                                        ) : null;
                                    })()}
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
                                    {!activeRule && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() =>
                                                openBan(combo, 'category')
                                            }
                                        >
                                            Ban from this board…
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.sectionHead}>
                                <h2 className="h6 mb-0 d-flex align-items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        aria-label="Select all runs"
                                        checked={comboAllSelected}
                                        onChange={() =>
                                            setSelected(
                                                comboAllSelected
                                                    ? new Set()
                                                    : new Set(comboRunIds),
                                            )
                                        }
                                        disabled={comboRunIds.length === 0}
                                    />
                                    Runs
                                    <span className={styles.sectionCount}>
                                        {combo.runs.length}
                                    </span>
                                </h2>
                            </div>
                            {combo.runs.length === 0 ? (
                                <p className="text-muted">
                                    No eligible runs on this board — only manual
                                    times below.
                                </p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '1%' }} />
                                                <th className="text-end">RT</th>
                                                <th className="text-end">GT</th>
                                                <th>Date</th>
                                                <th className="text-center">
                                                    Status
                                                </th>
                                                <th className="text-center">
                                                    VOD
                                                </th>
                                                <th className="text-center">
                                                    Board
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
                                                            {r.time != null ? (
                                                                <DurationToFormatted
                                                                    duration={
                                                                        r.time
                                                                    }
                                                                />
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            {r.gameTime !=
                                                            null ? (
                                                                <DurationToFormatted
                                                                    duration={
                                                                        r.gameTime
                                                                    }
                                                                />
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className="small">
                                                            {fmtDate(r.endedAt)}
                                                        </td>
                                                        <td className="text-center">
                                                            <VerificationBadge
                                                                status={status}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            {r.vodUrl ? (
                                                                <a
                                                                    href={
                                                                        r.vodUrl
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    Link
                                                                </a>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            {(r.isLeaderboardEntry ||
                                                                r.isLeaderboardEntryGt) && (
                                                                <span
                                                                    className="badge text-bg-success"
                                                                    title={`On board${r.isLeaderboardEntry ? ' RT' : ''}${r.isLeaderboardEntryGt ? ' GT' : ''}`}
                                                                >
                                                                    On board
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            <div className="d-inline-flex gap-1">
                                                                {status ===
                                                                    'pending' && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-success"
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
                                                                        Approve
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-outline-danger"
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
                                                                <Link
                                                                    className="btn btn-sm btn-outline-secondary"
                                                                    href={`/games-v2/${gameSlug}/manage/run/${r.runId}`}
                                                                >
                                                                    Open
                                                                </Link>
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
                                <>
                                    <div className={styles.sectionHead}>
                                        <h2 className="h6 mb-0">
                                            Manual times
                                            <span
                                                className={styles.sectionCount}
                                            >
                                                {combo.manualTimes.length}
                                            </span>
                                        </h2>
                                    </div>
                                    {combo.manualTimes.map((m) => (
                                        <div
                                            key={m.id}
                                            className={styles.manualRow}
                                        >
                                            <div className={styles.manualTop}>
                                                <span
                                                    className={
                                                        styles.manualTime
                                                    }
                                                >
                                                    <DurationToFormatted
                                                        duration={m.timeMs}
                                                    />
                                                </span>
                                                <span className="badge text-bg-secondary">
                                                    {m.timing === 'gametime'
                                                        ? 'GT'
                                                        : 'RT'}
                                                </span>
                                                <VerificationBadge
                                                    status={
                                                        m.verificationStatus
                                                    }
                                                />
                                                {m.evidenceUrl && (
                                                    <a
                                                        href={m.evidenceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="small"
                                                    >
                                                        Evidence
                                                    </a>
                                                )}
                                                <div className="ms-auto d-inline-flex gap-1">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary"
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
                                                        className="btn btn-sm btn-outline-danger"
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
                                            <span className={styles.manualMeta}>
                                                {m.source === 'mod'
                                                    ? `Set by moderator ${m.createdByName}`
                                                    : m.source === 'self'
                                                      ? 'Self-claimed by the runner'
                                                      : 'System-generated'}
                                                {' · '}
                                                {fmtDate(m.createdAt)}
                                                {m.reason && ` · “${m.reason}”`}
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
                                                        deleteManual(m, reason)
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
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            <div className={styles.sectionHead}>
                <h2 className="h6 mb-0">
                    Moderation history
                    <span className={styles.sectionCount}>
                        {actions.length}
                    </span>
                </h2>
            </div>
            {actions.length === 0 ? (
                <p className="text-muted">
                    No moderation actions involve this runner (last year).
                </p>
            ) : (
                <ul className={styles.historyList}>
                    {actions.map((a) => {
                        const runId =
                            a.entity === 'finished_run' && a.target != null
                                ? Number.parseInt(a.target, 10)
                                : null;
                        return (
                            <li key={a.logId} className={styles.historyItem}>
                                <span title={a.action}>
                                    {historyActionLabel(a.action)}
                                </span>
                                <span className="text-muted small">
                                    by {a.actorName}
                                </span>
                                {runId != null && Number.isFinite(runId) && (
                                    <Link
                                        className="small"
                                        href={`/games-v2/${gameSlug}/manage/run/${runId}`}
                                    >
                                        run
                                    </Link>
                                )}
                                <span className={styles.historyWhen}>
                                    {fmtDateTime(a.timestamp)}
                                </span>
                                {a.remark && (
                                    <p className={styles.historyRemark}>
                                        “{a.remark}”
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            {selected.size > 0 && (
                <div
                    className={`border-top bg-body shadow-lg p-2 d-flex align-items-center gap-2 ${styles.bulkBar}`}
                >
                    <span className="fw-bold">{selected.size} selected</span>
                    <div className="ms-auto d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setSelected(new Set())}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() =>
                                openRunsAction(
                                    'approve',
                                    selectedRunIds,
                                    `${selectedRunIds.length} runs`,
                                )
                            }
                        >
                            Approve
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
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
                            className="btn btn-sm btn-outline-secondary"
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
                    </div>
                </div>
            )}

            {dialog?.kind === 'action' && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={dialog.verb}
                    target={dialog.target}
                    defaultBanScope={dialog.banScope}
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
        </div>
    );
}
