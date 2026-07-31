import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import gamePageStyles from '../game-page.module.scss';
import styles from './masthead.module.scss';
import { SwitchBoardPopover } from './switch-board-popover';

interface Props {
    coverUrl: string | null;
    gameDisplay: string;
    /** The board's full name, subcategory values included. */
    boardName: string;
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
 * View controls (VerifiedToggle, FiltersPopover) deliberately do NOT live
 * here — they exist in exactly one place, the leaderboard's meta bar, so
 * no duplicate-instance/focus-trap machinery is needed for them. While
 * this bar is showing, the plate's rail is still mounted just above the
 * viewport; `inert` on each `.plateSection` (board-masthead.tsx) keeps
 * that copy out of the tab order.
 */
export function StickyBoardBar({
    coverUrl,
    gameDisplay,
    boardName,
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
