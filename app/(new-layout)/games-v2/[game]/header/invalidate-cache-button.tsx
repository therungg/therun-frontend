'use client';

import { useTransition } from 'react';
import { toast } from 'react-toastify';
import { invalidateGameCacheAction } from '../actions/invalidate-cache.action';

interface Props {
    gameSlug: string;
    gameId: number;
}

export function InvalidateCacheButton({ gameSlug, gameId }: Props) {
    const [isPending, startTransition] = useTransition();

    const handleClick = () => {
        if (
            !window.confirm(
                'Clear the leaderboard cache for this game? The next read of each board will re-warm from Postgres.',
            )
        ) {
            return;
        }
        startTransition(async () => {
            const res = await invalidateGameCacheAction({ gameSlug, gameId });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            toast.success('Leaderboard cache cleared for this game');
        });
    };

    return (
        <button
            type="button"
            className="btn btn-sm btn-outline-warning"
            onClick={handleClick}
            disabled={isPending}
        >
            {isPending ? 'Clearing…' : 'Clear cache'}
        </button>
    );
}
