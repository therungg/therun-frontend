'use server';

import { getSession } from '~src/actions/session.action';
import { resolveGame } from '~src/lib/games-v1';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import {
    deleteExclusionRule,
    exclude,
    include,
} from '~src/lib/moderation/mass-mgmt';
import { ModError } from '~src/lib/moderation/mod-fetch';
import { revalidateAffectedBoards } from '~src/lib/moderation/revalidate-boards';
import type { AffectedLeaderboard } from '../../../../../../../../types/moderation.types';

interface UndoInput {
    logId: number;
    action: string;
    target: string | null;
    data: unknown;
}

const REVERSIBLE = new Set([
    'exclude_run',
    'include_run',
    'exclude_via_rule',
    'delete_exclusion_rule',
]);

export async function undoAction(
    gameSlug: string,
    input: UndoInput,
): Promise<{ ok: true } | { error: string }> {
    const session = await getSession();
    if (!session?.username || !session.id) return { error: 'Not signed in.' };

    const game = await resolveGame(gameSlug);
    if (!game) return { error: 'Game not found.' };
    if (!canModerateGame(session, game.name)) {
        return { error: 'Not authorized to moderate this game.' };
    }

    if (!REVERSIBLE.has(input.action)) {
        return { error: 'This action cannot be undone.' };
    }

    const reason = `Undo of mod action #${input.logId}`;

    try {
        let affected: AffectedLeaderboard[] = [];

        if (input.action === 'exclude_run') {
            const runId = Number.parseInt(input.target ?? '', 10);
            if (!Number.isFinite(runId)) return { error: 'Invalid run id.' };
            const res = await include(session.id, game.id, {
                runIds: [runId],
                reason,
            });
            affected = res.affectedLeaderboards;
        } else if (input.action === 'include_run') {
            const runId = Number.parseInt(input.target ?? '', 10);
            if (!Number.isFinite(runId)) return { error: 'Invalid run id.' };
            const res = await exclude(session.id, game.id, {
                runIds: [runId],
                reason,
            });
            if ('affectedLeaderboards' in res)
                affected = res.affectedLeaderboards;
        } else if (input.action === 'exclude_via_rule') {
            const ruleId = Number.parseInt(input.target ?? '', 10);
            if (!Number.isFinite(ruleId)) return { error: 'Invalid rule id.' };
            const res = await deleteExclusionRule(
                session.id,
                game.id,
                ruleId,
                reason,
            );
            affected = res.affectedLeaderboards;
        } else if (input.action === 'delete_exclusion_rule') {
            const data = (input.data ?? {}) as {
                targetId?: number;
                categoryId?: number | null;
            };
            if (typeof data.targetId !== 'number') {
                return { error: 'Cannot reconstruct rule — missing target.' };
            }
            const res = await exclude(session.id, game.id, {
                rule: {
                    type: 'user',
                    targetId: data.targetId,
                    categoryId: data.categoryId ?? null,
                },
                reason,
            });
            if ('affectedLeaderboards' in res)
                affected = res.affectedLeaderboards;
        }

        await revalidateAffectedBoards(game.id, game.name, affected);
        return { ok: true };
    } catch (e) {
        if (e instanceof ModError) return { error: e.message };
        return { error: 'Failed to undo action.' };
    }
}
