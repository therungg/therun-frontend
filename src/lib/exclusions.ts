import { apiFetch } from '~src/lib/api-client';
import { ExclusionRule, ExclusionType } from '../../types/exclusions.types';

export async function getExclusions(
    sessionId: string,
    type?: ExclusionType,
): Promise<ExclusionRule[]> {
    const query = type ? `?type=${type}` : '';
    return apiFetch<ExclusionRule[]>(`/admin/exclusions${query}`, {
        sessionId,
    });
}
