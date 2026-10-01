'use client';

import { type ReactNode, useState } from 'react';
import styles from './sidebar.module.scss';

interface Props {
    /** Already-rendered `<li>` rows, in display order. */
    items: ReactNode[];
    /** Rows shown while collapsed. */
    limit: number;
}

/**
 * A sidebar list that shows its first `limit` rows and opens to the rest.
 * The rows stay server-rendered; only the open/closed state lives here.
 * Lists at or under the limit render without a toggle.
 */
export function CappedList({ items, limit }: Props) {
    const [expanded, setExpanded] = useState(false);
    const overflow = items.length > limit;
    const shown = overflow && !expanded ? items.slice(0, limit) : items;

    return (
        <>
            <ul className="list-unstyled mb-0">{shown}</ul>
            {overflow && (
                <button
                    type="button"
                    className={`${styles.quietLink} ${styles.cappedToggle}`}
                    aria-expanded={expanded}
                    onClick={() => setExpanded((v) => !v)}
                >
                    {expanded ? 'Show fewer' : `Show all ${items.length}`}
                </button>
            )}
        </>
    );
}
