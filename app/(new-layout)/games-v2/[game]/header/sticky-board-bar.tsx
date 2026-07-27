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
 * The one-row glass bar `BoardMasthead` mounts once its sentinel reports the
 * plate has scrolled past. Purely presentational — the `stuck` state, the
 * sentinel and the `IntersectionObserver` all live in `BoardMasthead` so it
 * can also make the plate's own duplicate controls `inert` while this bar is
 * the interactive copy (see board-masthead.tsx for why).
 *
 * While this bar is showing, the plate (and its own VerifiedToggle /
 * FiltersPopover) is still mounted just above the viewport, so two live
 * instances of each control exist in the DOM. Both components were checked
 * for anything id-based or otherwise instance-unsafe (see task-6-report.md)
 * and neither has hardcoded ids, aria-controls targets, or module-level
 * shared state, so plain duplication is safe — the one reachable defect
 * was the plate's copy staying interactive and keeping an open popover's
 * focus trap alive after the bar took over, which `inert` + a re-key on
 * the plate's `.utilities` row (in board-masthead.tsx) now fixes.
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
    return (
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
                <span className={styles.stickyGame}>· {gameDisplay}</span>
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
    );
}
