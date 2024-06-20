import { safeEncodeURI } from "~src/utils/uri";
import { Tournament } from "~src/components/tournament/tournament-info";
import { LiveRun } from "~app/live/live.types";

export const LIVE_RUN_URL =
    "https://pokzhwoycl3uo7n5lzh6iltyoq0iaibq.lambda-url.eu-west-1.on.aws/";

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

    return result.json();
};

export const getLiveRunForUser = async (username: string) => {
    const result = await fetch(`${LIVE_RUN_URL}?username=${username}`);

    return result.json();
};

export const getTopNLiveRuns = async (n = 5) => {
    const result = await fetch(`${LIVE_RUN_URL}?limit=${n}`);

    return result.json();
};

export const getRandomTopLiveRun = async () => {
    const result = await fetch(`${LIVE_RUN_URL}?random=true`);

    return result.json();
};
