'use client';

import { type MouseEvent, useState, useTransition } from 'react';
import { notificationTakeMeOffAction } from '~src/actions/notification-roster.action';
import type { RosterBoardRef } from '~src/actions/run-roster.action';
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
 * What a `run_participant_added` row needs to act, straight off the payload.
 * Every co-op notification carries these on a live deploy (guide §4's JSON
 * samples); an older row missing any of them just can't act from the bell —
 * the row still links to the run page the ordinary way.
 */
function boardRefFrom(n: NotificationRow): RosterBoardRef | null {
    const p = n.payload as Record<string, unknown>;
    const runId = num(p.runId);
    const gameId = num(p.gameId);
    const gameSlug = str(p.gameSlug);
    const categoryId = num(p.categoryId);
    const subcategoryKey =
        typeof p.subcategoryKey === 'string' ? p.subcategoryKey : '';
    if (
        runId == null ||
        gameId == null ||
        gameSlug == null ||
        categoryId == null
    ) {
        return null;
    }
    return { runId, gameId, gameSlug, categoryId, subcategoryKey };
}

type Phase = 'idle' | 'confirm' | 'done';

/**
 * The credit notice's way out, inline in the bell row — guide §3 rule 3
 * (anyone may always remove themselves), read the way the run page's own
 * roster editor reads it: fetched fresh, refused the same way, and the
 * server's own sentence shown verbatim on a refusal.
 *
 * Rendered UNDER the row's own `describe()` line — never instead of it, and
 * never as a replacement for the run link, which stays the fallback when
 * this can't act at all (an older row, or a masked/last-member refusal).
 */
export function CoopCreditRow({
    notification,
}: {
    notification: NotificationRow;
}) {
    const board = boardRefFrom(notification);
    const [phase, setPhase] = useState<Phase>('idle');
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [blockedReason, setBlockedReason] = useState<string | null>(null);

    if (blockedReason) {
        return (
            <p className="small text-muted mb-0 mt-1">
                {blockedReason}
                {board && (
                    <>
                        {' '}
                        <Link
                            href={buildRunHref(board.gameSlug, board.runId)}
                            onClick={(e: MouseEvent) => e.stopPropagation()}
                        >
                            Open the run page
                        </Link>
                        .
                    </>
                )}
            </p>
        );
    }

    if (phase === 'done') {
        return (
            <p className="small text-muted mb-0 mt-1">
                You were taken off this run. Only a moderator can put you back.
            </p>
        );
    }

    if (!board) return null;

    if (phase === 'idle') {
        return (
            <div className="mt-1">
                <p className="small text-muted mb-1">
                    This run now counts as yours. You can take yourself off it.
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
                            const res =
                                await notificationTakeMeOffAction(board);
                            if ('error' in res) {
                                setError(res.error);
                                return;
                            }
                            if ('blocked' in res) {
                                setBlockedReason(res.reason);
                                return;
                            }
                            setPhase('done');
                        });
                    }}
                >
                    Take me off
                </button>
            </div>
        </div>
    );
}
