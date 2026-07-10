'use server';

import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getUserRuns } from '~src/lib/get-user-runs';

export interface RunnerLookup {
    runs: {
        game: string;
        category: string;
        preSlides: number;
        postSlides: number;
    }[];
}

export const lookupRunner = async (
    username: string,
): Promise<RunnerLookup | { error: string }> => {
    const trimmed = username.trim();
    if (!trimmed) return { error: 'Enter a username' };
    const runs = await getUserRuns(trimmed).catch(() => null);
    if (!runs || runs.length === 0)
        return { error: `No runs found for '${trimmed}'` };

    const detailed = await Promise.all(
        runs.slice(0, 12).map(async (r) => {
            const [pre, post] = await Promise.all([
                getRunnerDossier(trimmed, r.game, r.run, 'pre'),
                getRunnerDossier(trimmed, r.game, r.run, 'post'),
            ]);
            return {
                game: r.game,
                category: r.run,
                preSlides: pre
                    ? composeDeck(pre).filter((s) => !s.overflow).length
                    : 0,
                postSlides: post
                    ? composeDeck(post).filter((s) => !s.overflow).length
                    : 0,
            };
        }),
    );
    return { runs: detailed };
};
