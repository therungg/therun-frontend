import type {
    AnonymizeRule,
    AnonymizeRuleQuery,
    AnonymizeRuleWithNames,
    CreateAdminAnonymizeInput,
    CreateAnonymizeInput,
    CreateAnonymizeResult,
} from '../../../types/moderation.types';
import { meFetch, modFetch } from './mod-fetch';

/**
 * Anonymize — the "hide identity" verb (design doc §C).
 *
 * Two surfaces, two envelopes:
 *  - the per-game routes ride `/v1/leaderboards/games/{gameId}/…` like every
 *    other game mod endpoint and return **bare** JSON → `modFetch`;
 *  - the admin routes live at `/mod/admin/anonymize` (deliberately NOT
 *    registered as their own API-Gateway resource — the `api` CFN stack is at
 *    499/500) and go through `respond()`, i.e. the `{ result }` envelope →
 *    `meFetch`.
 *
 * Scope rules the backend enforces, mirrored here so the UI never offers an
 * impossible combination:
 *  - `type: 'run'` takes no scope at all (the run *is* the scope).
 *  - `type: 'user'` on a game route is always scoped to that game, optionally
 *    narrowed to one category.
 *  - a GLOBAL (site-wide) user rule can only be created on the admin route,
 *    by passing `gameId: null`.
 *  - lifting is admin-only everywhere, including inside a game a mod
 *    otherwise controls.
 */

const gameBase = (gameId: number) => `/v1/leaderboards/games/${gameId}`;

/** Game mod. `reason` must be ≥ 10 chars or the backend 400s. */
export function createAnonymizeRule(
    sessionId: string,
    gameId: number,
    input: CreateAnonymizeInput,
): Promise<CreateAnonymizeResult> {
    return modFetch(`${gameBase(gameId)}/anonymize`, {
        sessionId,
        method: 'POST',
        body: input,
    });
}

/**
 * Game mod. Carries the REAL identities (`targetDisplayName`, `createdByName`,
 * `liftedByName`) — mod-context only, never render on a public surface.
 */
export function listAnonymizeRules(
    sessionId: string,
    gameId: number,
    q: AnonymizeRuleQuery = {},
): Promise<AnonymizeRuleWithNames[]> {
    return modFetch(`${gameBase(gameId)}/anonymize-rules`, {
        sessionId,
        query: {
            includeLifted: q.includeLifted ? 'true' : undefined,
            includeGlobal: q.includeGlobal ? 'true' : undefined,
            targetUserId: q.targetUserId,
        },
    });
}

/**
 * ADMIN ONLY — 403s for a game mod. Soft lift: the row and its placeholder
 * number survive, so a re-apply reuses the same "Anonymous runner #N".
 */
export function liftAnonymizeRule(
    sessionId: string,
    gameId: number,
    ruleId: number,
    reason: string,
): Promise<AnonymizeRule> {
    return modFetch(`${gameBase(gameId)}/anonymize-rules/${ruleId}`, {
        sessionId,
        method: 'DELETE',
        body: { reason },
    });
}

// ── Admin surface (`{ result }` envelope) ────────────────────────────────────

/** Admin only. `gameId: 'global'` lists site-wide rules; omit for everything. */
export function listAdminAnonymizeRules(
    sessionId: string,
    q: AnonymizeRuleQuery & { gameId?: number | 'global' } = {},
): Promise<AnonymizeRuleWithNames[]> {
    return meFetch('/admin/anonymize', {
        sessionId,
        query: {
            gameId: q.gameId,
            includeLifted: q.includeLifted ? 'true' : undefined,
            targetUserId: q.targetUserId,
        },
    });
}

/** Admin only. `gameId: null` on a `type: 'user'` rule creates a GLOBAL rule. */
export function createAdminAnonymizeRule(
    sessionId: string,
    input: CreateAdminAnonymizeInput,
): Promise<CreateAnonymizeResult> {
    return meFetch('/admin/anonymize', {
        sessionId,
        method: 'POST',
        // `gameId: null` is meaningful here (it *is* the global signal), so it
        // must survive JSON.stringify — hence an explicit null, not omission.
        body: { ...input, gameId: input.gameId ?? null },
    });
}

/** Admin only — lifts any rule, at any scope. */
export function liftAdminAnonymizeRule(
    sessionId: string,
    ruleId: number,
    reason: string,
): Promise<AnonymizeRule> {
    return meFetch(`/admin/anonymize/${ruleId}`, {
        sessionId,
        method: 'DELETE',
        body: { reason },
    });
}
