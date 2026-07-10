'use server';

import { cacheLife } from 'next/cache';
import type { History } from '~src/common/types';
import { getSplitsHistoryUrl } from '~src/components/run/get-splits-history';
import { apiFetch } from '~src/lib/api-client';
import { getAdvancedUserStats } from '~src/lib/get-advanced-user-stats';
import { getGlobalUser } from '~src/lib/get-global-user';
import { getRun } from '~src/lib/get-run';
import { type UserData } from '~src/lib/get-session-data';
import { getUserRuns } from '~src/lib/get-user-runs';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { safeEncodeURI } from '~src/utils/uri';
import {
    buildFinishedRuns,
    buildSplits,
    communityPercentile,
    type PercentileLadder,
    toMs,
} from './compute';
import type {
    DeckKind,
    DossierCommunity,
    DossierForm,
    DossierLeaderboards,
    RunnerDossier,
    SourceStatus,
} from './dossier.types';
import { postRunFromHistory, postRunFromLive } from './post-run';

// `GET /games/global/{game}` — confirmed via live curl:
// `{ result: { game, display, image, forceRealTime } }`.
interface GlobalGameResult {
    display: string;
    image?: string;
}

// `GET /games/{game}` — confirmed via live curl: a heavy (~400KB) payload
// covering every category for the game, `{ result: { data, stats,
// statsGameTime } }`. There is no lighter per-category leaderboard endpoint;
// this is the same call `getGame()` (src/components/game/get-game.ts) makes,
// just without its slug-normalization (plain `safeEncodeURI(game)` round-
// tripped fine against the real backend for the runner tested below).
interface CategoryLeaderboardResult {
    stats?: {
        categoryLeaderboards?: {
            categoryName: string;
            pbLeaderboard?: { username: string; placing: number }[];
        }[];
    };
}

// `GET /games/{game}/{category}/segments` — confirmed via live curl to match
// the brief exactly.
interface CommunitySegmentsResult {
    userCount: number;
    communityBests: {
        index: number;
        name: string;
        percentiles?: { avgSegment?: PercentileLadder };
    }[];
    users: {
        username: string;
        segments: { index: number; avgSegmentLast10: number | null }[];
    }[];
}

// `GET /users/{user}/streaks` — the brief guessed
// `currentStartedStreak: { length: number } | null`; the real payload is a
// bare number: `{ result: { currentStartedStreak: number, ... } }`.
interface StreaksResult {
    currentStartedStreak?: number | null;
}

// `getGlobalUser` returns `UserData`, which doesn't declare `country` even
// though the live payload includes it (`{ ..., country: "AU", ... }`).
type ProfileResult = UserData & { country?: string };

// Cached by game alone — the `/games/{game}` payload is ~400KB and covers
// every category for the game, so keying it (like `getRunnerDossier` does)
// by username/category/deck too would re-fetch and re-cache the same heavy
// payload per runner/category/deck combination.
const getGameLeaderboards = async (
    game: string,
): Promise<CategoryLeaderboardResult> => {
    'use cache';
    cacheLife('hours');
    return apiFetch<CategoryLeaderboardResult>(`/games/${safeEncodeURI(game)}`);
};

export const getRunnerDossier = async (
    username: string,
    game: string,
    category: string,
    deck: DeckKind,
): Promise<RunnerDossier | null> => {
    'use cache';
    cacheLife('minutes');

    const sources: SourceStatus[] = [];
    const track = <T>(name: string, p: Promise<T>): Promise<T | null> =>
        p.then(
            (v) => {
                sources.push({ name, ok: true });
                return v;
            },
            (e: unknown) => {
                sources.push({
                    name,
                    ok: false,
                    error: e instanceof Error ? e.message : String(e),
                });
                return null;
            },
        );

    // `getRun`'s `run` param matches `Run.run` (the category). Game/category
    // casing coming off the URL is unreliable, so on a miss fall back to
    // scanning the user's full run list for a case-insensitive match.
    let run = await getRun(username, game, category).catch(() => null);
    if (!run?.historyFilename) {
        const userRuns = await getUserRuns(username).catch(() => []);
        run =
            (userRuns || []).find(
                (r) =>
                    r.game.toLowerCase() === game.toLowerCase() &&
                    r.run.toLowerCase() === category.toLowerCase(),
            ) ?? null;
    }
    if (!run?.historyFilename) return null;

    // Use the resolved, canonically-cased values from here on rather than
    // the raw URL params.
    const resolvedUsername = run.user;
    const resolvedGame = run.game;
    const resolvedCategory = run.run;

    const historyPromise: Promise<History> = fetch(
        getSplitsHistoryUrl(run.historyFilename, false),
        { mode: 'cors' },
    ).then((r) => r.json());

    const [
        history,
        profile,
        gameGlobal,
        segments,
        leaderboard,
        playtime,
        streaks,
        live,
    ] = await Promise.all([
        track('history', historyPromise),
        track(
            'profile',
            getGlobalUser(resolvedUsername) as Promise<ProfileResult>,
        ),
        track(
            'game',
            apiFetch<GlobalGameResult>(
                `/games/global/${safeEncodeURI(resolvedGame)}`,
            ),
        ),
        track(
            'community',
            apiFetch<CommunitySegmentsResult>(
                `/games/${safeEncodeURI(resolvedGame)}/${safeEncodeURI(resolvedCategory)}/segments`,
            ),
        ),
        track('leaderboards', getGameLeaderboards(resolvedGame)),
        track('playtime', getAdvancedUserStats(resolvedUsername, '0')),
        track(
            'streaks',
            apiFetch<StreaksResult>(`/users/${resolvedUsername}/streaks`),
        ),
        deck === 'post'
            ? track('live', getLiveRunForUser(resolvedUsername))
            : Promise.resolve(null),
    ]);

    if (!history) return null; // no splits history → no deck

    const splits = buildSplits(history);
    const finishedRuns = buildFinishedRuns(history);

    const attemptCount = Number(run.attemptCount) || 0;
    const finishedAttemptCount = Number(run.finishedAttemptCount) || 0;

    const community: DossierCommunity | null = segments
        ? {
              userCount: segments.userCount,
              segments: segments.communityBests.map((cb) => {
                  const mine = segments.users
                      .find(
                          (u) =>
                              u.username.toLowerCase() ===
                              resolvedUsername.toLowerCase(),
                      )
                      ?.segments.find((s) => s.index === cb.index);
                  const ladder = cb.percentiles?.avgSegment;
                  const userAvgMs = toMs(mine?.avgSegmentLast10);
                  return {
                      index: cb.index,
                      name: cb.name,
                      userAvgMs,
                      percentile:
                          userAvgMs !== null && ladder
                              ? communityPercentile(userAvgMs, ladder)
                              : null,
                  };
              }),
          }
        : null;

    const catBoard = leaderboard?.stats?.categoryLeaderboards?.find(
        (c) => c.categoryName.toLowerCase() === resolvedCategory.toLowerCase(),
    );
    const pbEntry = catBoard?.pbLeaderboard?.find(
        (e) => e.username.toLowerCase() === resolvedUsername.toLowerCase(),
    );
    const leaderboards: DossierLeaderboards | null = catBoard
        ? {
              pbPlacing: pbEntry?.placing ?? null,
              entrants: catBoard.pbLeaderboard?.length ?? null,
          }
        : null;

    const form: DossierForm | null = playtime
        ? buildForm(
              playtime.playtimePerDayMap ?? {},
              streaks?.currentStartedStreak ?? null,
          )
        : null;

    const postRun =
        deck === 'post' && live
            ? postRunFromLive(live, splits, 'live')
            : deck === 'post' && history
              ? postRunFromHistory(history, splits)
              : null;

    return {
        deck,
        generatedAt: new Date().toISOString(),
        runner: {
            username: resolvedUsername,
            picture: profile?.picture,
            country: profile?.country,
            pronouns: profile?.pronouns,
        },
        game: {
            game: resolvedGame,
            display: gameGlobal?.display ?? resolvedGame,
            category: resolvedCategory,
            image: gameGlobal?.image,
        },
        core: {
            pbMs: toMs(run.personalBest),
            sobMs: toMs(run.sumOfBests),
            attemptCount,
            finishedAttemptCount,
            finishRate:
                attemptCount > 0 ? finishedAttemptCount / attemptCount : 0,
            categoryPlaytimeMs: toMs(run.totalRunTime),
        },
        splits,
        finishedRuns,
        community,
        leaderboards,
        form,
        postRun,
        sources,
    };
};

const buildForm = (
    playtimePerDayMap: Record<string, { total: number }>,
    currentStreakDays: number | null,
): DossierForm => {
    const now = Date.now();
    const cutoff = now - 14 * 24 * 3600_000;
    let total = 0;
    let activeDays = 0;
    for (const [day, value] of Object.entries(playtimePerDayMap)) {
        const t = new Date(day).getTime();
        if (Number.isFinite(t) && t >= cutoff && t <= now && value?.total) {
            total += value.total;
            activeDays += 1;
        }
    }
    return {
        last14dPlaytimeMs: total > 0 ? total : null,
        last14dActiveDays: activeDays > 0 ? activeDays : null,
        currentStreakDays,
    };
};
