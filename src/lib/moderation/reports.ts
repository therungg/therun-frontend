import type {
    CreateReportInput,
    CreateReportResult,
    ModReportRow,
} from '../../../types/moderation.types';
import { meFetch, modFetch } from './mod-fetch';

/** Mod view (§C2): unresolved reports for a game. Bare array. */
export function listGameReports(
    sessionId: string,
    gameId: number,
): Promise<ModReportRow[]> {
    return modFetch(`/v1/leaderboards/games/${gameId}/reports`, { sessionId });
}

/** Public report submission (§F1). Wrapped in `{ result }`. */
export function createReport(
    sessionId: string,
    input: CreateReportInput,
): Promise<CreateReportResult> {
    return meFetch('/v1/reports', { sessionId, method: 'POST', body: input });
}
