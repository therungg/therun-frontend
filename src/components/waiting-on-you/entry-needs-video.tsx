'use client';

import type { LeaderboardsProfileEntry } from '../../../types/leaderboards-profile.types';
import { NeedsVideoLine } from './needs-video-line';
import { sameBoard } from './waiting-copy';
import { useWaitingOnYou } from './waiting-on-you-provider';

/** Under a profile entry: the owner's newer run on the same board that needs a video. */
export function EntryNeedsVideo({
    entry,
}: {
    entry: Pick<
        LeaderboardsProfileEntry,
        'gameId' | 'categoryId' | 'subcategoryKey' | 'runId'
    >;
}) {
    const { runs } = useWaitingOnYou();
    const run = runs.find(
        (r) =>
            r.kind === 'video' &&
            r.runId !== entry.runId &&
            sameBoard(r, entry),
    );
    return run ? <NeedsVideoLine run={run} /> : null;
}
