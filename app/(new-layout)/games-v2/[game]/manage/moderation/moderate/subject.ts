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
    | {
          kind: 'run';
          entry: LeaderboardEntry;
          board: SheetBoard;
          /**
           * False when the launcher does not know the run's status: Approve
           * and Decline wait for the run's summary. Defaults to true.
           */
          statusKnown?: boolean;
      }
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

function entryKey(entry: LeaderboardEntry): string {
    if (entry.runId != null) return String(entry.runId);
    if (entry.manualTimeId != null) return `manual:${entry.manualTimeId}`;
    return `row:${entry.userId ?? entry.runnerName}:${entry.time ?? ''}`;
}

/**
 * Stable identity for a subject. The panel resets its tab and any open form
 * only when this changes, never on a new object for the same subject (a
 * parent re-render or a refresh after a mutation). Tabs render with
 * `key={subjectKey(subject)}` so their own state follows the same rule.
 */
export function subjectKey(subject: SheetSubject): string {
    switch (subject.kind) {
        case 'run':
            return `run:${entryKey(subject.entry)}`;
        case 'runner':
            return `runner:${subject.userId}`;
        case 'bulk':
            return `bulk:${subject.entries.map(entryKey).sort().join(',')}`;
    }
}
