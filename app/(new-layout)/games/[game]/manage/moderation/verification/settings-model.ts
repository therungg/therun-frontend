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
    /** A duration as typed, "30:00"; sent as milliseconds. */
    videoTime: string;
    videoOnMissing: VideoRule['onMissing'];
    autoVerifyEnabled: boolean;
    neverTopN: string;
    minPriorVerifiedRuns: string;
    maxGoldBeatPct: string;
    /** Seconds, as the moderator types them; sent as milliseconds. */
    maxPbJumpSeconds: string;
    liveRequired: boolean;
    /** Carried, not offered: the console asks only that a run was live, and a
     *  board's saved value rides through a save untouched. */
    liveMustMatch: boolean;
};

/** What the field shows when the board has no number to show — a response
 *  from before this dial existed, or one that lost the field on the way. */
const DEFAULT_PB_JUMP_SECONDS = 60;

export const formFrom = (e: EffectiveSettings): SettingsForm => {
    const manual = e.intake.value.manual;
    const video = e.videoRule.value;
    return {
        timerRuns: e.intake.value.timerRuns,
        manualMode: manual.mode,
        manualDays: manual.mode === 'account_age' ? String(manual.days) : '7',
        videoRequire: video.require,
        videoTopN: String(video.topN ?? 10),
        videoTime: video.timeMs ? formatDuration(video.timeMs) : '',
        videoOnMissing: video.onMissing,
        autoVerifyEnabled: e.autoVerify.value.enabled,
        neverTopN: String(e.autoVerify.value.neverTopN),
        minPriorVerifiedRuns: String(e.autoVerify.value.minPriorVerifiedRuns),
        maxGoldBeatPct: String(e.autoVerify.value.maxGoldBeatPct),
        maxPbJumpSeconds: String(
            Number.isFinite(e.autoVerify.value.maxPbJumpMs)
                ? e.autoVerify.value.maxPbJumpMs / 1000
                : DEFAULT_PB_JUMP_SECONDS,
        ),
        liveRequired: e.autoVerify.value.liveRequired,
        liveMustMatch: e.autoVerify.value.liveMustMatch,
    };
};

const int = (text: string): number | null =>
    /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;

/** "30:00", "1:29:59" or "95.5" seconds -> milliseconds; null when unreadable. */
export const parseDuration = (text: string): number | null => {
    const t = text.trim();
    if (t === '') return null;
    const parts = t.split(':');
    if (parts.length > 3) return null;
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // Only the last part carries a decimal; only the first may pass 59, so
        // "90:00" is an hour and a half and "1:90" is a typo.
        const last = i === parts.length - 1;
        if (!(last ? /^\d+(\.\d+)?$/ : /^\d{1,2}$/).test(part)) return null;
        const n = Number(part);
        if (i > 0 && n >= 60) return null;
        seconds = seconds * 60 + n;
    }
    return Math.round(seconds * 1000);
};

/** Milliseconds -> "30:00", the way the field wants them typed back. */
export const formatDuration = (ms: number): string => {
    const total = Math.round(ms / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${minutes}:${pad(seconds)}`;
};

/** Seconds a moderator typed: 0 to a day, decimals allowed, blank is not zero. */
const secs = (v: string): boolean => {
    if (v.trim() === '') return false;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 86400;
};

/** A percentage a moderator typed: 0-100, decimals allowed, blank is not zero. */
const pct = (v: string): boolean => {
    if (v.trim() === '') return false;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
};

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
    if (f.videoRequire === 'under_time' && !parseDuration(f.videoTime))
        return 'Enter the time under which a video is required, as 30:00 or 1:29:59.';
    if (int(f.neverTopN) === null || int(f.neverTopN)! > 1000)
        return 'Never auto-verify the top must be 0 to 1000.';
    // Only worth checking the rest when they are actually in use; an untouched
    // form with auto-verify off should not scold.
    if (f.autoVerifyEnabled) {
        if (
            int(f.minPriorVerifiedRuns) === null ||
            int(f.minPriorVerifiedRuns)! > 100
        )
            return 'Verified runs needed first must be 0 to 100.';
        if (!pct(f.maxGoldBeatPct))
            return 'Largest gold beat must be a number from 0 to 100.';
        if (!secs(f.maxPbJumpSeconds))
            return 'Largest PB improvement must be a number of seconds, up to 86400.';
    }
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
    ...(f.videoRequire === 'under_time'
        ? { timeMs: parseDuration(f.videoTime)! }
        : {}),
    onMissing: f.videoOnMissing,
});
const autoVerifyOf = (f: SettingsForm): AutoVerifySetting => ({
    enabled: f.autoVerifyEnabled,
    neverTopN: int(f.neverTopN)!,
    minPriorVerifiedRuns: int(f.minPriorVerifiedRuns)!,
    maxGoldBeatPct: Number(f.maxGoldBeatPct),
    maxPbJumpMs: Math.round(Number(f.maxPbJumpSeconds) * 1000),
    liveRequired: f.liveRequired,
    // Only meaningful with a live run to compare against, so turning the
    // requirement off turns this off with it.
    liveMustMatch: f.liveRequired && f.liveMustMatch,
});
const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

/** Only the settings the moderator changed go in the request — except the
 *  video rule, which is always sent while it requires something, so
 *  re-saving unchanged settings re-applies it to runs that arrived since. */
export const inputFrom = (
    f: SettingsForm,
    original: SettingsForm,
    categoryId: number | null,
): SaveSettingsInput => {
    const input: SaveSettingsInput = { categoryId };
    if (!same(intakeOf(f), intakeOf(original))) input.intake = intakeOf(f);
    const video = videoOf(f);
    if (video.require !== 'nothing' || !same(video, videoOf(original)))
        input.videoRule = video;
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

/** A change that can hide runs, close intake or change automation has something to preview. */
export const canPreview = (input: SaveSettingsInput) =>
    input.videoRule !== undefined ||
    input.autoVerify !== undefined ||
    input.intake !== undefined;

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
                        v.wouldHide === 1
                            ? 'Saving moves 1 run out of the queue and asks its runner for a video.'
                            : `Saving moves ${v.wouldHide} runs out of the queue and asks their runners for a video.`,
                    );
                if (v.wouldFlag > 0)
                    out.push(
                        v.wouldFlag === 1
                            ? 'Saving flags 1 run in the queue.'
                            : `Saving flags ${v.wouldFlag} runs in the queue.`,
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

/** What a save just did to runs already waiting, as one line — or null when
 *  it touched nothing. */
export const videoRuleAppliedMessage = (applied: {
    hidden: number;
    flagged: number;
}): string | null => {
    const parts: string[] = [];
    if (applied.hidden > 0) {
        parts.push(
            applied.hidden === 1
                ? '1 run moved out of the queue. Its runner was asked for a video.'
                : `${applied.hidden} runs moved out of the queue. Their runners were asked for a video.`,
        );
    }
    if (applied.flagged > 0) {
        parts.push(
            applied.flagged === 1
                ? '1 run flagged in the queue.'
                : `${applied.flagged} runs flagged in the queue.`,
        );
    }
    return parts.length > 0 ? parts.join(' ') : null;
};
