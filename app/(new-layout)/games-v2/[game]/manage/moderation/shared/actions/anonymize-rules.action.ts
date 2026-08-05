'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import {
    createAdminAnonymizeRule,
    createAnonymizeRule,
    liftAdminAnonymizeRule,
    liftAnonymizeRule,
    listAnonymizeRules,
} from '~src/lib/moderation/anonymize';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { getUserEligibleRuns } from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import {
    revalidateAffectedBoards,
    revalidateModLog,
    revalidateRunDetails,
} from '~src/lib/moderation/revalidate-boards';
import { defineAbilityFor } from '~src/rbac/ability';
import type {
    AffectedLeaderboard,
    AnonymizeRuleWithNames,
    CreateAnonymizeResult,
} from '../../../../../../../../types/moderation.types';

/**
 * The anonymize verb, filed from the board kebab and the runner panel
 * (design doc §C, mocks fig. 6/7).
 *
 * Note the file next door, `anonymize.action.ts`, is a different thing: it is
 * the SITE-BAN action whose `runTreatment` happens to be called 'anonymize'.
 * That path is coupled to banning; this one hides an identity without
 * touching board membership. Keeping them in separate files so the names
 * can't be confused at the import site.
 *
 * Permissions are re-checked server-side on every entry point, exactly like
 * the neighbouring verdict/exclude actions — a client that hides a button has
 * not enforced anything. Applying is game-mod; LIFTING and GLOBAL scope are
 * admin-only, which the backend also enforces (we mirror it so the UI can
 * disable-with-reason rather than surface a raw 403).
 */

/** Min length the backend's `validateReason` enforces. Mirrored client-side. */
export const MIN_ANONYMIZE_REASON = 10;

type Fail = { error: string };

interface ModContext {
    sessionId: string;
    gameId: number;
    gameName: string;
    isAdmin: boolean;
}

async function requireMod(gameSlug: string): Promise<ModContext | Fail> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }
    return {
        sessionId: session.id,
        gameId: game.id,
        gameName: game.name,
        isAdmin: defineAbilityFor(session).can('moderate', 'admins'),
    };
}

function fail(e: unknown, fallback: string): Fail {
    if (e instanceof ModError) return { error: e.message };
    return { error: fallback };
}

function checkReason(reason: string): string | null {
    return reason.trim().length >= MIN_ANONYMIZE_REASON
        ? null
        : `A reason of at least ${MIN_ANONYMIZE_REASON} characters is required.`;
}

/**
 * The POST returns the rule only — no `affectedLeaderboards`, because
 * anonymizing changes no run's board membership. The cached board pages still
 * bake the runner's name, though, so every board the runner appears on has to
 * be busted. Their eligible-runs list is exactly that set (categoryId +
 * subcategoryKey per run), so derive it rather than nuking the whole game.
 */
async function boardsForUser(
    ctx: ModContext,
    userId: number,
): Promise<AffectedLeaderboard[]> {
    const rows = await getUserEligibleRuns(
        ctx.sessionId,
        ctx.gameId,
        userId,
    ).catch(() => []);
    const seen = new Set<string>();
    const out: AffectedLeaderboard[] = [];
    for (const r of rows) {
        const key = `${r.categoryId}:${r.subcategoryKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            categoryId: r.categoryId,
            subcategoryKey: r.subcategoryKey,
        });
    }
    return out;
}

export interface AnonymizeRunInput {
    runId: number;
    reason: string;
    /** The board this run sits on, for targeted cache invalidation. */
    board: AffectedLeaderboard;
}

/** Hide one run's identity. Scope is the run itself — no category needed. */
export async function anonymizeRunAction(
    gameSlug: string,
    input: AnonymizeRunInput,
): Promise<{ ok: true; result: CreateAnonymizeResult } | Fail> {
    const ctx = await requireMod(gameSlug);
    if ('error' in ctx) return ctx;
    const reasonError = checkReason(input.reason);
    if (reasonError) return { error: reasonError };

    try {
        const result = await createAnonymizeRule(ctx.sessionId, ctx.gameId, {
            type: 'run',
            targetId: input.runId,
            reason: input.reason.trim(),
        });
        await revalidateAffectedBoards(ctx.gameId, ctx.gameName, [input.board]);
        revalidateModLog(ctx.gameId);
        revalidateRunDetails([input.runId]);
        return { ok: true, result };
    } catch (e) {
        return fail(e, 'Failed to hide this run’s identity.');
    }
}

export interface AnonymizeUserInput {
    userId: number;
    reason: string;
    /** Omit (or null) for the whole game; set to narrow to one board. */
    categoryId?: number | null;
}

/** Hide a runner's identity across this game, or on one of its boards. */
export async function anonymizeUserAction(
    gameSlug: string,
    input: AnonymizeUserInput,
): Promise<{ ok: true; result: CreateAnonymizeResult } | Fail> {
    const ctx = await requireMod(gameSlug);
    if ('error' in ctx) return ctx;
    const reasonError = checkReason(input.reason);
    if (reasonError) return { error: reasonError };

    try {
        const result = await createAnonymizeRule(ctx.sessionId, ctx.gameId, {
            type: 'user',
            targetId: input.userId,
            categoryId: input.categoryId ?? null,
            reason: input.reason.trim(),
        });
        await revalidateAffectedBoards(
            ctx.gameId,
            ctx.gameName,
            await boardsForUser(ctx, input.userId),
        );
        revalidateModLog(ctx.gameId);
        return { ok: true, result };
    } catch (e) {
        return fail(e, 'Failed to hide this runner’s identity.');
    }
}

/**
 * Site-wide. Admin only, and the only way to create a global rule — the game
 * route rejects `global: true` by design.
 */
export async function anonymizeUserGloballyAction(
    gameSlug: string,
    input: { userId: number; reason: string },
): Promise<{ ok: true; result: CreateAnonymizeResult } | Fail> {
    const ctx = await requireMod(gameSlug);
    if ('error' in ctx) return ctx;
    if (!ctx.isAdmin) {
        return { error: 'Site-wide anonymizing requires a site admin.' };
    }
    const reasonError = checkReason(input.reason);
    if (reasonError) return { error: reasonError };

    try {
        const result = await createAdminAnonymizeRule(ctx.sessionId, {
            type: 'user',
            targetId: input.userId,
            gameId: null,
            reason: input.reason.trim(),
        });
        // A global rule reaches every game; this frontend can only see one, so
        // bust the boards it can name and let the rest expire on their TTL.
        await revalidateAffectedBoards(
            ctx.gameId,
            ctx.gameName,
            await boardsForUser(ctx, input.userId),
        );
        revalidateModLog(ctx.gameId);
        return { ok: true, result };
    } catch (e) {
        return fail(e, 'Failed to hide this runner site-wide.');
    }
}

/**
 * Lift a rule — ADMIN ONLY. Anonymize is permanent by design; this is the
 * safety valve. Game-scoped rules go through the game route (which does its
 * own admin check), global rules through the admin route.
 */
export async function liftAnonymizeRuleAction(
    gameSlug: string,
    input: {
        ruleId: number;
        reason: string;
        /** Set for a `type: 'user'` rule so its boards can be busted. */
        targetUserId?: number | null;
        /** Set for a `type: 'run'` rule. */
        runId?: number | null;
        board?: AffectedLeaderboard | null;
        global?: boolean;
    },
): Promise<{ ok: true } | Fail> {
    const ctx = await requireMod(gameSlug);
    if ('error' in ctx) return ctx;
    if (!ctx.isAdmin) return { error: 'Lifting requires a site admin.' };
    const reasonError = checkReason(input.reason);
    if (reasonError) return { error: reasonError };

    try {
        if (input.global) {
            await liftAdminAnonymizeRule(
                ctx.sessionId,
                input.ruleId,
                input.reason.trim(),
            );
        } else {
            await liftAnonymizeRule(
                ctx.sessionId,
                ctx.gameId,
                input.ruleId,
                input.reason.trim(),
            );
        }

        const boards = input.targetUserId
            ? await boardsForUser(ctx, input.targetUserId)
            : input.board
              ? [input.board]
              : [];
        await revalidateAffectedBoards(ctx.gameId, ctx.gameName, boards);
        revalidateModLog(ctx.gameId);
        if (input.runId) revalidateRunDetails([input.runId]);
        return { ok: true };
    } catch (e) {
        return fail(e, 'Failed to lift the rule.');
    }
}

/** Mod-context read — carries REAL identities. Never expose to visitors. */
export async function listAnonymizeRulesAction(
    gameSlug: string,
    q: { targetUserId?: number; includeLifted?: boolean } = {},
): Promise<{ ok: true; rules: AnonymizeRuleWithNames[] } | Fail> {
    const ctx = await requireMod(gameSlug);
    if ('error' in ctx) return ctx;

    try {
        const rules = await listAnonymizeRules(ctx.sessionId, ctx.gameId, {
            includeGlobal: true,
            includeLifted: q.includeLifted ?? true,
            targetUserId: q.targetUserId,
        });
        return { ok: true, rules };
    } catch (e) {
        return fail(e, 'Failed to load anonymize rules.');
    }
}
