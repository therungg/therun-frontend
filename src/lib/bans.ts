import { apiFetch } from '~src/lib/api-client';
import type { CreateSiteBanInput, SiteBan } from '../../types/bans.types';

/** Admin-only (backend enforces `moderate admins`). Creates a site-wide
 * ban; `runTreatment: 'anonymize'` keeps the runs on boards but masks the
 * name as "Anonymous Runner <id>" on all public reads. */
export async function createSiteBan(
    sessionId: string,
    input: CreateSiteBanInput,
): Promise<SiteBan> {
    return apiFetch<SiteBan>('/admin/bans', {
        method: 'POST',
        sessionId,
        body: input,
    });
}

/** Lifts a site-wide ban (admin-only). `liftReason` is required by the
 * backend. Idempotent on the backend for already-lifted bans. */
export async function liftSiteBan(
    sessionId: string,
    banId: number,
    liftReason: string,
): Promise<SiteBan> {
    return apiFetch<SiteBan>(`/admin/bans/${banId}`, {
        method: 'DELETE',
        sessionId,
        body: { liftReason },
    });
}
