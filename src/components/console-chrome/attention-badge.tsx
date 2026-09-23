'use client';

import {
    type AttentionBadgeCopy,
    attentionBadgeContent,
} from './attention-badge-content';
import styles from './console.module.scss';

interface Props {
    count: number;
    /** True when one or more attention sources failed to load — the count
     * shown may be an undercount, not a confirmed total. */
    degraded?: boolean;
    /** Defaults to the sidebar's pill; the tile grid passes its own. */
    className?: string;
    /** Overrides the generic "N items need attention" wording — pass
     * `QUEUE_BADGE_COPY` for a badge that stands for the Queue count. */
    copy?: AttentionBadgeCopy;
}

export function AttentionBadge({
    count,
    degraded = false,
    className,
    copy,
}: Props) {
    const badge = attentionBadgeContent(count, degraded, copy);
    if (!badge) return null;

    return (
        <span
            className={className ?? styles.count}
            aria-label={badge.label}
            title={badge.title}
        >
            {badge.text}
        </span>
    );
}
