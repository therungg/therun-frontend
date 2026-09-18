export type CategoryDecision = 'merge' | 'create' | 'drop';

export interface CategoryMappingEntry {
    sourceCategoryId: number;
    decision: CategoryDecision;
    targetCategoryId: number | null;
    autoCreated: boolean;
}

export type SettingsDiffField =
    | 'primaryTiming'
    | 'hideRealTime'
    | 'hideGameTime'
    | 'requireVideo'
    | 'requireVideoTopN'
    | 'isExtension'
    | 'isMain'
    | 'sortAscending'
    | 'showMilliseconds'
    | 'variables';

export interface SettingsDiff {
    field: SettingsDiffField;
    source: unknown;
    target: unknown;
}

export interface CategorySettingsDiffs {
    sourceCategoryId: number;
    targetCategoryId: number;
    diffs: SettingsDiff[];
}

export type ReassignmentStatus =
    | 'pending'
    | 'running'
    | 'completed'
    | 'failed'
    | 'undoing'
    | 'undone';

export interface GameReassignment {
    id: number;
    sourceGameId: number;
    targetGameId: number;
    performedBy: number;
    performedAt: string;
    undoneBy: number | null;
    undoneAt: string | null;
    categoryMapping: CategoryMappingEntry[];
    settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
    status: ReassignmentStatus;
    statusMessage: string | null;
    runsMovedCount: number;
}

export interface CategoryReassignment {
    id: number;
    sourceCategoryId: number;
    targetCategoryId: number | null;
    gameId: number;
    parentGameReassignmentId: number | null;
    performedBy: number;
    performedAt: string;
    undoneBy: number | null;
    undoneAt: string | null;
    settingsDiffsAcknowledged: CategorySettingsDiffs[] | null;
    status: ReassignmentStatus;
    statusMessage: string | null;
    runsMovedCount: number;
}

export interface PreviewError {
    code: string;
    message: string;
}

export type PreviewResult =
    | {
          valid: true;
          mapping: CategoryMappingEntry[];
          diffs: CategorySettingsDiffs[];
      }
    | { valid: false; errors: PreviewError[] };

/**
 * One row in the category-merge picker: every category on a game, straight
 * from the categories table rather than the stats-derived console list, so
 * boards with no runs and boards nobody featured are in it too.
 */
export interface MergeCategoryOption {
    id: number;
    name: string;
    display: string;
    featured: boolean;
    archived: boolean;
    isExtension: boolean;
    /** Set when this board was already merged away; it can be neither end of a new merge. */
    mergedInto: number | null;
    runs: number;
}
