'use client';

import { type MouseEvent, useState, useTransition } from 'react';
import { notificationTakeMeOffAction } from '~src/actions/notification-roster.action';
import Link from '~src/components/link';
import { buildRunHref } from '~src/lib/board-url';
import type { NotificationRow } from '../../../types/moderation.types';

function str(v: unknown): string | null {
    return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
    return typeof v === 'number' && Number.isInteger(v) ? v : null;
}

/**
 * The run link this row falls back to — for display only. The write itself
 * (`notificationTakeMeOffAction`) takes nothing but `runId`: everything else
 * it needs comes back off the authoritative run, never off this payload
 * (see that action's own comment for why).
 */
function runLinkFrom(
    n: NotificationRow,
): { runId: number; gameSlug: string } | null {
    const p = n.payload as Record<string, unknown>;
    const runId = num(p.runId);
    const gameSlug = str(p.gameSlug);
    if (runId == null || gameSlug == null) return null;
    return { runId, gameSlug };
}

type Phase = 'idle' | 'confirm';

/**
 * The credit notice's way out, inline in the bell row — guide §3 rule 3
 * (anyone may always remove themselves), read the way the run page's own
 * roster editor reads it: fetched fresh, refused the same way, and the
 * server's own sentence shown verbatim on a refusal.
 *
 * Rendered UNDER the row's own `describe()` line — never instead of it, and
 * never as a replacement for the run link, which stays the fallback when
 * this can't act at all (an older row, or a masked/last-member refusal).
 *
 * `taken` and `onSuccess` live at the bell, not here: the bell stays mounted
 * for the whole session (it only unmounts, and forgets state, when the
 * browser tab does), so a Set of notification ids up there survives the
 * dropdown closing and reopening — this component alone would lose "done"
 * the moment it unmounts.
 */
export function CoopCreditRow({
    notification,
    taken,
    onSuccess,
}: {
    notification: NotificationRow;
    /** Already taken off THIS session, from the bell's own tracking — not
     * re-derived from a fresh read, so it survives the dropdown closing. */
    taken: boolean;
    /** Fires once, right after a successful removal — the bell marks the
     * notification read and remembers "done" for the rest of the session. */
    onSuccess: () => void;
}) {
    const link = runLinkFrom(notification);
    const [phase, setPhase] = useState<Phase>('idle');
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [blockedReason, setBlockedReason] = useState<string | null>(null);

    const runPageLink = link && (
        <Link
            href={buildRunHref(link.gameSlug, link.runId)}
            onClick={(e: MouseEvent) => e.stopPropagation()}
        >
            Open the run page
        </Link>
    );

    if (taken) {
        return (
            <p className="small text-muted mb-0 mt-1">
                You were taken off this run. Only a moderator can put you back.
            </p>
        );
    }

    if (blockedReason) {
        return (
            <p className="small text-muted mb-0 mt-1">
                {blockedReason}
                {runPageLink && <> {runPageLink}.</>}
            </p>
        );
    }

    if (!link) return null;

    if (phase === 'idle') {
        return (
            <div className="mt-1">
                {/* Past tense, true at any later date — the roster may have
                    already moved since this notice was sent (guide §0: the
                    payload is a snapshot). "This run now counts as yours"
                    can be false by the time someone reads it; "you were
                    credited" never is. */}
                <p className="small text-muted mb-1">
                    You were credited on this run. If that's wrong, you can take
                    yourself off it.
                </p>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPhase('confirm');
                    }}
                >
                    Not me
                </button>
            </div>
        );
    }

    // phase === 'confirm' — said BEFORE the click that does it, not after:
    // taking yourself off is a one-way door for everyone but a moderator.
    return (
        <div className="mt-1">
            <p className="small text-muted mb-1">
                You stop being credited on this run. Once you take yourself off,
                only a moderator can put you back.
            </p>
            {error && <p className="small text-danger mb-1">{error}</p>}
            <div className="d-flex gap-2">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-0"
                    disabled={pending}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setError(null);
                        setPhase('idle');
                    }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-danger py-0"
                    disabled={pending}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setError(null);
                        startTransition(async () => {
                            const res = await notificationTakeMeOffAction(
                                link.runId,
                            );
                            if ('error' in res) {
                                setError(res.error);
                                return;
                            }
                            if ('blocked' in res) {
                                setBlockedReason(res.reason);
                                return;
                            }
                            onSuccess();
                        });
                    }}
                >
                    Take me off
                </button>
            </div>
        </div>
    );
}
