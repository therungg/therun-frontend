import type {
    DuplicateRunDetail,
    DuplicateRunListResponse,
    DuplicateScanInfo,
    DuplicateVerdictInput,
} from '../../types/duplicate-runs.types';
import { meFetch } from './moderation/mod-fetch';

// Thin fetchers over the duplicate-run-detection admin review API, exposed
// under the moderation sibling API's `/mod` base path (see
// docs/frontend-guide-duplicate-runs.md). Unlike most of the mass-mgmt
// surface (which returns bare JSON and uses `modFetch`), this handler always
// envelopes its payload in `{ result: ... }`, so these use `meFetch`. No
// `'use cache'` — this is a moderation surface and must always be fresh.

export interface ListDuplicateFindingsQuery {
    state?: 'open' | 'dismissed' | 'actioned';
    gameId?: number;
    page?: number;
    pageSize?: number;
}

export function listDuplicateFindings(
    sessionId: string,
    query: ListDuplicateFindingsQuery = {},
): Promise<DuplicateRunListResponse> {
    return meFetch('/duplicate-runs', {
        sessionId,
        query: {
            state: query.state,
            gameId: query.gameId,
            page: query.page,
            pageSize: query.pageSize,
        },
    });
}

export function getDuplicateFinding(
    sessionId: string,
    findingId: number,
): Promise<DuplicateRunDetail> {
    return meFetch(`/duplicate-runs/${findingId}`, { sessionId });
}

export function submitDuplicateVerdict(
    sessionId: string,
    findingId: number,
    input: DuplicateVerdictInput,
): Promise<
    | { id: number; state: 'dismissed' }
    | { id: number; state: 'actioned'; affectedRunCount: number }
> {
    return meFetch(`/duplicate-runs/${findingId}/verdict`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function startDuplicateScan(
    sessionId: string,
): Promise<{ enqueued: boolean }> {
    return meFetch('/duplicate-runs/scan', {
        sessionId,
        method: 'POST',
        body: {},
    });
}

export function getLatestDuplicateScan(
    sessionId: string,
): Promise<DuplicateScanInfo | null> {
    return meFetch('/duplicate-runs/scans/latest', { sessionId });
}
