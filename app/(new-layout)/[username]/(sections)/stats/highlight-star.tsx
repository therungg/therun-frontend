'use client';

import { useContext, useState } from 'react';
import { toggleRunHighlightAction } from '~src/actions/run-owner.action';
import { AbilityContext, subject } from '~src/rbac/Can.component';
import styles from './stats.module.scss';

function StarIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
        </svg>
    );
}

/**
 * The star in front of a category on the Runs tab.
 *
 * Everyone sees it on a highlighted run; the runner themselves can click it
 * to star or unstar. It sits outside the row's link — the row stays a link
 * through Bootstrap's stretched-link, and this button lifts itself above
 * that overlay — so clicking the star never navigates.
 */
export function HighlightStar({
    username,
    game,
    category,
    highlighted,
}: {
    username: string;
    game: string;
    category: string;
    highlighted: boolean;
}) {
    const ability = useContext(AbilityContext);
    const canToggle = ability.can('delete', subject('run', username));
    const [starred, setStarred] = useState(highlighted);
    const [pending, setPending] = useState(false);

    if (!canToggle) {
        if (!starred) return null;
        return (
            <span
                className={`${styles.star} ${styles.starOn}`}
                title="Highlighted run"
            >
                <StarIcon />
            </span>
        );
    }

    const toggle = async () => {
        if (pending) return;
        // Optimistic: the star is the only thing that changes, and a failed
        // write puts it straight back.
        const next = !starred;
        setStarred(next);
        setPending(true);
        const res = await toggleRunHighlightAction({
            username,
            game,
            category,
        });
        setPending(false);
        setStarred('error' in res ? !next : res.highlighted);
    };

    return (
        <button
            type="button"
            className={`${styles.star}${starred ? ` ${styles.starOn}` : ''}`}
            aria-pressed={starred}
            title={starred ? 'Remove the highlight' : 'Highlight this run'}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void toggle();
            }}
        >
            <StarIcon />
            <span className="visually-hidden">
                {starred ? 'Remove the highlight' : 'Highlight this run'}
            </span>
        </button>
    );
}
