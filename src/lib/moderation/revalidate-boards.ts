import { updateTag } from 'next/cache';
import { resolveCategory } from '~src/lib/games-v1';
import type { AffectedLeaderboard } from '../../../types/moderation.types';
import { modLogTag } from './public-mod-log';

/**
 * Invalidate the Next.js `'use cache'` leaderboard tags for the boards a
 * moderation action touched. Mirrors the tag scheme in `getLeaderboard`
 * (`lb:{gameSlug}:{categorySlug}:{subcategoryKey}:{rt|gt}:{v|a}`) and the
 * invalidation pattern in the shared verdict/exclude actions.
 *
 * Uses `updateTag` (immediate expiration), not `revalidateTag` — every
 * caller of this helper is a mod/self-serve mutation (verdicts, exclude,
 * restore, board-override, manual-time, marks, report/appeal, submit-run),
 * always invoked from inside a Server Action, and the whole point of the
 * design's "read-your-writes" requirement is that a moderator must see
 * their own action land immediately. `revalidateTag` is stale-while-
 * revalidate — it does NOT guarantee that (see project memory: "server
 * actions do NOT read their own writes" with plain revalidateTag).
 *
 * The backend enqueues its own Redis rebuild; this only clears the frontend's
 * cached reads so the board reflects the change on next load. Best-effort.
 */
export async function revalidateAffectedBoards(
    gameId: number,
    gameSlug: string,
    affected: AffectedLeaderboard[],
): Promise<void> {
    if (affected.length === 0) return;
    try {
        const { categories } = await resolveCategory(gameId);
        const slugById = new Map(categories.map((c) => [c.id, c.name]));
        for (const { categoryId, subcategoryKey } of affected) {
            const categorySlug = slugById.get(categoryId);
            if (!categorySlug) continue;
            for (const timing of ['rt', 'gt'] as const) {
                for (const v of ['v', 'a'] as const) {
                    updateTag(
                        `lb:${gameSlug}:${categorySlug}:${subcategoryKey}:${timing}:${v}`,
                    );
                }
            }
        }
    } catch {
        // Best-effort cache invalidation; the TTL will catch up regardless.
    }
    // Every mod verb that touches a board also writes a `logs` row, so the
    // public mod-log view must invalidate alongside the boards it affected —
    // read-your-writes applies to the log the same as the board itself.
    updateTag(modLogTag(gameId));
}

// Run/manual detail pages cache under run:{id} / manual-time:{id} (minutes profile).
// Call after any verdict/exclude/restore/manual-time mutation so the detail page
// reflects the action immediately.
/**
 * Bust just the public mod log. `revalidateAffectedBoards` already does this,
 * but it returns early when a verb touched no board — and the anonymize verb
 * (workstream C) is exactly that case: it changes no run's board membership,
 * yet always writes a log row the acting mod must see immediately.
 */
export function revalidateModLog(gameId: number): void {
    updateTag(modLogTag(gameId));
}

export function revalidateRunDetails(
    runIds: number[],
    manualTimeIds: number[] = [],
): void {
    for (const id of runIds) updateTag(`run:${id}`);
    for (const id of manualTimeIds) updateTag(`manual-time:${id}`);
}
