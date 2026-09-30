import type { Run, RunHistory, SplitsHistory } from '~src/common/types';
import { getSplitsHistoryUrl } from '~src/components/run/get-splits-history';

export interface RunnerHistory {
    splits: SplitsHistory[];
    runs: RunHistory[];
}

export interface RunnerData {
    meta: Run;
    realTime: RunnerHistory;
    gameTime: RunnerHistory | null;
}

/**
 * A runner's run meta plus their splits history, from a category
 * leaderboard entry's url (`/<user>/<game>/<category>`). Null when the run
 * has no history file to compare against.
 */
export async function loadRunner(
    baseUrl: string,
    leaderboardUrl: string,
): Promise<RunnerData | null> {
    // Leaderboard urls of runs with platform/variable qualifiers carry a
    // `$platform:...$variables:...` suffix the run endpoint does not
    // understand - drop it.
    const runUrl = leaderboardUrl.split(/\$|%24/)[0];

    const { meta } = (await (
        await fetch(`${baseUrl}/api/users${runUrl}`, {
            headers: { 'Content-Type': 'application/json' },
        })
    ).json()) as { meta: Run | null };

    if (!meta?.historyFilename) return null;

    const history = async (gameTime: boolean): Promise<RunnerHistory> =>
        (
            await fetch(getSplitsHistoryUrl(meta.historyFilename, gameTime), {
                mode: 'cors',
            })
        ).json();

    const [realTime, gameTime] = await Promise.all([
        history(false),
        meta.hasGameTime ? history(true) : Promise.resolve(null),
    ]);

    return { meta, realTime, gameTime };
}

/** The run meta to show for a timing; game time folds its data over the top. */
export const metaForTiming = (meta: Run, gameTime: boolean): Run =>
    gameTime && meta.gameTimeData ? { ...meta, ...meta.gameTimeData } : meta;
