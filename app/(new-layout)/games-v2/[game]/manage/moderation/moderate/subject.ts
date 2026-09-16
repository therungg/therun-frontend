import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';

export interface SheetBoard {
    categoryId: number;
    categorySlug: string;
    categoryDisplay: string;
    subcategoryKey: string;
    primaryTiming: 'rt' | 'gt';
}

export type SheetSubject =
    | { kind: 'run'; entry: LeaderboardEntry; board: SheetBoard }
    | {
          kind: 'runner';
          userId: number;
          runnerName: string;
          categoryId?: number | null;
      }
    | { kind: 'bulk'; entries: LeaderboardEntry[]; board: SheetBoard };

export interface SheetContext {
    gameSlug: string;
    gameId: number;
    gameDisplay: string;
    categories: ResolvedCategory[];
    variables: VariableRow[];
    canSiteBan: boolean;
}
