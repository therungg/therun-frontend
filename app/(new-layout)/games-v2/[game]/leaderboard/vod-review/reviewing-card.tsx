'use client';

import type { VodReviewPatch } from '../../../../../../types/leaderboards.types';
import { detectVod } from './player/types';
import { formatFrameTime, formatMs } from './retime';
import styles from './vod-review.module.scss';

/** One-line summary of what the workbench currently holds. */
export function reviewingSummary(patch: VodReviewPatch | null): string {
    if (!patch) return 'Nothing marked yet';
    const start = patch.markers.find((m) => m.kind === 'start');
    const end = patch.markers.find((m) => m.kind === 'end');
    const parts: string[] = [];
    if (start) parts.push(`start ${formatFrameTime(start.frame, patch.fps)}`);
    if (end) parts.push(`end ${formatFrameTime(end.frame, patch.fps)}`);
    if (patch.retimedMs != null)
        parts.push(`retime ${formatMs(patch.retimedMs)}`);
    return parts.length ? parts.join(' · ') : 'Nothing marked yet';
}

/**
 * Stands in for the embedded player in the inspector drawer while the review
 * workbench is open in the companion pane: says the review is live, mirrors
 * its markers/retime, and offers the way back.
 */
export function ReviewingCard({
    url,
    patch,
    onClose,
}: {
    url: string;
    patch: VodReviewPatch | null;
    onClose: () => void;
}) {
    const kind = detectVod(url)?.kind;
    const host = kind === 'youtube' ? 'YouTube' : 'Twitch';
    return (
        <div className={styles.reviewingCard}>
            <div className={styles.reviewingMain}>
                <div className={styles.reviewingTitle}>
                    {host} VOD · reviewing
                </div>
                <div className={styles.reviewingSummary}>
                    {reviewingSummary(patch)}
                </div>
            </div>
            <button
                type="button"
                className={styles.reviewingClose}
                onClick={onClose}
            >
                Close review
            </button>
        </div>
    );
}
