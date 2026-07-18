'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { invalidateGameCacheAction } from '../actions/invalidate-cache.action';
import { ConfirmDialog } from '../shared/confirm-dialog';

interface Props {
    gameSlug: string;
    gameId: number;
}

export function InvalidateCacheButton({ gameSlug, gameId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [rebuildAllFlags, setRebuildAllFlags] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const checkboxId = useId();

    const closeConfirm = () => {
        setConfirmOpen(false);
        setConfirmError(null);
    };

    const doClear = () => {
        startTransition(async () => {
            setConfirmError(null);
            const res = await invalidateGameCacheAction({
                gameSlug,
                gameId,
                rebuildAllFlags,
            });
            if ('error' in res) {
                setConfirmError(res.error);
                return;
            }
            toast.success('Leaderboard cache cleared for this game');
            setConfirmOpen(false);
        });
    };

    return (
        <div className="d-flex align-items-center gap-2">
            <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                onClick={() => setConfirmOpen(true)}
                disabled={isPending}
            >
                {isPending ? 'Clearing…' : 'Clear cache'}
            </button>
            <div className="form-check mb-0">
                <input
                    id={checkboxId}
                    type="checkbox"
                    className="form-check-input"
                    checked={rebuildAllFlags}
                    onChange={(e) => setRebuildAllFlags(e.target.checked)}
                    disabled={isPending}
                />
                <label
                    htmlFor={checkboxId}
                    className="form-check-label small text-muted"
                    title="Also enqueue a rebuild of every leaderboard flag (rebuildAllFlags=1)"
                >
                    Rebuild all flags
                </label>
            </div>
            <ConfirmDialog
                open={confirmOpen}
                onClose={closeConfirm}
                onConfirm={doClear}
                labelledBy="clear-cache-title"
                title="Clear the leaderboard cache?"
                message="The next read of each board will re-warm from Postgres. Boards may briefly return slightly stale data while that happens."
                confirmLabel="Clear cache"
                variant="warning"
                pending={isPending}
                error={confirmError}
            />
        </div>
    );
}
