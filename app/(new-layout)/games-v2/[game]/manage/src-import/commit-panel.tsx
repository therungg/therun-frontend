'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type {
    SrcCommitPlan,
    SrcImportJob,
} from '../../../../../../types/src-import.types';
import { InlineError } from '../shared/form-kit';
import kit from '../shared/form-kit.module.scss';
import { PlanPreview, planHasConflicts } from './plan-preview';
import styles from './src-import.module.scss';
import {
    type ActionResult,
    applyConfigAction,
    importRunsAction,
    reconcileAction,
    reconcileUndoAction,
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

    // cs === 'failed' — retry whichever step failed.
    const retry: CommitButtonSpec | null =
        job.commitPhase === 'config'
            ? {
                  action: 'apply-config',
                  label: 'Retry apply config',
                  disabled: false,
              }
            : job.commitPhase === 'runs'
              ? {
                    action: 'import-runs',
                    label: 'Retry import runs',
                    disabled: false,
                }
              : job.commitPhase === 'reconcile'
                ? {
                      action: 'reconcile',
                      label: 'Retry reconcile',
                      disabled: false,
                  }
                : null;
    return {
        primary: retry,
        secondary: [],
        showCheckbox: false,
        progressLabel: null,
        blockedReason: null,
        errorMessage: job.error ?? 'The last commit step failed.',
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
    const [plan, setPlan] = useState<SrcCommitPlan | null>(null);
    const [reconcileError, setReconcileError] = useState<string | null>(null);
    const reconciledJobId = useRef<number | null>(null);

    useEffect(() => {
        if (
            job.commitStatus !== 'imported' ||
            !job.srcOnlyLeaderboard ||
            reconciledJobId.current === job.id
        ) {
            return;
        }
        reconciledJobId.current = job.id;
        (async () => {
            const res = await reconcileAction({
                gameId,
                gameSlug,
                jobId: job.id,
            });
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

    const hasConflicts = plan !== null && planHasConflicts(plan);
    const applyBlockedByConflicts =
        vm.primary?.action === 'apply-config' && hasConflicts;

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
                <div className={styles.jobHead}>
                    <span className={styles.spinner} aria-hidden />
                    <span className={styles.muted}>{vm.progressLabel}</span>
                </div>
            )}

            {job.commitStatus === 'imported' && job.srcOnlyLeaderboard && (
                <p className={styles.muted}>
                    “Only use the speedrun.com leaderboard” is on — reconciling
                    the board will start automatically.
                </p>
            )}

            {vm.errorMessage && <InlineError>{vm.errorMessage}</InlineError>}
            {actionError && <InlineError>{actionError}</InlineError>}
            {reconcileError && <InlineError>{reconcileError}</InlineError>}

            {(vm.primary || vm.secondary.length > 0) && (
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
