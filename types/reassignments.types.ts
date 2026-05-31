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
