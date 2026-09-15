// Types for per-game (and per-category override) verification settings.
// Mirrors the backend contract in docs/frontend-guide-verification-settings.md
// (copied verbatim from src/leaderboards/verification-settings/types.ts on the
// backend) — field names and casing are exactly what the backend reads/writes,
// do not "fix" them.

export type ManualSubmissions =
    | { mode: 'off' }
    | { mode: 'trusted' } // a verified run on this game
    | { mode: 'account_age'; days: number } // 1-365
    | { mode: 'anyone' };

/**
 * `timerRuns` has two states, not three: refusing LiveSplit runs means the
 * runner is asked to submit the PB themselves, so a timer run is never dropped
 * for being one.
 */
export type IntakeSetting = {
    timerRuns: 'direct' | 'runner_submits';
    manual: ManualSubmissions;
};

export type VideoRule = {
    require: 'nothing' | 'top_n' | 'under_time' | 'everything';
    topN?: number; // 1-1000, required when require = "top_n"
    timeMs?: number; // > 0, required when require = "under_time"
    onMissing: 'hide' | 'flag';
};

/**
 * The dials a board owns. There are no presets: a board starts from the
 * defaults and its moderators move what they want, so retuning a default never
 * shifts a board that was already configured.
 */
export type AutoVerifySetting = {
    enabled: boolean;
    neverTopN: number;
    minPriorVerifiedRuns: number;
    maxGoldBeatPct: number;
    maxPbJumpPct: number;
    liveData: 'must_match' | 'uploads_off';
};

export type SettingSource = 'category' | 'game' | 'category_import' | 'default';

export type EffectiveSettings = {
    intake: { value: IntakeSetting; source: SettingSource };
    videoRule: { value: VideoRule; source: SettingSource };
    autoVerify: { value: AutoVerifySetting; source: SettingSource };
};

export type VerificationSettingsView = {
    enforced: boolean; // the SSM switch
    configured: boolean; // any row of the five types exists for this game
    game: EffectiveSettings; // what a category with no override gets
    categories: {
        categoryId: number;
        display: string;
        effective: EffectiveSettings;
        overridden: Array<keyof EffectiveSettings>;
    }[]; // featured and level boards, featured first
};

export type SaveSettingsInput = {
    categoryId: number | null; // null = game default
    intake?: IntakeSetting | null; // null removes the row (category: inherit the game; game: built-in default)
    videoRule?: VideoRule | null;
    autoVerify?: AutoVerifySetting | null;
    applyVideoRuleToExisting?: boolean; // default false; see Previews
};

export type SettingsPreview = {
    categoryIds: number[]; // the boards the change reaches
    videoRule?: {
        existingWithoutVideo: number; // pending board entries the new rule covers that have no video today
        wouldHide: number; // of those, with an owner we can notify ("apply to runs already on the board")
        wouldFlag: number; // of those, guests, or every one when onMissing = "flag"
        verifiedWithoutVideo: number; // verified entries the rule covers with no video; never hidden, shown for context
        newRunsLastWeek: number; // pending personal bests from the last 7 days the rule would have caught
        sample: {
            runId: number;
            runnerName: string;
            categoryDisplay: string;
            rank: number;
            timeMs: number;
        }[]; // up to 5
    };
    autoVerify?: {
        pendingEvaluated: number; // pending timer runs replayed, at most 100
        wouldClear: number;
        wouldFlag: number;
        couldNotCheck: number;
    };
    intake?: {
        timerRunsLastWeek: number; // timer runs that would have landed ineligible
        pendingSelfClaims: number; // unaffected; shown so the moderator knows they exist
    };
};
