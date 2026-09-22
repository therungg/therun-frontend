import type { AllRunsRow } from '../../../../../../../types/all-runs.types';
import type {
    LeaderboardEntry,
    ResolvedCategory,
} from '../../../../../../../types/leaderboards.types';
import type { SheetBoard } from '../moderate/subject';

export function rowBoard(
    row: Pick<AllRunsRow, 'categoryId' | 'subcategoryKey'>,
    boardCategories: ResolvedCategory[],
): SheetBoard | null {
    const category = boardCategories.find((c) => c.id === row.categoryId);
    if (!category) return null;
    return {
        categoryId: category.id,
        categorySlug: category.name,
        categoryDisplay: category.display,
        subcategoryKey: row.subcategoryKey,
        primaryTiming: category.primaryTiming === 'gt' ? 'gt' : 'rt',
    };
}

export function rowEntry(row: AllRunsRow, board: SheetBoard): LeaderboardEntry {
    return {
        runId: row.id,
        rank: 0,
        runnerName: row.runnerName,
        userId: row.userId,
        isGuest: row.isGuest,
        time:
            board.primaryTiming === 'gt' && row.gameTime != null
                ? row.gameTime
                : row.time,
        realTime: row.time,
        gameTime: row.gameTime,
        runDate: row.endedAt,
        vodUrl: row.vodUrl,
        verificationStatus: row.verificationStatus,
        variables: row.variables,
        participants: row.participants,
    };
}
