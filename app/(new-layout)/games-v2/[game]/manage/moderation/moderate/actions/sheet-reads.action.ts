'use server';

import { getSession } from '~src/actions/session.action';
import { resolveCategory, resolveGame } from '~src/lib/games-v1';
import { getRunById } from '~src/lib/leaderboards-v1';
import { listAnonymizeRules } from '~src/lib/moderation/anonymize';
import { canModerateGame } from '~src/lib/moderation/can-moderate';
import { listManualTimes } from '~src/lib/moderation/manual-times';
import {
    getCategoryRoster,
    getUserEligibleRuns,
    listExclusionRules,
} from '~src/lib/moderation/mass-mgmt';
import { getPublicModLog } from '~src/lib/moderation/public-mod-log';
import { getRunHistory } from '~src/lib/moderation/runs';
import type { RunSplit } from '../../../../../../../../types/leaderboards.types';
import type {
    AnonymizeRuleWithNames,
    GameExclusionRuleRow,
    ManualTimeRow,
    PublicModLogEntry,
    UserEligibleRunRow,
} from '../../../../../../../../types/moderation.types';
import {
    buildBanState,
    buildCombos,
    buildSummary,
} from '../../runner/[userId]/runner-model';
import type {
    OffSegment,
    RunnerSheetData,
    RunSheetSummary,
} from '../sheet-types';

type Fail = { error: string };

const OFF_THRESHOLD_MS = 5000;
const RUNNER_MOD_LOG_LIMIT = 5;

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
        getRunHistory(runId).catch(() => []),
    ]);
    if (!run || run.gameId !== game.id) return { error: 'Run not found' };
    const sortedHistory = [...history].sort((a, b) => b.at.localeCompare(a.at));
    return {
        ok: true,
        summary: {
            ...summarizeSplits(run.splits ?? []),
            finalTimeMs: run.realTime ?? run.gameTime ?? null,
            vodUrls: run.vodUrl ? [run.vodUrl] : [],
            description: run.description ?? null,
            historyCount: sortedHistory.length,
            history: sortedHistory.slice(0, 5),
        },
    };
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

    const [rows, manualTimes, rules, anonymizeRules, modLog, resolvedCats] =
        await Promise.all([
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
            resolveCategory(game.id),
        ]);

    const combos = buildCombos(rows, manualTimes, resolvedCats.categories);
    const banState = buildBanState(rules, userId);
    const summary = buildSummary(combos);

    // No name-by-id resolver exists in src/lib; recover the display name
    // from whichever runner-scoped feed carries one, then fall back to a
    // roster lookup on the runner's top board, then to a stable cosmetic
    // label (every action keys on the numeric userId, not this string).
    let runnerName: string | null =
        manualTimes.find((m) => m.userId === userId)?.runnerName ??
        (banState.gameRule ?? banState.categoryRules[0])?.targetDisplayName ??
        null;
    if (!runnerName && combos.length > 0) {
        const top = combos[0];
        const roster = await getCategoryRoster(
            session.id,
            game.id,
            top.categoryId,
            {
                subcategoryKey: top.subcategoryKey,
                limit: 2000,
            },
        ).catch(() => []);
        runnerName =
            roster.find((r) => r.userId === userId)?.runnerName ?? null;
    }
    runnerName ??= `Runner #${userId}`;

    return {
        ok: true,
        data: {
            runnerName,
            combos,
            banState,
            summary,
            anonymizeRules,
            modLog: modLog.items,
            modLogTotal: modLog.total,
        },
    };
}
