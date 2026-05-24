import type {
    BulkExcludeResult,
    BulkIncludeResult,
    CreateRuleResult,
    DeleteRuleResult,
    ExcludeInput,
    GameExclusionRuleRow,
    IncludeInput,
    LeaderboardRosterRow,
    ModActionRow,
    ModActionsFilter,
    PreviewExcludeInput,
    PreviewExcludeResult,
    RosterFilter,
    UserEligibleRunRow,
} from '../../../types/moderation.types';
import { modFetch } from './mod-fetch';

const base = (gameId: number) => `/v1/leaderboards/games/${gameId}`;

export function getUserEligibleRuns(
    sessionId: string,
    gameId: number,
    userId: number,
): Promise<UserEligibleRunRow[]> {
    return modFetch(`${base(gameId)}/users/${userId}/eligible-runs`, {
        sessionId,
    });
}

export function getCategoryRoster(
    sessionId: string,
    gameId: number,
    categoryId: number,
    filter?: RosterFilter,
): Promise<LeaderboardRosterRow[]> {
    return modFetch(`${base(gameId)}/categories/${categoryId}/eligible-runs`, {
        sessionId,
        query: {
            subcategoryKey: filter?.subcategoryKey,
            verificationStatus: filter?.verificationStatus,
            hasVod:
                filter?.hasVod === undefined
                    ? undefined
                    : filter.hasVod
                      ? 'true'
                      : 'false',
            runnerName: filter?.runnerName,
            endedAfter: filter?.endedAfter,
            endedBefore: filter?.endedBefore,
            limit: filter?.limit,
            offset: filter?.offset,
        },
    });
}

export function previewExclude(
    sessionId: string,
    gameId: number,
    input: PreviewExcludeInput,
): Promise<PreviewExcludeResult> {
    return modFetch(`${base(gameId)}/exclude/preview`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function exclude(
    sessionId: string,
    gameId: number,
    input: ExcludeInput,
): Promise<BulkExcludeResult | CreateRuleResult> {
    return modFetch(`${base(gameId)}/exclude`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function include(
    sessionId: string,
    gameId: number,
    input: IncludeInput,
): Promise<BulkIncludeResult> {
    return modFetch(`${base(gameId)}/include`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

export function listExclusionRules(
    sessionId: string,
    gameId: number,
): Promise<GameExclusionRuleRow[]> {
    return modFetch(`${base(gameId)}/exclusion-rules`, { sessionId });
}

export function deleteExclusionRule(
    sessionId: string,
    gameId: number,
    ruleId: number,
    reason: string,
): Promise<DeleteRuleResult> {
    return modFetch(`${base(gameId)}/exclusion-rules/${ruleId}`, {
        sessionId,
        method: 'DELETE',
        body: { reason },
    });
}

export function listModActions(
    sessionId: string,
    gameId: number,
    filter?: ModActionsFilter,
): Promise<ModActionRow[]> {
    return modFetch(`${base(gameId)}/mod-actions`, {
        sessionId,
        query: filter ? { ...filter } : undefined,
    });
}
