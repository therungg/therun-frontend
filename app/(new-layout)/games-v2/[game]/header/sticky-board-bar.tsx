import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableDef,
} from '../../../../../types/leaderboards.types';
import { FiltersPopover } from '../filters/filters-popover';
import { VerifiedToggle } from '../filters/verified-toggle';
import gamePageStyles from '../game-page.module.scss';
import styles from './masthead.module.scss';
import { SwitchBoardPopover } from './switch-board-popover';

interface Props {
    coverUrl: string | null;
    gameDisplay: string;
    /** The board's full name, subcategory values included. */
    boardName: string;
    verified: boolean;
    defs: VariableDef[];
    selectedVarFilters: Record<string, string>;
    onOpenHistory: () => void;
    /** Passed through to `SwitchBoardPopover` — its own state stays local
     * to that component, not lifted up here. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

/**
 * The one-row glass bar `BoardMasthead` mounts once its sentinel reports the
 * plate has scrolled past. Own-state-free: the `stuck` state, the sentinel
 * and the `IntersectionObserver` all live in `BoardMasthead` so it can also
 * make the plate's own duplicate controls `inert` while this bar is the
 * interactive copy (see board-masthead.tsx for why). `SwitchBoardPopover`
 * (decision 6 of the masthead design) keeps its own open/closed state
 * internally rather than lifting it here — this component only threads its
 * data props through.
 *
 * While this bar is showing, the plate (and its own VerifiedToggle /
 * FiltersPopover) is still mounted just above the viewport, so two live
 * instances of each control exist in the DOM. Both components were checked
 * for anything id-based or otherwise instance-unsafe (see task-6-report.md)
 * and neither has hardcoded ids, aria-controls targets, or module-level
 * shared state, so plain duplication is safe — the one reachable defect
 * was the plate's copy staying interactive and keeping an open popover's
 * focus trap alive after the bar took over, which `inert` on the plate's
 * whole `.railZone` (covering CategoryRail, FilterBar and `.utilities`
 * alike) plus a re-key on `.utilities` itself (in board-masthead.tsx) now
 * fixes.
 */
export function StickyBoardBar({
    coverUrl,
    gameDisplay,
    boardName,
    verified,
    defs,
    selectedVarFilters,
    onOpenHistory,
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
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
            <SwitchBoardPopover
                categories={categories}
                groups={groups}
                selectedCategoryName={selectedCategoryName}
                variableKeys={variableKeys}
            />
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
