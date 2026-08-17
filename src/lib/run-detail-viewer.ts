import type {
    ManualTimeDetail,
    RunDetail,
} from '../../types/leaderboards.types';
import { V1FetchError, v1Fetch } from './v1-fetch';

/**
 * The run-detail payload *as the signed-in visitor*, deliberately NOT cached.
 *
 * `getRunById` (leaderboards-v1.ts) is a `'use cache'` read shared by every
 * visitor, so it must never carry a bearer token: the backend skips identity
 * redaction for a run's own owner (see `docs/frontend-guide-self-moderation.md`
 * §4), and storing that answer under a public cache key would hand one
 * runner's real name to everybody.
 *
 * So this is its own uncached fetch, taken only when the public copy came back
 * redacted and there is a session to try it with. It is what lets a runner who
 * hid their identity still see — and use — the owner controls on their own run
 * page; without it, hiding your identity is a one-way door that needs an admin
 * to reopen.
 *
 * Not a server action (this module has no `'use server'`): it takes a session
 * id and must stay callable only from server components.
 */
export async function getRunByIdAsViewer(
    runId: number,
    sessionId: string,
): Promise<RunDetail | null> {
    try {
        const body = await v1Fetch<{ result: RunDetail }>(
            `/v1/leaderboards/runs/${runId}`,
            {
                headers: { Authorization: `Bearer ${sessionId}` },
                cache: 'no-store',
            },
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}

/** Uncached manual-time detail (same reasoning as getRunByIdAsViewer). */
export async function getManualTimeByIdAsViewer(
    id: number,
    sessionId: string,
): Promise<ManualTimeDetail | null> {
    try {
        const body = await v1Fetch<{ result: ManualTimeDetail }>(
            `/v1/leaderboards/manual-times/${id}`,
            {
                headers: { Authorization: `Bearer ${sessionId}` },
                cache: 'no-store',
            },
        );
        return body.result;
    } catch (e) {
        if (e instanceof V1FetchError && e.status === 404) return null;
        throw e;
    }
}
