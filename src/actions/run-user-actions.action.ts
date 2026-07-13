'use server';

import { getSession } from '~src/actions/session.action';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { createReport } from '~src/lib/moderation/reports';
import { revalidateRunDetails } from '~src/lib/moderation/revalidate-boards';
import { appealRun, getRunHistory } from '~src/lib/moderation/runs';
import { selfRunVerdict } from '~src/lib/moderation/self-service';
import type { HistoryEvent } from '../../types/moderation.types';

type Result<T = unknown> = ({ ok: true } & T) | { error: string };

function toError(e: unknown): { error: string } {
    if (e instanceof ModError) return { error: e.message };
    return { error: 'Something went wrong. Please try again.' };
}

/** Report another runner's run (§F1). Any signed-in user. */
export async function reportRunAction(
    runId: number,
    reason: string,
): Promise<Result<{ reported: boolean }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to report a run.' };
    }
    try {
        const r = await createReport(s.id, { runId, reason: reason.trim() });
        return { ok: true, reported: r.reported };
    } catch (e) {
        return toError(e);
    }
}

/** Appeal a verdict on your own run (§G2). */
export async function appealRunAction(
    runId: number,
    reason: string,
): Promise<Result> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in to appeal.' };
    }
    try {
        await appealRun(s.id, runId, { reason: reason.trim() });
        revalidateRunDetails([runId]);
        return { ok: true };
    } catch (e) {
        return toError(e);
    }
}

/** Self reject / unreject your own run (§E3). */
export async function selfRunVerdictAction(
    runId: number,
    action: 'reject' | 'unreject',
    reason?: string,
): Promise<Result<{ applied: 'instant' | 'provisional'; noop?: boolean }>> {
    const s = await getSession();
    if (!s?.username || !s.id) {
        return { error: 'You must be signed in.' };
    }
    try {
        const r = await selfRunVerdict(s.id, runId, {
            action,
            reason: reason?.trim() || undefined,
        });
        revalidateRunDetails([runId]);
        return { ok: true, applied: r.applied, noop: r.noop };
    } catch (e) {
        return toError(e);
    }
}

/** Public run history timeline (§G1). */
export async function loadRunHistoryAction(
    runId: number,
): Promise<Result<{ events: HistoryEvent[] }>> {
    const s = await getSession();
    try {
        const events = await getRunHistory(runId, s?.id);
        return { ok: true, events };
    } catch (e) {
        return toError(e);
    }
}
