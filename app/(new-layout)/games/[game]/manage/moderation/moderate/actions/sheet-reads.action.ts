'use server';

import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { listAnonymizeRules } from '~src/lib/moderation/anonymize';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import {
    getUserEligibleRuns,
    listExclusionRules,
    listModActions,
} from '~src/lib/moderation/mass-mgmt';
import {
    buildAnonymizeIndex,
    buildModeratorFeed,
} from '~src/lib/moderation/mod-feed';
import { getPublicModLog } from '~src/lib/moderation/public-mod-log';
import { getRunHistory } from '~src/lib/moderation/runs';
import type {
    AnonymizeRuleWithNames,
    GameExclusionRuleRow,
    HistoryEvent,
    ManualTimeRow,
    PublicModLogEntry,
    UserEligibleRunRow,
} from '../../../../../../../../types/moderation.types';
import {
    buildBanState,
    buildCombos,
    buildSummary,
} from '../../runner/[userId]/runner-model';
import type { RunnerSheetData } from '../sheet-types';

type Fail = { error: string };

// Only direct run exclusions count. A ban rule's exclusion (`exclude_via_rule`)
// is lifted by deleting the rule, which never shows in run history.
const EXCLUDE_ACTIONS = new Set(['exclude_run', 'bulk_exclude']);
const INCLUDE_ACTIONS = new Set(['include_run', 'bulk_include']);

/** `history` newest first; the newest event of each kind decides. */
function flagsFromHistory(history: HistoryEvent[]): {
    excluded: boolean;
    marked: boolean;
} {
    let excluded: boolean | null = null;
    let marked: boolean | null = null;
    for (const e of history) {
        if (excluded === null) {
            if (EXCLUDE_ACTIONS.has(e.action)) excluded = true;
            else if (INCLUDE_ACTIONS.has(e.action)) excluded = false;
        }
        if (marked === null) {
            if (e.action === 'mark_run') marked = true;
            else if (e.action === 'unmark_run') marked = false;
        }
        if (excluded !== null && marked !== null) break;
    }
    return { excluded: excluded ?? false, marked: marked ?? false };
}
const RUNNER_MOD_LOG_LIMIT = 5;
// The authed feed is time-windowed; the backend caps it at a year.
const RUNNER_MOD_FEED_DAYS = 365;

const HISTORY_READS_AT_ONCE = 10;

/**
 * Which of these runs are removed: the newest direct exclude or include in
 * each run's history. Fails as a whole when
 * any history read fails, so Restore never guesses.
 */
export async function loadRemovedRunIdsAction(
    gameSlug: string,
    runIds: number[],
): Promise<{ ok: true; removedIds: number[] } | Fail> {
    const session = await getSession();
    const game = await resolveGame(gameSlug);
    if (!game || !canModerateGame(session, game.name)) {
        return { error: 'Not allowed' };
    }
    const removedIds: number[] = [];
    try {
        for (let i = 0; i < runIds.length; i += HISTORY_READS_AT_ONCE) {
            const chunk = runIds.slice(i, i + HISTORY_READS_AT_ONCE);
            const histories = await Promise.all(
                chunk.map((id) => getRunHistory(id, session.id)),
            );
            histories.forEach((history, j) => {
                const sorted = [...history].sort((a, b) =>
                    b.at.localeCompare(a.at),
                );
                if (flagsFromHistory(sorted).excluded) {
                    removedIds.push(chunk[j]);
                }
            });
        }
    } catch {
        return { error: 'Could not check which runs are removed.' };
    }
    return { ok: true, removedIds };
}

export async function loadRunnerSheetAction(
    gameSlug: string,
    userId: number,
): Promise<{ ok: true; data: RunnerSheetData } | Fail> {
    const session = await getSession();
    const game = await resolveGame(gameSlug);
    if (!game || !canModerateGame(session, game.name)) {
        return { error: 'Not allowed' };
    }

    const [
        rows,
        manualTimes,
        rules,
        anonymizeRules,
        modLog,
        modActions,
        resolvedCats,
    ] = await Promise.all([
        getUserEligibleRuns(session.id, game.id, userId).catch(
            () => [] as UserEligibleRunRow[],
        ),
        listManualTimes(session.id, game.id, { userId }).catch(
            () => [] as ManualTimeRow[],
        ),
        listExclusionRules(session.id, game.id).catch(
            () => [] as GameExclusionRuleRow[],
        ),
        listAnonymizeRules(session.id, game.id, {
            targetUserId: userId,
            includeGlobal: true,
            includeLifted: true,
        }).catch(() => [] as AnonymizeRuleWithNames[]),
        getPublicModLog({
            gameId: game.id,
            targetUserId: userId,
            limit: RUNNER_MOD_LOG_LIMIT,
        }).catch(
            () =>
                ({
                    items: [] as PublicModLogEntry[],
                    total: 0,
                    limit: RUNNER_MOD_LOG_LIMIT,
                    offset: 0,
                    hasMore: false,
                }) as const,
        ),
        // The same slice with real names: the public feed shows a
        // placeholder for a hidden runner. Null falls back to public rows.
        listModActions(session.id, game.id, {
            days: RUNNER_MOD_FEED_DAYS,
            limit: RUNNER_MOD_LOG_LIMIT,
            targetUserId: userId,
        }).catch(() => null),
        resolveCategory(game.id),
    ]);

    const combos = buildCombos(rows, manualTimes, resolvedCats.categories);
    const banState = buildBanState(rules, userId);
    const summary = buildSummary(combos);

    return {
        ok: true,
        data: {
            combos,
            banState,
            summary,
            anonymizeRules,
            modLog: modActions
                ? buildModeratorFeed(
                      modActions,
                      buildAnonymizeIndex(anonymizeRules),
                  )
                : modLog.items,
            modLogTotal: modLog.total,
        },
    };
}
