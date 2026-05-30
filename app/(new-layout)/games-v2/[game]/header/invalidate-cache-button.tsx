'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { invalidateGameCacheAction } from '../actions/invalidate-cache.action';

interface Props {
    gameSlug: string;
    gameId: number;
}

export function InvalidateCacheButton({ gameSlug, gameId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [rebuildAllFlags, setRebuildAllFlags] = useState(false);
    const checkboxId = useId();

    const handleClick = () => {
        if (
            !window.confirm(
                'Clear the leaderboard cache for this game? The next read of each board will re-warm from Postgres.',
            )
        ) {
            return;
        }
        startTransition(async () => {
            const res = await invalidateGameCacheAction({
                gameSlug,
                gameId,
                rebuildAllFlags,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Leaderboard cache cleared for this game');
        });
    };

    return (
        <div className="d-flex align-items-center gap-2">
            <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                onClick={handleClick}
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
        </div>
    );
}
