'use client';

import { useEffect, useRef, useState } from 'react';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
import gamePageStyles from '../game-page.module.scss';
import styles from './masthead.module.scss';

interface Props {
    coverUrl: string | null;
    gameDisplay: string;
    /** The board's full name, subcategory values included. */
    boardName: string;
    verified: boolean;
    defs: VariableDef[];
    selectedVarFilters: Record<string, string>;
    onOpenHistory: () => void;
}

/**
 * Appears only once the masthead plate has scrolled past. A sentinel sits
 * at the plate's bottom edge; when it leaves the top of the viewport the
 * bar takes over. Hidden by default, so with JS off the page simply keeps
 * the plate and no sticky chrome — acceptable for an enhancement.
 *
 * While the bar is showing, the plate (and its own VerifiedToggle /
 * FiltersPopover) is still mounted just above the viewport, so two live
 * instances of each control exist in the DOM. Both components were checked
 * for anything id-based or otherwise instance-unsafe (see task-6-report.md)
 * and neither has hardcoded ids, aria-controls targets, or module-level
 * shared state, so plain duplication is safe.
 */
export function StickyBoardBar({
    coverUrl,
    gameDisplay,
    boardName,
    verified,
    defs,
    selectedVarFilters,
    onOpenHistory,
}: Props) {
    const [stuck, setStuck] = useState(false);
    const sentinel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sentinel.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) =>
                setStuck(!e.isIntersecting && e.boundingClientRect.top < 0),
            { threshold: 0 },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <>
            <div ref={sentinel} className={styles.sentinel} aria-hidden />
            {stuck && (
                <div className={styles.stickyBar}>
                    {coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={coverUrl}
                            alt=""
                            aria-hidden
                            width={20}
                            height={27}
                            className={styles.stickyArt}
                        />
                    )}
                    <span className={styles.stickyTitle}>
                        {boardName}{' '}
                        <span className={styles.stickyGame}>
                            · {gameDisplay}
                        </span>
                    </span>
                    <span className={styles.stickyEnd}>
                        <VerifiedToggle verified={verified} />
                        <FiltersPopover
                            defs={defs}
                            selectedVarFilters={selectedVarFilters}
                        />
                        <button
                            type="button"
                            className={gamePageStyles.quietLink}
                            onClick={onOpenHistory}
                        >
                            WR history
                        </button>
                    </span>
                </div>
            )}
        </>
    );
}
