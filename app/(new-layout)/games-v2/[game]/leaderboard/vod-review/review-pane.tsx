'use client';

import { useEffect, useState } from 'react';
import type { VodReviewPatch } from '../../../../../../types/leaderboards.types';
import type { VodReviewTarget } from '../actions/vod-review.action';
import { ReviewVodPanel } from './review-vod-panel';
import styles from './vod-review.module.scss';

/**
 * The narrowest viewport at which the review pane can sit beside the 38rem
 * inspector drawer and still give the video more room than the drawer would.
 * Below this the inspector falls back to hosting the workbench inline.
 */
export const REVIEW_PANE_MIN_VIEWPORT = '(min-width: 1150px)';

/**
 * True when the viewport is wide enough for the pane. False on SSR / first
 * paint, and wherever `matchMedia` is missing (jsdom) — inline is the safe
 * default, the pane is the enhancement.
 */
export function useReviewPaneFits(): boolean {
    const [fits, setFits] = useState(false);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia(REVIEW_PANE_MIN_VIEWPORT);
        const sync = () => setFits(mql.matches);
        sync();
        mql.addEventListener('change', sync);
        return () => mql.removeEventListener('change', sync);
    }, []);
    return fits;
}

/**
 * The VOD review workbench as a companion pane that slides out beside the
 * inspector drawer, so the video gets a full column while the drawer keeps
 * showing the run's summary and verbs. Rendered by the inspector as a sibling
 * of its panel, inside the same portal, so it stacks with the drawer.
 */
export function ReviewPane({
    url,
    target,
    gameSlug,
    onSaved,
    onChange,
    onClose,
}: {
    url: string;
    target: VodReviewTarget;
    gameSlug: string;
    onSaved: () => void;
    onChange: (patch: VodReviewPatch | null) => void;
    onClose: () => void;
}) {
    return (
        <aside
            className={`position-fixed top-0 h-100 bg-body shadow-lg d-flex flex-column ${styles.pane}`}
            aria-label="VOD review"
        >
            <div className={styles.paneBar}>
                <span className={styles.paneLabel}>VOD review</span>
                <button
                    type="button"
                    className={styles.paneClose}
                    onClick={onClose}
                >
                    Close review
                </button>
            </div>
            <div className={styles.paneBody}>
                <ReviewVodPanel
                    url={url}
                    target={target}
                    gameSlug={gameSlug}
                    onSaved={onSaved}
                    onChange={onChange}
                />
            </div>
        </aside>
    );
}
