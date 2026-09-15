import type {
    AutoVerifySetting,
    EffectiveSettings,
    IntakeSetting,
    SaveSettingsInput,
    SettingsPreview,
    VideoRule,
} from '../../../../../../../types/verification-settings.types';

/** Numbers are held as text so a field the moderator is retyping never coerces to 0. */
export type SettingsForm = {
    timerRuns: IntakeSetting['timerRuns'];
    manualMode: IntakeSetting['manual']['mode'];
    manualDays: string;
    videoRequire: VideoRule['require'];
    videoTopN: string;
    videoTimeMs: string;
    videoOnMissing: VideoRule['onMissing'];
    autoVerifyEnabled: boolean;
    neverTopN: string;
    minPriorVerifiedRuns: string;
    maxGoldBeatPct: string;
    maxPbJumpPct: string;
    liveData: AutoVerifySetting['liveData'];
};

export const formFrom = (e: EffectiveSettings): SettingsForm => {
    const manual = e.intake.value.manual;
    const video = e.videoRule.value;
    return {
        timerRuns: e.intake.value.timerRuns,
        manualMode: manual.mode,
        manualDays: manual.mode === 'account_age' ? String(manual.days) : '7',
        videoRequire: video.require,
        videoTopN: String(video.topN ?? 10),
        videoTimeMs: String(video.timeMs ?? ''),
        videoOnMissing: video.onMissing,
        autoVerifyEnabled: e.autoVerify.value.enabled,
        neverTopN: String(e.autoVerify.value.neverTopN),
        minPriorVerifiedRuns: String(e.autoVerify.value.minPriorVerifiedRuns),
        maxGoldBeatPct: String(e.autoVerify.value.maxGoldBeatPct),
        maxPbJumpPct: String(e.autoVerify.value.maxPbJumpPct),
        liveData: e.autoVerify.value.liveData,
    };
};

const int = (text: string): number | null =>
    /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;

/** First problem with the form, in the words the editor shows, or null. */
export const validateForm = (f: SettingsForm): string | null => {
    if (
        f.manualMode === 'account_age' &&
        !(int(f.manualDays) && int(f.manualDays)! <= 365)
    )
        return 'Account age must be 1 to 365 days.';
    if (
        f.videoRequire === 'top_n' &&
        !(int(f.videoTopN) && int(f.videoTopN)! <= 1000)
    )
        return 'Top N for video must be 1 to 1000.';
    if (f.videoRequire === 'under_time' && !int(f.videoTimeMs))
        return 'Enter the time under which a video is required.';
    if (int(f.neverTopN) === null || int(f.neverTopN)! > 1000)
        return 'Never auto-verify the top must be 0 to 1000.';
    return null;
};

const intakeOf = (f: SettingsForm): IntakeSetting => ({
    timerRuns: f.timerRuns,
    manual:
        f.manualMode === 'account_age'
            ? { mode: 'account_age', days: int(f.manualDays)! }
            : ({ mode: f.manualMode } as IntakeSetting['manual']),
});
const videoOf = (f: SettingsForm): VideoRule => ({
    require: f.videoRequire,
    ...(f.videoRequire === 'top_n' ? { topN: int(f.videoTopN)! } : {}),
    ...(f.videoRequire === 'under_time' ? { timeMs: int(f.videoTimeMs)! } : {}),
    onMissing: f.videoOnMissing,
});
const autoVerifyOf = (f: SettingsForm): AutoVerifySetting => ({
    enabled: f.autoVerifyEnabled,
    neverTopN: int(f.neverTopN)!,
    minPriorVerifiedRuns: int(f.minPriorVerifiedRuns)!,
    maxGoldBeatPct: Number(f.maxGoldBeatPct),
    maxPbJumpPct: Number(f.maxPbJumpPct),
    liveData: f.liveData,
});
const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

/** Only the settings the moderator changed go in the request. */
export const inputFrom = (
    f: SettingsForm,
    original: SettingsForm,
    categoryId: number | null,
): SaveSettingsInput => {
    const input: SaveSettingsInput = { categoryId };
    if (!same(intakeOf(f), intakeOf(original))) input.intake = intakeOf(f);
    if (!same(videoOf(f), videoOf(original))) input.videoRule = videoOf(f);
    if (!same(autoVerifyOf(f), autoVerifyOf(original)))
        input.autoVerify = autoVerifyOf(f);
    return input;
};

/** Every setting as the form holds it, for saving the defaults as they stand. */
export const fullInputFrom = (
    f: SettingsForm,
    categoryId: number | null,
): SaveSettingsInput => ({
    categoryId,
    intake: intakeOf(f),
    videoRule: videoOf(f),
    autoVerify: autoVerifyOf(f),
});

export const isDirty = (f: SettingsForm, original: SettingsForm) =>
    !same(f, original);

/** A change that hides runs, closes intake or changes automation must be previewed first. */
export const needsPreview = (input: SaveSettingsInput) =>
    input.videoRule !== undefined ||
    input.autoVerify !== undefined ||
    input.intake !== undefined;

export const canPreview = (input: SaveSettingsInput) => needsPreview(input);

const videoWords = (v: VideoRule) => {
    switch (v.require) {
        case 'nothing':
            return 'no video required';
        case 'everything':
            return 'video required for every run';
        case 'top_n':
            return `video required for the top ${v.topN}`;
        case 'under_time':
            return 'video required under a time';
    }
};

/** One line describing a category's settings, for the collapsed override row. */
export const summarize = (e: EffectiveSettings): string => {
    const parts = [
        videoWords(e.videoRule.value),
        e.autoVerify.value.enabled ? 'auto-verify on' : 'auto-verify off',
    ];
    if (e.intake.value.timerRuns === 'runner_submits')
        parts.push('runners submit their own PBs');
    if (e.intake.value.manual.mode === 'off') parts.push('no submitted times');
    return parts.join(', ');
};

/** What a preview means, as sentences, most consequential first. */
export const previewSentences = (
    p: SettingsPreview,
    enforced: boolean,
): string[] => {
    const out: string[] = [];
    if (p.videoRule) {
        const v = p.videoRule;
        if (v.existingWithoutVideo === 0) {
            out.push('Every pending run this rule covers already has a video.');
        } else {
            out.push(
                `${v.existingWithoutVideo} pending ${v.existingWithoutVideo === 1 ? 'run' : 'runs'} on the board would need a video under this rule.`,
            );
            if (!enforced) {
                out.push(
                    'Runs already on the board stay as they are while these settings are not active yet.',
                );
            } else {
                if (v.wouldHide > 0)
                    out.push(
                        `${v.wouldHide} would come off the board until the runner adds one, if you also apply the rule to runs already there.`,
                    );
                if (v.wouldFlag > 0)
                    out.push(
                        `${v.wouldFlag} would stay on the board and show in the mod queue, if you also apply the rule to runs already there.`,
                    );
            }
        }
        if (v.newRunsLastWeek > 0)
            out.push(
                `In the last 7 days, ${v.newRunsLastWeek} new ${v.newRunsLastWeek === 1 ? 'run' : 'runs'} would have been asked for a video.`,
            );
        if (v.verifiedWithoutVideo > 0)
            out.push(
                `${v.verifiedWithoutVideo} verified ${v.verifiedWithoutVideo === 1 ? 'run has' : 'runs have'} no video. Verified runs are never taken off the board.`,
            );
    }
    if (p.autoVerify) {
        const a = p.autoVerify;
        out.push(
            a.pendingEvaluated === 0
                ? 'No pending timer runs to check.'
                : `Of the ${a.pendingEvaluated} most recent pending runs, ${a.wouldClear} would be verified automatically, ${a.wouldFlag} would be flagged for review, and ${a.couldNotCheck} could not be checked at all.`,
        );
    }
    if (p.intake) {
        if (p.intake.timerRunsLastWeek > 0)
            out.push(
                `${p.intake.timerRunsLastWeek} timer ${p.intake.timerRunsLastWeek === 1 ? 'run' : 'runs'} arrived in the last 7 days. With timer runs closed, runs like these would be kept but left off the board.`,
            );
        if (p.intake.pendingSelfClaims > 0)
            out.push(
                `${p.intake.pendingSelfClaims} self-claimed ${p.intake.pendingSelfClaims === 1 ? 'time is' : 'times are'} waiting in the mod queue. This change doesn't affect them.`,
            );
    }
    if (out.length === 0) out.push('Nothing on the board changes.');
    return out;
};
