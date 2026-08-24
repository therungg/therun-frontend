'use server';

import { getSession } from '~src/actions/session.action';
import {
    getDuplicateFinding,
    getLatestDuplicateScan,
    type ListDuplicateFindingsQuery,
    listDuplicateFindings,
    startDuplicateScan,
    submitDuplicateVerdict,
} from '~src/lib/duplicate-runs';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { confirmPermission } from '~src/rbac/confirm-permission';
import type {
    DuplicateRunDetail,
    DuplicateRunListResponse,
    DuplicateScanInfo,
    DuplicateVerdictInput,
} from '../../../../../types/duplicate-runs.types';

export type ActionResult<T> = { result: T } | { error: string };

/** Site-admin gate, mirroring `admin/exclusions/actions/*` verbatim; `user.id` is the bearer sessionId. */
async function requireAdmin(): Promise<string> {
    const user = await getSession();
    confirmPermission(user, 'moderate', 'admins');
    return user.id;
}

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
    try {
        return { result: await fn() };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: e instanceof Error ? e.message : 'Request failed' };
    }
}

export async function listDuplicateFindingsAction(
    input: ListDuplicateFindingsQuery,
): Promise<ActionResult<DuplicateRunListResponse>> {
    return run(async () => {
        const sessionId = await requireAdmin();
        return listDuplicateFindings(sessionId, input);
    });
}

export async function getDuplicateFindingAction(input: {
    findingId: number;
}): Promise<ActionResult<DuplicateRunDetail>> {
    return run(async () => {
        const sessionId = await requireAdmin();
        return getDuplicateFinding(sessionId, input.findingId);
    });
}

export async function submitVerdictAction(input: {
    findingId: number;
    verdict: DuplicateVerdictInput;
}): Promise<
    ActionResult<
        | { id: number; state: 'dismissed' }
        | { id: number; state: 'actioned'; affectedRunCount: number }
    >
> {
    return run(async () => {
        const sessionId = await requireAdmin();
        return submitDuplicateVerdict(
            sessionId,
            input.findingId,
            input.verdict,
        );
    });
}

export async function startFullScanAction(): Promise<
    ActionResult<{ enqueued: boolean }>
> {
    return run(async () => {
        const sessionId = await requireAdmin();
        return startDuplicateScan(sessionId);
    });
}

export async function getLatestScanAction(): Promise<
    ActionResult<DuplicateScanInfo | null>
> {
    return run(async () => {
        const sessionId = await requireAdmin();
        return getLatestDuplicateScan(sessionId);
    });
}
