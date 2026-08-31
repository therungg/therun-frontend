'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type {
    SrcCommitPlan,
    SrcImportCommitFlags,
    SrcImportJob,
} from '../../../../../../types/src-import.types';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { ImportOptions, resolveCommitFlags } from './import-options';
import { PlanPreview, planHasConflicts } from './plan-preview';
import styles from './src-import.module.scss';
import {
    type ActionResult,
    applyConfigAction,
    importRunsAction,
    reconcileAction,
    reconcileUndoAction,
    setFlagsAction,
    setSrcOnlyAction,
    undoConfigAction,
    undoRunsAction,
} from './src-import-actions';

interface Props {
    job: SrcImportJob;
    gameId: number;
    gameSlug: string;
    onChanged: () => void | Promise<void>;
}

export type CommitActionKind =
    | 'apply-config'
    | 'import-runs'
    | 'undo-runs'
    | 'undo-config'
    | 'reconcile'
    | 'reconcile-undo';

export interface CommitButtonSpec {
    action: CommitActionKind;
    label: string;
    disabled: boolean;
}

export interface CommitViewModel {
    primary: CommitButtonSpec | null;
    secondary: CommitButtonSpec[];
    showCheckbox: boolean;
    /** Set while a backend job step (apply/import/reconcile/undo) is in flight. */
    progressLabel: string | null;
    /** Shown next to a disabled secondary action — the teardown-order rule. */
    blockedReason: string | null;
    errorMessage: string | null;
    /** `commitStatus` is null/'planning' — nothing has been applied yet. */
    showPlanPlaceholder: boolean;
}

const PROGRESS_LABEL: Partial<
    Record<NonNullable<SrcImportJob['commitStatus']>, string>
> = {
    applying: 'Applying configuration…',
    importing: 'Importing runs…',
    reconciling: 'Reconciling…',
    undoing: 'Undoing…',
};

/**
 * Pure `commitStatus` -> UI mapping for the commit console. Mirrors the
 * "Commit state machine" table in
 * therun/docs/plans/2026-08-25-src-only-leaderboard-design.md. Kept separate
 * from rendering so the state machine itself is unit-testable without DOM.
 */
export function getCommitViewModel(job: SrcImportJob): CommitViewModel {
    const cs = job.commitStatus;

    // No commit attempted yet — plan preview + Apply config. 'planning' is a
    // transient value the type allows but the design doc doesn't render
    // distinctly from null, so it gets the same treatment.
    if (cs === null || cs === 'planning') {
        return {
            primary: {
                action: 'apply-config',
                label: 'Apply config',
                disabled: false,
            },
            secondary: [],
            showCheckbox: false,
            progressLabel: null,
            blockedReason: null,
            errorMessage: null,
            showPlanPlaceholder: true,
        };
    }

    if (
        cs === 'applying' ||
        cs === 'importing' ||
        cs === 'reconciling' ||
        cs === 'undoing'
    ) {
        return {
            primary: null,
            secondary: [],
            showCheckbox: false,
            progressLabel: PROGRESS_LABEL[cs] ?? 'Working…',
            blockedReason: null,
            errorMessage: null,
            showPlanPlaceholder: false,
        };
    }

    if (cs === 'applied') {
        return {
            primary: {
                action: 'import-runs',
                label: 'Import runs',
                disabled: false,
            },
            secondary: [
                {
                    action: 'undo-config',
                    label: 'Undo config',
                    disabled: false,
                },
            ],
            showCheckbox: true,
            progressLabel: null,
            blockedReason: null,
            errorMessage: null,
            showPlanPlaceholder: false,
        };
    }

    if (cs === 'imported') {
        return {
            primary: {
                action: 'undo-runs',
                label: 'Undo runs',
                disabled: false,
            },
            secondary: [],
            showCheckbox: false,
            progressLabel: null,
            blockedReason: null,
            errorMessage: null,
            showPlanPlaceholder: false,
        };
    }

    if (cs === 'reconciled') {
        return {
            primary: {
                action: 'reconcile-undo',
                label: 'Reverse SRC-only leaderboard',
                disabled: false,
            },
            // Teardown order: runs can't be undone while the SRC-only
            // leaderboard is still reconciled onto the board.
            secondary: [
                { action: 'undo-runs', label: 'Undo runs', disabled: true },
            ],
            showCheckbox: false,
            progressLabel: null,
            blockedReason: 'Reverse the SRC-only leaderboard first',
            errorMessage: null,
            showPlanPlaceholder: false,
        };
    }

    // cs === 'failed'. The job fields alone can't tell a forward-step failure
    // from an undo failure — `commitPhase` is identical for `import-runs` and
    // its `undo-runs`, and for `reconcile` and its `reconcile-undo`. Auto-
    // picking one directional retry could re-import runs a mod was removing or
    // re-reconcile instead of resuming a reversal (the C&D reversal path), so
    // for the ambiguous phases we render BOTH directions as explicit,
    // clearly-labelled buttons and let the mod choose. `config` has only a
    // forward step, so it keeps a single retry.
    const failedError = job.error ?? 'The last commit step failed.';
    if (job.commitPhase === 'config') {
        return {
            primary: {
                action: 'apply-config',
                label: 'Retry apply config',
                disabled: false,
            },
            secondary: [],
            showCheckbox: false,
            progressLabel: null,
            blockedReason: null,
            errorMessage: failedError,
            showPlanPlaceholder: false,
        };
    }
    if (job.commitPhase === 'runs') {
        return {
            primary: {
                action: 'import-runs',
                label: 'Resume import runs',
                disabled: false,
            },
            secondary: [
                { action: 'undo-runs', label: 'Undo runs', disabled: false },
            ],
            showCheckbox: false,
            progressLabel: null,
            blockedReason: null,
            errorMessage: failedError,
            showPlanPlaceholder: false,
        };
    }
    if (job.commitPhase === 'reconcile') {
        return {
            primary: {
                action: 'reconcile',
                label: 'Resume reconcile',
                disabled: false,
            },
            secondary: [
                {
                    action: 'reconcile-undo',
                    label: 'Reverse SRC-only leaderboard',
                    disabled: false,
                },
            ],
            showCheckbox: false,
            progressLabel: null,
            blockedReason: null,
            errorMessage: failedError,
            showPlanPlaceholder: false,
        };
    }
    // phase null/unknown — surface the error only, no direction to guess.
    return {
        primary: null,
        secondary: [],
        showCheckbox: false,
        progressLabel: null,
        blockedReason: null,
        errorMessage: failedError,
        showPlanPlaceholder: false,
    };
}

const ACTION_FN: Record<
    CommitActionKind,
    (input: {
        gameId: number;
        gameSlug: string;
        jobId: number;
    }) => Promise<ActionResult<{ jobId: number }>>
> = {
    'apply-config': applyConfigAction,
    'import-runs': importRunsAction,
    'undo-runs': undoRunsAction,
    'undo-config': undoConfigAction,
    reconcile: reconcileAction,
    'reconcile-undo': reconcileUndoAction,
};

/**
 * The commit console's primary surface: reads the job's commit fields and
 * renders one primary action for the current state, per the design doc's
 * commit state machine. Each button fires its Task-2 server action, then
 * `onChanged()` so the pane refreshes the job.
 *
 * Once `commitStatus` reaches `imported` and the SRC-only checkbox was set,
 * this component auto-fires `reconcile` itself (see the effect below) — a
 * ref latch keyed on the job id keeps it from firing twice while the poll
 * re-renders this component with the still-`imported` job.
 */
export function CommitPanel({ job, gameId, gameSlug, onChanged }: Props) {
    const vm = getCommitViewModel(job);
    const [pending, startTransition] = useTransition();
    const [actionError, setActionError] = useState<string | null>(null);
    const [srcOnly, setSrcOnly] = useState(job.srcOnlyLeaderboard);
    const [flags, setFlagsState] = useState(
        resolveCommitFlags(job.commitFlags),
    );
    const [plan, setPlan] = useState<SrcCommitPlan | null>(null);
    const [reconcileError, setReconcileError] = useState<string | null>(null);
    // Whether the one-shot AUTO reconcile has fired for the current job this
    // mount (mirrors the `reconciledJobId` latch as render state), and whether
    // that POST is still in flight. Together they keep the `imported`+srcOnly
    // seam honest: pre-fire shows "will start automatically", in-flight shows a
    // "Starting reconcile…" pending state (not a clickable Undo runs that would
    // race the reconcile), and post-fire shows the manual reconcile control.
    const [reconcileFired, setReconcileFired] = useState(false);
    const [reconcilePosting, setReconcilePosting] = useState(false);
    const reconciledJobId = useRef<number | null>(null);

    useEffect(() => {
        if (job.commitStatus !== 'imported' || !job.srcOnlyLeaderboard) {
            return;
        }
        if (reconciledJobId.current === job.id) {
            // Already fired for this job (poll re-render, or a reverse landed
            // back on `imported` with the latch still set) — surface the
            // fired state so the copy stays honest, but don't POST again.
            setReconcileFired(true);
            return;
        }
        reconciledJobId.current = job.id;
        setReconcileFired(true);
        setReconcilePosting(true);
        (async () => {
            const res = await reconcileAction({
                gameId,
                gameSlug,
                jobId: job.id,
            });
            setReconcilePosting(false);
            if ('error' in res) {
                setReconcileError(res.error);
                return;
            }
            await onChanged();
        })();
    }, [
        job.commitStatus,
        job.srcOnlyLeaderboard,
        job.id,
        gameId,
        gameSlug,
        onChanged,
    ]);

    const runAction = (action: CommitActionKind) => {
        setActionError(null);
        startTransition(async () => {
            const res = await ACTION_FN[action]({
                gameId,
                gameSlug,
                jobId: job.id,
            });
            if ('error' in res) {
                setActionError(res.error);
                return;
            }
            await onChanged();
        });
    };

    const onSrcOnlyChange = (enabled: boolean) => {
        setSrcOnly(enabled);
        setActionError(null);
        startTransition(async () => {
            const res = await setSrcOnlyAction({
                gameId,
                gameSlug,
                jobId: job.id,
                enabled,
            });
            if ('error' in res) {
                setActionError(res.error);
                return;
            }
            await onChanged();
        });
    };

    const onFlagsChange = (patch: SrcImportCommitFlags) => {
        // Optimistic: reflect the toggle immediately, then persist the patch.
        // The backend patch-merges, so we only ever send the changed key(s).
        setFlagsState((prev) => ({ ...prev, ...patch }));
        setActionError(null);
        startTransition(async () => {
            const res = await setFlagsAction({
                gameId,
                gameSlug,
                jobId: job.id,
                flags: patch,
            });
            if ('error' in res) {
                setActionError(res.error);
                return;
            }
            await onChanged();
        });
    };

    const hasConflicts = plan !== null && planHasConflicts(plan);
    const applyBlockedByConflicts =
        vm.primary?.action === 'apply-config' && hasConflicts;
    // In this state the reconcile drives the UI: the auto-fire, its pending
    // state, and the manual re-trigger replace the plain "Undo runs" primary
    // so a mod can't click into a reconcile race.
    const isImportedSrcOnly =
        job.commitStatus === 'imported' && job.srcOnlyLeaderboard;

    return (
        <section className={styles.commitCard} aria-label="Commit to therun.gg">
            {vm.showPlanPlaceholder && (
                <PlanPreview
                    gameId={gameId}
                    gameSlug={gameSlug}
                    jobId={job.id}
                    onPlanLoaded={setPlan}
                />
            )}

            {vm.progressLabel && (
                <div
                    className={styles.jobHead}
                    role="status"
                    aria-live="polite"
                >
                    <span className={styles.spinner} aria-hidden />
                    <span className={styles.muted}>{vm.progressLabel}</span>
                </div>
            )}

            {isImportedSrcOnly &&
                (reconcilePosting ? (
                    <div
                        className={styles.jobHead}
                        role="status"
                        aria-live="polite"
                    >
                        <span className={styles.spinner} aria-hidden />
                        <span className={styles.muted}>
                            Starting reconcile…
                        </span>
                    </div>
                ) : reconcileFired ? (
                    <div className={styles.stack}>
                        <p className={styles.muted}>
                            “Only use the speedrun.com leaderboard” is on. The
                            SRC-only reconcile is not running — start it
                            manually.
                        </p>
                        <button
                            type="button"
                            className={kit.saveBtn}
                            disabled={pending}
                            onClick={() => runAction('reconcile')}
                        >
                            {pending ? 'Working…' : 'Run SRC-only reconcile'}
                        </button>
                    </div>
                ) : (
                    <p
                        className={styles.muted}
                        role="status"
                        aria-live="polite"
                    >
                        “Only use the speedrun.com leaderboard” is on —
                        reconciling the board will start automatically.
                    </p>
                ))}

            {/* Import options are consumed at apply-config, so they are only
                offered while the plan is still being reviewed (before the first
                commit step). The backend also freezes them once importing. */}
            {vm.primary?.action === 'apply-config' && (
                <ImportOptions
                    flags={flags}
                    disabled={pending}
                    onChange={onFlagsChange}
                />
            )}

            {vm.errorMessage && <InlineError>{vm.errorMessage}</InlineError>}
            {actionError && <InlineError>{actionError}</InlineError>}
            {reconcileError && <InlineError>{reconcileError}</InlineError>}

            {!isImportedSrcOnly && (vm.primary || vm.secondary.length > 0) && (
                <div className={styles.actionRow}>
                    {vm.showCheckbox && (
                        <label className={styles.checkboxRow}>
                            <input
                                type="checkbox"
                                checked={srcOnly}
                                disabled={pending}
                                onChange={(e) =>
                                    onSrcOnlyChange(e.target.checked)
                                }
                            />
                            <span>
                                Only use the speedrun.com leaderboard
                                <span className={styles.checkboxHint}>
                                    Runs not on speedrun.com are hidden unless
                                    the runner has a therun account; categories
                                    not on speedrun.com are archived.
                                    Reversible.
                                </span>
                            </span>
                        </label>
                    )}
                    {vm.primary && (
                        <button
                            type="button"
                            className={kit.saveBtn}
                            disabled={
                                pending ||
                                vm.primary.disabled ||
                                applyBlockedByConflicts
                            }
                            title={
                                applyBlockedByConflicts
                                    ? 'Resolve the plan conflicts above before applying'
                                    : undefined
                            }
                            onClick={() =>
                                vm.primary && runAction(vm.primary.action)
                            }
                        >
                            {pending ? 'Working…' : vm.primary.label}
                        </button>
                    )}
                    {applyBlockedByConflicts && (
                        <p className={styles.blockedHint}>
                            Resolve the plan conflicts above before applying.
                        </p>
                    )}
                    {vm.secondary.map((spec) => (
                        <button
                            key={spec.action}
                            type="button"
                            className={styles.secondaryBtn}
                            disabled={pending || spec.disabled}
                            title={
                                spec.disabled && vm.blockedReason
                                    ? vm.blockedReason
                                    : undefined
                            }
                            onClick={() =>
                                !spec.disabled && runAction(spec.action)
                            }
                        >
                            {spec.label}
                        </button>
                    ))}
                </div>
            )}
            {vm.blockedReason && (
                <p className={styles.blockedHint}>{vm.blockedReason}</p>
            )}
        </section>
    );
}
