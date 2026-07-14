// Pure module (no 'use server') so it can export sync helpers and be unit-tested.
import type {
    BoardClaimBoardActivity,
    BoardClaimRequest,
} from '../../../types/board-claims.types';

export interface BoardClaimGroup {
    gameId: number;
    gameSlug: string;
    gameDisplay: string;
    board: BoardClaimBoardActivity | null;
    requests: BoardClaimRequest[];
}

export function groupClaimsByBoard(
    claims: BoardClaimRequest[],
): BoardClaimGroup[] {
    const byGame = new Map<number, BoardClaimGroup>();
    for (const c of claims) {
        let group = byGame.get(c.gameId);
        if (!group) {
            group = {
                gameId: c.gameId,
                gameSlug: c.gameSlug,
                gameDisplay: c.gameDisplay,
                board: c.board ?? null,
                requests: [],
            };
            byGame.set(c.gameId, group);
        }
        group.requests.push(c);
    }
    const groups = [...byGame.values()];
    for (const g of groups) {
        g.requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    groups.sort((a, b) =>
        a.requests[0].createdAt.localeCompare(b.requests[0].createdAt),
    );
    return groups;
}
