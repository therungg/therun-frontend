'use client';

import { NeedsVideoLine } from '~src/components/waiting-on-you/needs-video-line';
import {
    boardName,
    sameBoard,
} from '~src/components/waiting-on-you/waiting-copy';
import { useWaitingOnYou } from '~src/components/waiting-on-you/waiting-on-you-provider';
import styles from './leaderboards-profile.module.scss';
import { useShowcase } from './showcase-provider';

/**
 * The owner's runs that need a video on boards where they have no entry yet,
 * so there is no row to mark. Boards they are already on get the line under
 * that entry instead (EntryNeedsVideo).
 */
export function NeedsVideoEntries() {
    const { runs } = useWaitingOnYou();
    const { games } = useShowcase();
    const entries = games.flatMap((g) => [...g.entries, ...g.archived]);
    const unlisted = runs.filter(
        (r) => r.kind === 'video' && !entries.some((e) => sameBoard(r, e)),
    );
    if (unlisted.length === 0) return null;
    return (
        <section className={styles.runsGame}>
            <div className={styles.runsRejectedHead}>
                <h3 className={styles.runsTitle}>Needs a video</h3>
                <span className={styles.runsBestWhat}>
                    Only you can see these.
                </span>
            </div>
            <div className={styles.runsRows}>
                {unlisted.map((r) => (
                    <NeedsVideoLine
                        key={r.runId}
                        run={r}
                        label={`${r.gameDisplay ?? 'Unknown game'}, ${boardName(r)}:`}
                    />
                ))}
            </div>
        </section>
    );
}
