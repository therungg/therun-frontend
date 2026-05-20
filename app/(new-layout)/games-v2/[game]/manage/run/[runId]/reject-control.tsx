'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { rejectRunAction } from './actions/reject-run.action';

interface Props {
    runId: number;
    gameSlug: string;
    categoryId: number;
    subcategoryKey: string;
}

export function RejectControl({
    runId,
    gameSlug,
    categoryId,
    subcategoryKey,
}: Props) {
    const router = useRouter();
    const [expanded, setExpanded] = useState(false);
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
                    Reject run
                </button>
            </div>
        );
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
            const res = await rejectRunAction({
                gameSlug,
                runId,
                categoryId,
                subcategoryKey,
                reason: reason.trim() || undefined,
            });
            if ('error' in res) {
                setError(res.error);
                return;
            }
            toast.success('Run rejected');
            if (res.nextRunIdForUser != null) {
                router.push(
                    `/games-v2/${gameSlug}/manage/run/${res.nextRunIdForUser}`,
                );
            } else {
                router.push(`/games-v2/${gameSlug}`);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <label
                htmlFor="reject-reason"
                className="form-label small text-muted mb-1"
            >
                Reason — optional, shown to runner
            </label>
            <textarea
                id="reject-reason"
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
                    {isPending ? 'Rejecting...' : 'Confirm reject'}
                </button>
            </div>
        </form>
    );
}
