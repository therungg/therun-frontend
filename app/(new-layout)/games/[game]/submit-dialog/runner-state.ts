import type {
    RunnerEntriesResult,
    RunnerGameEntry,
} from '../../../../../types/leaderboards.types';
import type { RunnerRef } from '../../../../../types/moderation.types';

export interface BoardSlice {
    categoryId: number;
    subcategoryKey: string;
}

export interface RunnerChoice {
    /**
     * 'account' — linked to a therun account, so the entry shows on their
     * profile. 'name-only' — added under the typed name, not linked to
     * anything else on therun.
     */
    kind: 'account' | 'name-only';
    displayName: string;
    ref: RunnerRef;
    /**
     * The runner's existing entry on the *selected* board, or null. Context,
     * never a block: a team may hold several times on a board and the board
     * ranks the fastest of them (guide §11.9), so a second, slower time is
     * filed like any other. The step names it, and the time step warns when
     * the time being typed would not be the one the board shows.
     */
    existing: RunnerGameEntry | null;
    /** Entries on the game's other boards. Context only, never a block. */
    otherBoards: RunnerGameEntry[];
    canProceed: boolean;
}

const sameSlice = (e: RunnerGameEntry, board: BoardSlice): boolean =>
    e.categoryId === board.categoryId &&
    e.subcategoryKey === board.subcategoryKey;

export function entriesOnOtherBoards(
    entries: RunnerGameEntry[],
    board: BoardSlice,
): RunnerGameEntry[] {
    return entries.filter((e) => !sameSlice(e, board));
}

/**
 * Turns a lookup result plus the typed name into what the runner step renders
 * and what the create call will send.
 *
 * A `userId` only ever comes from the lookup — the search index carries no
 * numeric id — so this is the single place a name becomes an account
 * reference. Everything else is added under the name as typed.
 */
export function resolveRunnerChoice(
    result: RunnerEntriesResult,
    typedName: string,
    board: BoardSlice,
): RunnerChoice {
    const displayName = typedName.trim();

    if (result.status === 'no-account') {
        return {
            kind: 'name-only',
            displayName,
            ref: { guestName: displayName },
            existing: null,
            otherBoards: [],
            canProceed: displayName.length > 0,
        };
    }

    const existing = result.entries.find((e) => sameSlice(e, board)) ?? null;

    return {
        kind: result.userId != null ? 'account' : 'name-only',
        displayName,
        ref:
            result.userId != null
                ? { userId: result.userId }
                : { guestName: displayName },
        existing,
        otherBoards: entriesOnOtherBoards(result.entries, board),
        canProceed: displayName.length > 0,
    };
}
