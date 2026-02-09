'use server';

import { cacheLife } from 'next/cache';
import { type LiveRun } from '~app/(old-layout)/live/live.types';
import { type Tournament } from '~src/components/tournament/tournament-info';
import { safeEncodeURI } from '~src/utils/uri';

const LIVE_RUN_URL = `${process.env.NEXT_PUBLIC_DATA_URL}/live`;

export const getAllLiveRuns = async (
    game: string | null = null,
    category: string | null = null,
) => {
    'use cache';
    cacheLife('seconds');
    let url = `${LIVE_RUN_URL}?minify=true`;

    if (game) {
        url += `&game=${safeEncodeURI(game)}`;
        if (category) {
            url += `&category=${safeEncodeURI(category)}`;
        }
    }

    const result = await fetch(url);

    return (await result.json()).result;
};

export const getLiveRunsForTournament = async (tournament: Tournament) => {
    const results = tournament.eligibleRuns.map((run) =>
        getLiveRunsForGameCategory(run.game, run.category),
    );

    return (await Promise.all(results)).flat();
};

export const getLiveRunsForGameCategory = async (
    game: string,
    category: string,
): Promise<LiveRun[]> => {
    const result = await fetch(
        `${LIVE_RUN_URL}?game=${safeEncodeURI(game)}&category=${safeEncodeURI(
            category,
        )}`,
    );

    return (await result.json()).result;
};

export const getLiveRunForUser = async (username: string) => {
    const result = await fetch(`${LIVE_RUN_URL}?username=${username}`);

    const resolved = (await result.json()).result;

    if (Array.isArray(resolved) && resolved.length === 0) return undefined;

    return resolved;
};

export const getTopNLiveRuns = async (n = 5): Promise<LiveRun[]> => {
    const result = await fetch(`${LIVE_RUN_URL}?limit=${n}`);

    return (await result.json()).result;
};

export const getRandomTopLiveRun = async () => {
    const result = await fetch(`${LIVE_RUN_URL}?random=true`);

    return (await result.json()).result;
};
