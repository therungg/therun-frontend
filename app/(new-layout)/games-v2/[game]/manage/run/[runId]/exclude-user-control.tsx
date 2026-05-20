'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import {
    type ExcludeScope,
    excludeUserAction,
} from './actions/exclude-user.action';

interface Props {
    gameSlug: string;
    userId: number;
    categoryId: number;
    runnerName: string;
    gameDisplay: string;
    categoryDisplay: string;
}

export function ExcludeUserControl({
    gameSlug,
    userId,
    categoryId,
    runnerName,
    gameDisplay,
    categoryDisplay,
}: Props) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
    const [scope, setScope] = useState<ExcludeScope>('category');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    if (!expanded) {
        return (
            <div className="d-flex justify-content-end">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                        setExpanded(true);
                        setError(null);
                    }}
                >
                    Exclude user…
                </button>
            </div>
        );
    }

    const scopeLabel =
        scope === 'category'
            ? `${categoryDisplay}`
            : `${gameDisplay} (entire game)`;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const res = await excludeUserAction({
                gameSlug,
                userId,
                scope,
                categoryId: scope === 'category' ? categoryId : undefined,
                reason: reason.trim() || undefined,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success(`${runnerName} excluded from ${scopeLabel}`);
            router.push(`/games-v2/${gameSlug}`);
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="alert alert-warning py-2 mb-2" role="alert">
                <strong>Exclude {runnerName}</strong> from{' '}
                <strong>{scopeLabel}</strong>. All of their{' '}
                {scope === 'category'
                    ? 'runs in this category'
                    : 'runs in every category of this game'}{' '}
                will be hidden from leaderboards and stats.
            </div>

            <div className="mb-2 d-flex gap-3">
                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="exclude-scope-category"
                        name="exclude-scope"
                        checked={scope === 'category'}
                        onChange={() => setScope('category')}
                        disabled={isPending}
                    />
                    <label
                        htmlFor="exclude-scope-category"
                        className="form-check-label small"
                    >
                        From this category
                    </label>
                </div>
                <div className="form-check">
                    <input
                        type="radio"
                        className="form-check-input"
                        id="exclude-scope-game"
                        name="exclude-scope"
                        checked={scope === 'game'}
                        onChange={() => setScope('game')}
                        disabled={isPending}
                    />
                    <label
                        htmlFor="exclude-scope-game"
                        className="form-check-label small"
                    >
                        From entire game
                    </label>
                </div>
            </div>

            <label
                htmlFor="exclude-reason"
                className="form-label small text-muted mb-1"
            >
                Reason — optional, audit-logged
            </label>
            <textarea
                id="exclude-reason"
                className="form-control form-control-sm mb-2"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
            />
            {error && (
                <div className="alert alert-danger py-2 mb-2" role="alert">
                    {error}
                </div>
            )}
            <div className="d-flex gap-2 justify-content-end">
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                        setExpanded(false);
                        setScope('category');
                        setReason('');
                        setError(null);
                    }}
                    disabled={isPending}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-sm btn-danger"
                    disabled={isPending}
                >
                    {isPending ? 'Excluding…' : 'Confirm exclude'}
                </button>
            </div>
        </form>
    );
}
