'use client';

import { BoxArrowUpRight } from 'react-bootstrap-icons';
import { DurationToFormatted } from '~src/components/util/datetime';
import type { ModQueueItem } from '../../../../../../../types/moderation.types';
import { ReviewVodPanel } from '../../../leaderboard/vod-review/review-vod-panel';
import { BoardDialog } from '../../../shared/board-dialog';
import styles from './vod-review-dialog.module.scss';

/**
 * The board's VOD review workbench, opened over the queue. A verdict on a
 * timed run is a claim about what the video shows, so the queue hands the
 * mod the same markers-and-retime tool the run inspector does rather than
 * sending them to another tab to eyeball it.
 *
 * The row is held by the pane while this is open, so a save can refresh the
 * table underneath without the dialog losing the run it is reviewing.
 */
export function QueueVodReviewDialog({
    gameSlug,
    row,
    vodUrl,
    onSaved,
    onClose,
}: {
    gameSlug: string;
    row: ModQueueItem;
    /** Narrowed by the caller — the button only exists when there is one. */
    vodUrl: string;
    onSaved: () => void;
    onClose: () => void;
}) {
    return (
        <BoardDialog
            open
            onClose={onClose}
            labelledBy="queue-vod-review-title"
            size="xl"
            // A stray click outside a half-marked retime should not throw the
            // work away; Escape and Close still shut it.
            closeOnBackdropClick={false}
        >
            <div className={styles.head}>
                <div className={styles.headText}>
                    <span className={styles.eyebrow}>VOD review</span>
                    <h2 id="queue-vod-review-title" className={styles.title}>
                        {row.runnerName}
                    </h2>
                    <p className={styles.meta}>
                        {row.categoryDisplay}
                        {row.time != null && (
                            <>
                                {' · '}
                                <DurationToFormatted duration={row.time} />
                            </>
                        )}
                        {row.platform && ` · ${row.platform}`}
                    </p>
                </div>
                <div className={styles.headActions}>
                    <a
                        href={vodUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.openLink}
                    >
                        Open VOD <BoxArrowUpRight size={11} aria-hidden />
                    </a>
                    <button
                        type="button"
                        className={styles.close}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
            <div className={styles.body}>
                <ReviewVodPanel
                    url={vodUrl}
                    target={{ kind: 'run', runId: row.id }}
                    gameSlug={gameSlug}
                    onSaved={onSaved}
                />
            </div>
        </BoardDialog>
    );
}
