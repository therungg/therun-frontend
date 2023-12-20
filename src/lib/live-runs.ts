import { safeEncodeURI } from "~src/utils/uri";
import { Tournament } from "~src/components/tournament/tournament-info";
import { LiveRun } from "~app/live/live.types";

export const liveRunUrl =
    "https://pokzhwoycl3uo7n5lzh6iltyoq0iaibq.lambda-url.eu-west-1.on.aws/";

export const getAllLiveRuns = async (game = null, category = null) => {
    let url = `${liveRunUrl}?minify=true`;

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
        `${liveRunUrl}?game=${safeEncodeURI(game)}&category=${safeEncodeURI(
            category,
        )}`,
    );

    return result.json();
};

export const getLiveRunForUser = async (username: string) => {
    const result = await fetch(`${liveRunUrl}?username=${username}`);

    return result.json();
};
