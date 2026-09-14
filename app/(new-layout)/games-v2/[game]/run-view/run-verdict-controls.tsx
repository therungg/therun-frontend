'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ModVerb } from '../manage/moderation/shared/action-model';
import { applyVerdictsAction } from '../manage/moderation/shared/actions/verdicts.action';
import { RunActionDialog } from '../manage/moderation/shared/run-action-dialog';
import { fireUndoToast } from '../manage/moderation/shared/undo-toast';

/**
 * Approve, decline or remove without leaving the run page — the design
 * makes this a first-class place to decide, not just the console's job.
 */
export function RunVerdictControls({
    gameSlug,
    runId,
    runnerName,
    userId,
    categoryId,
    categoryDisplay,
    subcategoryKey,
    timeMs,
    runDate,
    verificationStatus,
    primaryTiming = 'rt',
}: {
    gameSlug: string;
    runId: number;
    runnerName: string;
    userId: number | null;
    categoryId: number;
    categoryDisplay: string;
    subcategoryKey: string;
    timeMs: number | null;
    runDate: string | null;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    /** The category's primary clock, when known — used only on the
     * runner target so Remove can order their other times correctly. */
    primaryTiming?: 'rt' | 'gt';
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verb, setVerb] = useState<ModVerb | null>(null);

    const approve = async () => {
        setBusy(true);
        const res = await applyVerdictsAction(
            gameSlug,
            'verify',
            [runId],
            'Approved. No issues found.',
        );
        setBusy(false);
        if ('error' in res) {
            setError(res.error);
            return;
        }
        fireUndoToast(
            'Run approved.',
            () =>
                applyVerdictsAction(
                    gameSlug,
                    'unverify',
                    [runId],
                    'Undo of an approval from the run page',
                ),
            () => router.refresh(),
        );
        router.refresh();
    };

    return (
        <div>
            <div className="d-flex gap-2">
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={busy || verificationStatus === 'verified'}
                    onClick={approve}
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy || verificationStatus === 'rejected'}
                    onClick={() => setVerb('reject')}
                >
                    Decline
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={busy}
                    onClick={() => setVerb('remove')}
                >
                    Remove
                </button>
            </div>
            {error && (
                <div className="alert alert-danger mt-2" role="alert">
                    {error}
                </div>
            )}
            {verb && (
                <RunActionDialog
                    gameSlug={gameSlug}
                    verb={verb}
                    target={{
                        kind: 'runs',
                        runIds: [runId],
                        label: `${runnerName} · ${categoryDisplay}`,
                        runTimeMs: timeMs,
                        runDate,
                        runner:
                            userId !== null
                                ? {
                                      id: userId,
                                      name: runnerName,
                                      categoryId,
                                      categoryDisplay,
                                      subcategoryKey,
                                      primaryTiming,
                                  }
                                : undefined,
                    }}
                    onDone={() => {
                        setVerb(null);
                        router.refresh();
                    }}
                    onClose={() => setVerb(null)}
                    onUndoComplete={() => router.refresh()}
                />
            )}
        </div>
    );
}
