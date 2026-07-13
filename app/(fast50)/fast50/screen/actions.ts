'use server';

import { getSession } from '~src/actions/session.action';
import { composeDeck } from '~src/components/fast50/deck/compose-deck';
import { composePreppedDeck } from '~src/components/fast50/deck/compose-prepped-deck';
import { getRunnerDossier } from '~src/lib/fast50/dossier';
import { getPrepSession, listPrepSessions } from '~src/lib/fast50/prep';
import type { PrepSessionSummary } from '~src/lib/fast50/prep.types';
import { getUserRuns } from '~src/lib/get-user-runs';

export interface RunnerLookup {
    runs: {
        game: string;
        category: string;
        preSlides: number;
        postSlides: number;
        prepSessions: PrepSessionSummary[];
        prepWarnings: number;
    }[];
}

export const lookupRunner = async (
    username: string,
): Promise<RunnerLookup | { error: string }> => {
    const trimmed = username.trim();
    if (!trimmed) return { error: 'Enter a username' };
    const runs = await getUserRuns(trimmed).catch(() => 'error' as const);
    if (runs === 'error') return { error: 'Lookup failed — try again' };
    if (runs.length === 0) return { error: `No runs found for '${trimmed}'` };

    const user = await getSession().catch(() => null);

    const detailed = await Promise.all(
        runs.slice(0, 12).map(async (r) => {
            // Isolate each dossier call: a single malformed payload must not
            // reject the outer Promise.all and kill the whole lookup. A
            // failed dossier reads as slide count 0 below.
            const [pre, post] = await Promise.all([
                getRunnerDossier(trimmed, r.game, r.run, 'pre').catch(
                    () => null,
                ),
                getRunnerDossier(trimmed, r.game, r.run, 'post').catch(
                    () => null,
                ),
            ]);

            // Prep is best-effort: no auth or a backend failure just means
            // no prep info on the row.
            let prepSessions: PrepSessionSummary[] = [];
            let prepWarnings = 0;
            if (user?.id) {
                try {
                    prepSessions = await listPrepSessions(
                        user.id,
                        trimmed,
                        r.game,
                        r.run,
                    );
                    if (prepSessions[0]) {
                        const prep = (
                            await getPrepSession(user.id, prepSessions[0].id)
                        ).data;
                        prepWarnings =
                            (pre
                                ? composePreppedDeck(pre, prep).warnings.length
                                : 0) +
                            (post
                                ? composePreppedDeck(post, prep).warnings.length
                                : 0);
                    }
                } catch {
                    prepSessions = [];
                }
            }

            return {
                game: r.game,
                category: r.run,
                preSlides: pre
                    ? composeDeck(pre).filter((s) => !s.overflow).length
                    : 0,
                postSlides: post
                    ? composeDeck(post).filter((s) => !s.overflow).length
                    : 0,
                prepSessions,
                prepWarnings,
            };
        }),
    );
    return { runs: detailed };
};
