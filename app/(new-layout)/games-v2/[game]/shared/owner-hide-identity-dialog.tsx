'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    selfAnonymizeApplyAction,
    selfAnonymizeLiftAction,
    selfAnonymizeStateAction,
} from '~src/actions/run-user-actions.action';
import type { SelfAnonymizeState } from '../../../../../types/moderation.types';
import { BoardDialog } from './board-dialog';
import styles from './owner-hide-identity-dialog.module.scss';

export interface OwnerHideIdentityDialogProps {
    open: boolean;
    onClose: () => void;
    onDone: () => void;
    gameId: number;
    /**
     * Board cache invalidation is slug-keyed (`lb:{gameSlug}:…`), same
     * reason `OwnerRemoveForm` and the mod `HideIdentityDialog` both need
     * it — required by `selfAnonymizeApplyAction`/`selfAnonymizeLiftAction`
     * even though the task brief's prop list omitted it. Without it the
     * apply/lift calls below cannot bust the boards they just changed.
     */
    gameSlug: string;
    gameDisplay: string;
}

type Phase = 'loading' | 'ready' | 'load-error';

/**
 * The runner-facing "hide who I am in this game" toggle — a game-wide
 * privacy rule covering current and future runs, distinct from the
 * moderator's per-run/per-scope `HideIdentityDialog`. Times, ranks and
 * history are unaffected; only the displayed name is swapped for a stable
 * placeholder.
 *
 * State is driven entirely by `GET /v1/me/anonymize` (`selfAnonymizeStateAction`),
 * fetched on open and re-fetched after a successful apply. That re-fetch is
 * load-bearing, not defensive styling: `POST`'s response carries no
 * `selfApplied`/`ruleId`, and its `alreadyExists: true` does not prove the
 * caller owns the resulting rule — a moderator may have already hidden this
 * runner game-wide, in which case the runner's own POST still reports
 * `alreadyExists: true` while a follow-up GET correctly reports
 * `selfApplied: false`. Only the GET result decides whether "Unhide" is
 * offered. If that follow-up GET itself fails, we do NOT assume ownership —
 * the UI falls back to the moderator-owned rendering (no action button)
 * rather than risk offering an Unhide that would 403.
 *
 * Lift (`DELETE`) is simpler: its response already carries the full
 * resulting state, so it's applied directly with no extra round trip. That
 * resulting state can still say `hidden: true` — the caller's own rule
 * really was lifted, but an overlapping moderator rule (e.g. a
 * category-scope rule inside this game) can keep them hidden anyway. Success
 * copy is built from the returned state, never assumed.
 */
export function OwnerHideIdentityDialog({
    open,
    onClose,
    onDone,
    gameId,
    gameSlug,
    gameDisplay,
}: OwnerHideIdentityDialogProps) {
    const labelledBy = useId();
    const closeRef = useRef<HTMLButtonElement>(null);

    const [phase, setPhase] = useState<Phase>('loading');
    const [data, setData] = useState<SelfAnonymizeState | null>(null);
    const [error, setError] = useState<string | null>(null);
    /**
     * True only in the narrow post-apply window where our own POST
     * succeeded but the mandatory follow-up GET failed, so we genuinely
     * don't know whether the resulting rule is ours. This is its own
     * tri-state value, never encoded as `selfApplied: false` — that would
     * render the moderator-attribution copy (state c) for a rule the
     * runner just applied themselves, which is false. Reset whenever the
     * dialog (re)loads fresh state.
     */
    const [unknownOwnership, setUnknownOwnership] = useState(false);
    const [pending, startTransition] = useTransition();

    /** Fetches current state; returns it, or `'error'` on failure. Does not
     * touch `phase`/`data` itself — callers decide how to react. */
    const loadState = async (): Promise<SelfAnonymizeState | 'error'> => {
        const res = await selfAnonymizeStateAction(gameId);
        return 'error' in res ? 'error' : res.state;
    };

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setPhase('loading');
        setData(null);
        setError(null);
        setUnknownOwnership(false);
        (async () => {
            const r = await loadState();
            if (cancelled) return;
            if (r === 'error') {
                setPhase('load-error');
            } else {
                setData(r);
                setPhase('ready');
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, gameId]);

    const retryLoad = () => {
        setPhase('loading');
        setError(null);
        setUnknownOwnership(false);
        startTransition(async () => {
            const r = await loadState();
            if (r === 'error') {
                setPhase('load-error');
            } else {
                setData(r);
                setPhase('ready');
            }
        });
    };

    const handleHide = () => {
        setError(null);
        startTransition(async () => {
            const res = await selfAnonymizeApplyAction(gameSlug, gameId);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            // Re-GET is mandatory: POST carries no selfApplied/ruleId, and
            // alreadyExists:true doesn't prove this rule is ours.
            const refreshed = await loadState();
            if (refreshed === 'error') {
                // Applied, but we can't confirm who owns the resulting
                // rule. Keep suppressing Unhide, but render this as its own
                // "unknown" state — NOT the moderator-attribution copy,
                // which would tell the runner someone else did this.
                setData({
                    hidden: true,
                    selfApplied: false,
                    ruleId: null,
                    displayName: res.displayName,
                });
                setUnknownOwnership(true);
            } else {
                setData(refreshed);
                setUnknownOwnership(false);
                toast.success(
                    `Hiding your identity across ${gameDisplay} — you're shown as ${refreshed.displayName ?? res.displayName}. Some pages may take a moment to catch up.`,
                );
            }
            onDone();
        });
    };

    const handleUnhide = () => {
        setError(null);
        startTransition(async () => {
            const res = await selfAnonymizeLiftAction(gameSlug, gameId);
            if ('error' in res) {
                setError(res.error);
                return;
            }
            setData(res.state);
            toast.success(
                res.state.hidden
                    ? 'Your own rule was lifted, but a moderator’s rule still hides your identity here — only a site admin can remove that.'
                    : 'Unhiding your identity here. Some pages may take a moment to catch up.',
            );
            onDone();
        });
    };

    return (
        <BoardDialog
            open={open}
            onClose={onClose}
            labelledBy={labelledBy}
            size="sm"
            initialFocusRef={closeRef}
            closeOnBackdropClick={!pending}
        >
            <div className={styles.header}>
                <h5 className={styles.title} id={labelledBy}>
                    Hide my identity
                </h5>
            </div>
            <div className={styles.body}>
                {phase === 'loading' && (
                    <p className={styles.note}>Checking your current status…</p>
                )}

                {phase === 'load-error' && (
                    <>
                        <div className={styles.errorAlert} role="alert">
                            {error ?? 'Could not load your current status.'}
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={retryLoad}
                            disabled={pending}
                        >
                            Try again
                        </button>
                    </>
                )}

                {phase === 'ready' && data && !data.hidden && (
                    <p className={styles.message}>
                        Hide who you are across {gameDisplay}. Every run you
                        have here — and any you add later — shows as a stable
                        placeholder instead of your name. Your times, ranks and
                        history stay. You can unhide yourself at any time;
                        re-hiding uses the same placeholder number.
                    </p>
                )}

                {phase === 'ready' &&
                    data?.hidden &&
                    data.selfApplied &&
                    !unknownOwnership && (
                        <p className={styles.message}>
                            You&apos;re shown here as{' '}
                            <strong>{data.displayName}</strong>. Your times,
                            ranks and history stay visible — only your name is
                            replaced. You can unhide yourself at any time.
                        </p>
                    )}

                {phase === 'ready' && data?.hidden && unknownOwnership && (
                    <p className={styles.message}>
                        Your identity is hidden across {gameDisplay}. We
                        couldn&apos;t confirm whether you can undo it here —
                        reopen this to check.
                    </p>
                )}

                {phase === 'ready' &&
                    data?.hidden &&
                    !data.selfApplied &&
                    !unknownOwnership && (
                        <p className={styles.message}>
                            A moderator hid your identity here
                            {data.displayName ? (
                                <>
                                    {' '}
                                    — you&apos;re shown as{' '}
                                    <strong>{data.displayName}</strong>
                                </>
                            ) : null}
                            . Only a site admin can lift it. Your times, ranks
                            and history stay visible — only your name is hidden.
                        </p>
                    )}

                {error && phase === 'ready' && (
                    <div className={styles.errorAlert} role="alert">
                        {error}
                    </div>
                )}
            </div>
            <div className={styles.footer}>
                <button
                    ref={closeRef}
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={onClose}
                    disabled={pending}
                >
                    Close
                </button>
                {phase === 'ready' && data && !data.hidden && (
                    <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={handleHide}
                        disabled={pending}
                    >
                        {pending ? 'Working…' : 'Hide my identity'}
                    </button>
                )}
                {phase === 'ready' &&
                    data?.hidden &&
                    data.selfApplied &&
                    !unknownOwnership && (
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleUnhide}
                            disabled={pending}
                        >
                            {pending ? 'Working…' : 'Unhide'}
                        </button>
                    )}
            </div>
        </BoardDialog>
    );
}
