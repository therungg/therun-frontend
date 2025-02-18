import { safeEncodeURI } from "~src/utils/uri";
import { type Tournament } from "~src/components/tournament/tournament-info";
import { type LiveRun } from "~app/live/live.types";

export const LIVE_RUN_URL =
    "https://pokzhwoycl3uo7n5lzh6iltyoq0iaibq.lambda-url.eu-west-1.on.aws/";

// Server
export const getAllLiveRuns = async (
    game: string | null = null,
    category: string | null = null,
) => {
    let url = `${LIVE_RUN_URL}?minify=true`;

    if (game) {
        url += `&game=${safeEncodeURI(game)}`;
        if (category) {
            url += `&category=${safeEncodeURI(category)}`;
        }
    }

    const result = await fetch(url, { next: { revalidate: 30 } });

    return result.json();
};

// Server - Coupled with getLiveRunsForGameCategory
export const getLiveRunsForTournament = async (tournament: Tournament) => {
    const results = tournament.eligibleRuns.map((run) =>
        getLiveRunsForGameCategory(run.game, run.category),
    );

    return (await Promise.all(results)).flat();
};

// server
export const getLiveRunsForGameCategory = async (
    game: string,
    category: string,
): Promise<LiveRun[]> => {
    const result = await fetch(
        `${LIVE_RUN_URL}?game=${safeEncodeURI(game)}&category=${safeEncodeURI(
            category,
        )}`,
    );

    return result.json();
};

// Client + Server
export const getLiveRunForUser = async (username: string) => {
    const result = await fetch(`${LIVE_RUN_URL}?username=${username}`);

    const resolved = await result.json();

    if (Array.isArray(resolved) && resolved.length === 0) return undefined;

    return resolved;
};

// Server
export const getTopNLiveRuns = async (n = 5): Promise<LiveRun[]> => {
    const result = await fetch(`${LIVE_RUN_URL}?limit=${n}`);

    return result.json();
};

// Server
export const getRandomTopLiveRun = async (): Promise<LiveRun[]> => {
    const result = await fetch(`${LIVE_RUN_URL}?random=true`);

    return result.json();
};
