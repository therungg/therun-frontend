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
 * A board as the merge picker lists it. Read straight from `categories`,
 * not from the console's usual category props: those come through an
 * activity floor that drops boards with no runs and boards nobody featured,
 * which are exactly the boards people want to merge.
 */
export interface MergeCategory {
    id: number;
    /** Slug. */
    name: string;
    display: string;
    featured: boolean;
    archived: boolean;
    isExtension: boolean;
    /** Set once this board has been merged away; it is listed, not hidden. */
    mergedInto: number | null;
    runs: number;
    /** What this board splits by, for the warning before submit. */
    subcategories: string[];
    /** The group this board sits in; null when it is ungrouped. */
    groupId: number | null;
    groupName: string | null;
    /** The group's own sort order, which is how the board page orders them. */
    groupSortOrder: number | null;
    /** 'auto' | 'pills' | 'dropdown'; null inherits the game's. */
    groupDisplayMode: string | null;
    /** 'normal' | 'level'. A level group is always a dropdown. */
    groupKind: string | null;
}

export interface MergeCategoryPayload {
    /** games_pg.category_display_mode — the default every group inherits. */
    gameDisplayMode: string | null;
    categories: MergeCategory[];
}

export interface CategoryMergeResult {
    id: number;
    ids: number[];
    /** Null when one category was merged on its own. */
    batchId: string | null;
    status: ReassignmentStatus;
}

/** A Category Extensions board on speedrun.com that is not here yet. */
export interface SrcCategoryExtensionCandidate {
    srcGameId: string;
    srcAbbreviation: string;
    srcName: string;
    srcUrl: string;
}

export interface CategoryExtensionOptions {
    /** Boards already on therun. */
    here: CategoryExtensionCandidate[];
    /** One waiting on speedrun.com, or null. */
    atSource: SrcCategoryExtensionCandidate | null;
    /**
     * Why nothing can be started on this game right now (an import or a merge
     * is still running), or null. The server refuses regardless; this is so
     * the tab can say so instead of offering a button that will not work.
     */
    busy?: string | null;
}

/** A Category Extensions board this game could pull in. */
export interface CategoryExtensionCandidate {
    id: number;
    slug: string;
    display: string;
    coverUrl: string | null;
    runs: number;
    boards: number;
}

/** A merge of another game into this one, waiting for an admin. */
export interface GameMergeRequest {
    id: number;
    sourceGameId: number;
    targetGameId: number;
    performedBy: number;
    performedAt: string;
    status: ReassignmentStatus | 'awaiting_approval' | 'declined';
    statusMessage: string | null;
}

export interface GameMergeRequestResult {
    id: number;
    status: string;
    /** True when the asker moderated both games and it merged on the spot. */
    merged: boolean;
}
