export type SrcSettingsSide = 'here' | 'speedrun.com';
export type SrcSettingsItemStatus = 'new' | 'same' | 'differs' | 'blocked';
export type SrcSettingsChange = 'name' | 'rules' | 'values';
export type SrcSettingsGroup = 'categories' | 'levels' | 'variables';

export interface SrcGameLink {
    srcGameId: string;
    name: string | null;
    abbreviation: string | null;
    weblink: string | null;
}

export interface SrcSettingsUndone {
    undoneAt: string;
    keptBoards: { id: number; name: string; runs: number }[];
    keptValues: {
        variableId: number;
        variableName: string;
        value: string;
        runs: number;
    }[];
    notRestored: { id: number; name: string }[];
}

export interface SrcSettingsJob {
    jobId: number;
    stagedAt: string;
    state: 'planned' | 'applying' | 'undoing' | 'applied' | 'failed';
    appliedAt: string | null;
    error: string | null;
    undone: SrcSettingsUndone | null;
}

export interface SrcSettingsStatus {
    disabled: boolean;
    link: SrcGameLink | null;
    syncedAt: string | null;
    job: SrcSettingsJob | null;
}

interface BoardSide {
    name: string;
    rules: string | null;
}

export interface SrcSettingsCategory {
    srcId: string;
    type: 'per-game' | 'per-level';
    misc: boolean;
    status: SrcSettingsItemStatus;
    changes: SrcSettingsChange[];
    reason: string | null;
    here: BoardSide | null;
    src: BoardSide;
}

export interface SrcSettingsLevel {
    srcId: string;
    status: SrcSettingsItemStatus;
    changes: SrcSettingsChange[];
    reason: string | null;
    here: BoardSide | null;
    src: BoardSide;
}

export interface SrcSettingsVariable {
    srcId: string;
    role: string;
    scope: string;
    targets: string[];
    status: SrcSettingsItemStatus;
    changes: SrcSettingsChange[];
    reason: string | null;
    here: { name: string; values: string[] } | null;
    src: { name: string; values: string[] };
}

export interface SrcSettingsPlan {
    jobId: number;
    stagedAt: string;
    srcGame: {
        id: string;
        name: string;
        abbreviation: string;
        weblink: string;
    };
    categories: SrcSettingsCategory[];
    levels: SrcSettingsLevel[];
    variables: SrcSettingsVariable[];
}

export interface SrcSettingsSelection {
    categories: string[];
    levels: string[];
    variables: string[];
    rules: boolean;
    choices: Record<SrcSettingsGroup, Record<string, SrcSettingsSide>>;
}

export interface SrcSettingsPreview {
    newCategories: number;
    newLevels: number;
    newVariables: number;
    changed: number;
    skipped: {
        kind: 'category' | 'level' | 'variable';
        srcId: string;
        message: string;
    }[];
}

export type SrcMode = 'none' | 'add' | 'copy';

export interface SrcRunSyncStatus {
    disabled: boolean;
    srcMode: SrcMode;
    linked: boolean;
    needsSettings: boolean;
    running: boolean;
    lastSyncAt: string | null;
    lastSync: {
        at: string;
        full: boolean;
        added: number;
        changed: number;
        removed: number;
    } | null;
    nextSyncAt: string | null;
    syncNow: { allowed: boolean; availableAt: string | null };
    lastError: string | null;
    openConflicts: number;
}

export interface SrcRestoreBoard {
    id: number;
    display: string;
}

export interface SrcRestorePreview {
    dryRun: true;
    disabled: boolean;
    linked: boolean;
    running: boolean;
    runs: { hidden: number; retimed: number; moved: number; edited: number };
    openConflicts: number;
    fetchBoards: number;
    archive: { categories: SrcRestoreBoard[]; levels: SrcRestoreBoard[] };
}

export interface SrcRestoreQueued {
    queued: true;
    dryRun: false;
    disabled: boolean;
    linked: boolean;
    running: boolean;
    runs: { hidden: number; retimed: number; moved: number; edited: number };
    openConflicts: number;
    fetchBoards: number;
    archive: { categories: SrcRestoreBoard[]; levels: SrcRestoreBoard[] };
}

export interface SrcBoardRestoredPayload {
    gameId: number;
    gameSlug: string | null;
    gameDisplay: string | null;
}
