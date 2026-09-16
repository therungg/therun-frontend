'use server';

import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
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
import type { RunSplit } from '../../../../../../../../types/leaderboards.types';
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
    countTrackRecord,
    type TrackRecord,
} from '../../runner/[userId]/runner-model';
import type {
    OffSegment,
    RunnerSheetData,
    RunSheetSummary,
} from '../sheet-types';

type Fail = { error: string };

const OFF_THRESHOLD_MS = 5000;

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

function summarizeSplits(
    splits: RunSplit[],
): Pick<RunSheetSummary, 'splitCount' | 'consistency' | 'offSegments'> {
    if (splits.length === 0) {
        return { splitCount: 0, consistency: 'unknown', offSegments: [] };
    }
    const durations = splits.map((s, i) => ({
        name: s.name,
        ms: s.splitTimeMs - (i === 0 ? 0 : splits[i - 1].splitTimeMs),
    }));
    const sorted = [...durations].sort((a, b) => a.ms - b.ms);
    const median = sorted[Math.floor(sorted.length / 2)].ms;
    const off: OffSegment[] = durations
        .map((d) => ({ name: d.name, deltaMs: d.ms - median }))
        .filter((d) => Math.abs(d.deltaMs) > Math.max(OFF_THRESHOLD_MS, median))
        .sort((a, b) => Math.abs(b.deltaMs) - Math.abs(a.deltaMs))
        .slice(0, 3);
    return {
        splitCount: splits.length,
        consistency: off.length ? 'off' : 'consistent',
        offSegments: off,
    };
}

export async function loadRunSheetAction(
    gameSlug: string,
    runId: number,
): Promise<{ ok: true; summary: RunSheetSummary } | Fail> {
    const session = await getSession();
    const game = await resolveGame(gameSlug);
    if (!game || !canModerateGame(session, game.name)) {
        return { error: 'Not allowed' };
    }
    const [run, history] = await Promise.all([
        getRunById(runId),
        // Null, not empty: without the history removed and marked are unknown.
        getRunHistory(runId, session.id).catch(() => null),
    ]);
    if (!run || run.gameId !== game.id) return { error: 'Run not found' };
    if (!history) return { error: 'Could not load the run history.' };
    const sortedHistory = [...history].sort((a, b) => b.at.localeCompare(a.at));
    return {
        ok: true,
        summary: {
            status: run.verificationStatus,
            ...flagsFromHistory(sortedHistory),
            ...summarizeSplits(run.splits ?? []),
            vodUrls: run.vodUrl ? [run.vodUrl] : [],
            historyCount: sortedHistory.length,
            history: sortedHistory.slice(0, 5),
        },
    };
}

/** The Run tab's one runner line: counts from the runner's runs on this game. */
export async function loadRunnerTrackRecordAction(
    gameSlug: string,
    userId: number,
): Promise<{ ok: true; record: TrackRecord } | Fail> {
    const session = await getSession();
    const game = await resolveGame(gameSlug);
    if (!game || !canModerateGame(session, game.name)) {
        return { error: 'Not allowed' };
    }
    try {
        const rows = await getUserEligibleRuns(session.id, game.id, userId);
        return { ok: true, record: countTrackRecord(rows) };
    } catch {
        return { error: 'Could not load the runner.' };
    }
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
