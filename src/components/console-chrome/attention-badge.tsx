'use client';

import { attentionBadgeContent } from './attention-badge-content';
import styles from './console.module.scss';

interface Props {
    count: number;
    /** True when one or more attention sources failed to load — the count
     * shown may be an undercount, not a confirmed total. */
    degraded?: boolean;
    /** Defaults to the sidebar's pill; the tile grid passes its own. */
    className?: string;
}

export function AttentionBadge({ count, degraded = false, className }: Props) {
    const badge = attentionBadgeContent(count, degraded);
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
