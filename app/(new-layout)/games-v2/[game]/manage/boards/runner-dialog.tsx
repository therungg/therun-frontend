'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import type { RunTreatment } from '../../../../../../types/bans.types';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    LeaderboardRosterRow,
    PreviewExcludeResult,
    UserExclusionRuleInput,
} from '../../../../../../types/moderation.types';
import { BoardDialog } from '../../shared/board-dialog';
import {
    liftSiteBanAction,
    siteBanRunnerAction,
} from '../moderation/shared/actions/anonymize.action';
import {
    excludeAction,
    previewExcludeAction,
} from '../moderation/shared/actions/exclude.action';
import { fireUndoToast } from '../moderation/shared/undo-toast';
import styles from './board-curation.module.scss';
import { subcategoryVariablesFor } from './subcategory-bands';

export interface RunnerDialogProps {
    open: boolean;
    onClose: () => void;
    /** Caller guarantees `row.userId != null`. */
    row: LeaderboardRosterRow;
    category: ResolvedCategory;
    variables: VariableRow[];
    gameSlug: string;
    subcategoryKey: string;
    /** Admins only — shows the "Entire site" scope. */
    canSiteBan: boolean;
    onMutated: () => void;
}

type Scope = 'board' | 'game' | 'site';

const TREATMENTS: Array<{
    value: RunTreatment;
    label: string;
    description: string;
}> = [
    {
        value: 'exclude',
        label: 'Remove from boards',
        description: 'Runs come off every board, site-wide.',
    },
    {
        value: 'anonymize',
        label: 'Hide name',
        description:
            'Runs stay and count; the name shows as “Anonymous Runner” publicly.',
    },
    {
        value: 'keep',
        label: 'Keep as-is',
        description: 'Runs and name untouched; only the account is locked.',
    },
];

/**
 * Scoped runner moderation — board/game "remove runs" (via the exclude
 * rule preview + apply flow) and, for admins, a site-wide ban with a choice
 * of run treatment. Replaces the separate Ban/Anonymize dialogs (Task 4
 * mounts this in their place). Returns `null` while closed so `BoardCuration`
 * can keep it mounted-on-demand the same way the old dialogs were.
 */
export function RunnerDialog({
    open,
    onClose,
    row,
    category,
    variables,
    gameSlug,
    subcategoryKey,
    canSiteBan,
    onMutated,
}: RunnerDialogProps) {
    const [scope, setScope] = useState<Scope>('board');
    const [treatment, setTreatment] = useState<RunTreatment>('exclude');
    const [reason, setReason] = useState('');
    const [preview, setPreview] = useState<PreviewExcludeResult | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewing, startPreview] = useTransition();
    const [isConfirming, startConfirm] = useTransition();

    // Reset transient state whenever the dialog opens for a (possibly new)
    // row — never on scope changes, so switching scopes mid-flow doesn't
    // wipe the reason the mod already typed.
    useEffect(() => {
        if (!open) return;
        setScope('board');
        setTreatment('exclude');
        setReason('');
        setPreview(null);
        setPreviewError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Board/game scope: preview the exclude rule on open and whenever the
    // scope flips between them. Site scope has no exclude preview.
    //
    // `cancelled` guards against an out-of-order resolution: switching scope
    // quickly (or the open-reset effect above settling `scope` back to
    // 'board' right after a reopen) can fire two previews back to back —
    // only the one from the run that's still current is allowed to land.
    useEffect(() => {
        const targetId = row.userId;
        if (!open || scope === 'site' || targetId == null) return;
        let cancelled = false;
        setPreview(null);
        setPreviewError(null);
        startPreview(async () => {
            const res = await previewExcludeAction(gameSlug, {
                rule: {
                    type: 'user',
                    targetId,
                    categoryId: scope === 'board' ? category.id : undefined,
                },
            });
            if (cancelled) return;
            if ('error' in res) {
                setPreviewError(res.error);
                return;
            }
            setPreview(res.preview);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, scope]);

    if (!open || row.userId == null) return null;

    const targetId = row.userId;
    const subcatVars = subcategoryVariablesFor(category.id, variables);
    const showSubcategoryNote = scope === 'board' && subcatVars.length > 0;

    const handleConfirm = () => {
        if (isConfirming || reason.trim().length === 0) return;
        const trimmedReason = reason.trim();

        if (scope === 'site') {
            const board = { categoryId: category.id, subcategoryKey };
            startConfirm(async () => {
                const res = await siteBanRunnerAction(gameSlug, {
                    username: row.runnerName,
                    reason: trimmedReason,
                    treatment,
                    board,
                });
                if ('error' in res) {
                    toast.error(res.error);
                    return;
                }
                onClose();
                onMutated();
                // The undo toast is a portal, independent of this dialog's
                // lifecycle, so it keeps working even after `onMutated`'s
                // reload closes/unmounts this component.
                fireUndoToast(
                    `${row.runnerName} banned site-wide.`,
                    () => liftSiteBanAction(res.banId, gameSlug, board),
                    onMutated,
                );
            });
            return;
        }

        if (previewError) return;
        const rule: UserExclusionRuleInput = {
            type: 'user',
            targetId,
            categoryId: scope === 'board' ? category.id : undefined,
        };
        startConfirm(async () => {
            const res = await excludeAction(gameSlug, {
                rule,
                reason: trimmedReason,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            onClose();
            onMutated();
            // No undo toast here — the rule this just filed lives in the
            // existing Active bans/rules UI, which already has its own
            // delete affordance.
            toast.success(`${row.runnerName} removed from boards.`);
        });
    };

    const confirmDisabled =
        isConfirming ||
        reason.trim().length === 0 ||
        (scope !== 'site' && previewError != null) ||
        (scope !== 'site' && preview == null);

    const confirmLabel =
        scope === 'site'
            ? isConfirming
                ? 'Banning…'
                : 'Confirm site ban'
            : isConfirming
              ? 'Removing…'
              : 'Confirm removal';

    return (
        <BoardDialog
            open
            onClose={onClose}
            labelledBy="runner-dialog-title"
            size="sm"
            closeOnBackdropClick={!isConfirming}
        >
            <div className={styles.dialogHeader}>
                <h5 id="runner-dialog-title" className={styles.dialogTitle}>
                    Moderate {row.runnerName}
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={onClose}
                    disabled={isConfirming}
                />
            </div>
            <div className={styles.dialogBody}>
                <div>
                    <button
                        type="button"
                        className={`${styles.toolbarBtn} ${scope === 'board' ? styles.toolbarBtnActive : ''}`}
                        aria-pressed={scope === 'board'}
                        onClick={() => setScope('board')}
                        disabled={isConfirming}
                    >
                        This board
                    </button>
                    <button
                        type="button"
                        className={`${styles.toolbarBtn} ${scope === 'game' ? styles.toolbarBtnActive : ''}`}
                        aria-pressed={scope === 'game'}
                        onClick={() => setScope('game')}
                        disabled={isConfirming}
                    >
                        Whole game
                    </button>
                    {canSiteBan && (
                        <button
                            type="button"
                            className={`${styles.toolbarBtn} ${scope === 'site' ? styles.toolbarBtnActive : ''}`}
                            aria-pressed={scope === 'site'}
                            onClick={() => setScope('site')}
                            disabled={isConfirming}
                        >
                            Entire site
                        </button>
                    )}
                </div>

                {showSubcategoryNote && (
                    <p className={styles.moveNote}>
                        Covers every subcategory board of {category.display} —
                        exact single-board scope is coming later.
                    </p>
                )}

                {scope !== 'site' && (
                    <>
                        <p className={styles.moveNote}>
                            Effect: remove runs from boards. The account is
                            unaffected.
                        </p>
                        {isPreviewing && (
                            <p className={styles.slipLoading}>
                                Loading preview…
                            </p>
                        )}
                        {previewError && (
                            <div className={styles.errorAlert} role="alert">
                                {previewError}
                            </div>
                        )}
                        {preview && (
                            <>
                                <p>
                                    {preview.affectedRunCount} run
                                    {preview.affectedRunCount === 1 ? '' : 's'}{' '}
                                    affected.
                                </p>
                                {preview.affectedLeaderboards.length > 0 && (
                                    <ul>
                                        {preview.affectedLeaderboards.map(
                                            (lb) => (
                                                <li
                                                    key={`${lb.categoryId}:${lb.subcategoryKey}`}
                                                >
                                                    {lb.categoryName}
                                                    {lb.subcategoryKey
                                                        ? ` (${lb.subcategoryKey})`
                                                        : ''}{' '}
                                                    —{' '}
                                                    {
                                                        lb.affectedInThisLeaderboard
                                                    }
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            </>
                        )}
                    </>
                )}

                {scope === 'site' && (
                    <div>
                        <p className={styles.fieldLabel}>
                            What happens to their runs
                        </p>
                        {TREATMENTS.map((t) => (
                            <div key={t.value}>
                                <label>
                                    <input
                                        type="radio"
                                        name="runner-treatment"
                                        checked={treatment === t.value}
                                        onChange={() => setTreatment(t.value)}
                                        disabled={isConfirming}
                                    />{' '}
                                    {t.label}
                                </label>
                                <small>{t.description}</small>
                            </div>
                        ))}
                        {treatment === 'anonymize' && (
                            <p className={styles.moveNote}>
                                Moderation views (including this table) keep
                                showing the real name.
                            </p>
                        )}
                        <p className={styles.moveNote}>
                            Site-wide ban: the account is locked out of
                            therun.gg entirely.
                        </p>
                    </div>
                )}

                <label
                    htmlFor="runner-dialog-reason"
                    className={styles.fieldLabel}
                >
                    Reason — required
                </label>
                <textarea
                    id="runner-dialog-reason"
                    className={styles.dialogTextarea}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={isConfirming}
                />
            </div>
            <div className={styles.dialogFooter}>
                <button
                    type="button"
                    className={styles.slipAction}
                    onClick={onClose}
                    disabled={isConfirming}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles.confirmBtn}
                    onClick={handleConfirm}
                    disabled={confirmDisabled}
                >
                    {confirmLabel}
                </button>
            </div>
        </BoardDialog>
    );
}
