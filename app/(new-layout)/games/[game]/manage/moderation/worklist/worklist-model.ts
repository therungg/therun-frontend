import { videoSource } from '~src/lib/vod-url';
import type {
    RunParticipant,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    QueueReason,
    WorklistEntry,
    WorklistItem,
    WorklistTrackRecord,
} from '../../../../../../../types/worklist.types';
import { formatSubcategoryKey } from '../../../labels';
import type { ReviewTarget } from '../../../run-view/mod/use-run-param';

/**
 * The run's subcategory in words ("PC · Patch 1.0"), or '' when the board has
 * none. Only this category's subcategory variables are used, so a variable of
 * the same name on another category can't relabel the value.
 */
export const subcategoryLabel = (
    item: Pick<WorklistItem, 'categoryId' | 'subcategoryKey'>,
    variables: VariableRow[],
): string =>
    formatSubcategoryKey(
        item.subcategoryKey,
        variables.filter(
            (v) => v.categoryId === item.categoryId && v.role === 'subcategory',
        ),
    );

/** "Any% · PC" — the category with its subcategory, as a moderator names a board. */
export const boardLabel = (
    item: Pick<
        WorklistItem,
        'categoryId' | 'categoryDisplay' | 'subcategoryKey'
    >,
    variables: VariableRow[],
): string => {
    const sub = subcategoryLabel(item, variables);
    return sub ? `${item.categoryDisplay} · ${sub}` : item.categoryDisplay;
};

const DAY = 86_400_000;

const daysSince = (iso: string, now: Date): number =>
    Math.floor((now.getTime() - new Date(iso).getTime()) / DAY);

/** Same thresholds as the mod queue: amber at 3 days, red at 14. */
export const ageTone = (
    iso: string,
    now: Date,
): 'fresh' | 'aging' | 'stale' => {
    const d = daysSince(iso, now);
    if (d >= 14) return 'stale';
    if (d >= 3) return 'aging';
    return 'fresh';
};

export const waitingLabel = (iso: string, now: Date): string => {
    const d = daysSince(iso, now);
    if (d <= 0) return 'today';
    if (d === 1) return '1 day';
    return `${d} days`;
};

/** How long a row has waited, in a narrow column: "40m", "5h", "3d", "2mo", "1y". */
export const ageLabel = (iso: string, now: Date): string => {
    const ms = Math.max(0, now.getTime() - new Date(iso).getTime());
    const minutes = Math.floor(ms / 60_000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(ms / DAY);
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
};

/**
 * "reminded today" / "reminded 1 day ago" / "reminded N days ago" — its own
 * function rather than `reminded ${waitingLabel(...)} ago`, because
 * `waitingLabel`'s "today" makes that read as "reminded today ago".
 */
export const remindedLabel = (iso: string, now: Date): string => {
    const d = daysSince(iso, now);
    if (d <= 0) return 'reminded today';
    if (d === 1) return 'reminded 1 day ago';
    return `reminded ${d} days ago`;
};

export const boardTimeMs = (item: WorklistItem): number =>
    item.primaryTiming === 'gametime' && item.gameTime !== null
        ? item.gameTime
        : item.time;

const formatMs = (ms: number): string => {
    const abs = Math.abs(ms);
    const totalSeconds = Math.floor(abs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const frac = Math.floor((abs % 1000) / 10)
        .toString()
        .padStart(2, '0');
    const mm = h > 0 ? m.toString().padStart(2, '0') : String(m);
    const ss = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}.${frac}` : `${mm}:${ss}.${frac}`;
};

/** "−1.1s", "−48.0s", "−1:02", "+1:03:40": the delta in a narrow column. */
export const shortDelta = (ms: number): string => {
    const sign = ms < 0 ? '−' : '+';
    const abs = Math.abs(ms);
    if (abs < 60_000) return `${sign}${(abs / 1000).toFixed(1)}s`;
    const totalSeconds = Math.round(abs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const ss = (totalSeconds % 60).toString().padStart(2, '0');
    return h > 0
        ? `${sign}${h}:${m.toString().padStart(2, '0')}:${ss}`
        : `${sign}${m}:${ss}`;
};

/** "-1:02.30 from their PB", "+0:04.10 from their PB", or null with no previous PB. */
export const deltaLabel = (item: WorklistItem): string | null => {
    if (item.deltaMs === null) return null;
    const sign = item.deltaMs < 0 ? '−' : '+';
    return `${sign}${formatMs(item.deltaMs)} from their PB`;
};

/** One line a moderator can read at a glance. Null for guests. */
export const trackRecordLine = (
    r: WorklistTrackRecord | null,
): string | null => {
    if (!r) return null;
    const parts = [
        `${r.verifiedRunsThisGame} verified here`,
        ...(r.rejectedRunsThisGame > 0
            ? [`${r.rejectedRunsThisGame} rejected here`]
            : []),
        `${r.verifiedRuns} verified across ${r.gamesRun} ${r.gamesRun === 1 ? 'game' : 'games'}`,
        r.hasLiveTracked ? 'has tracked live' : 'never tracked live',
    ];
    if (r.accountCreatedAt) {
        const days = Math.floor(
            (Date.now() - new Date(r.accountCreatedAt).getTime()) / DAY,
        );
        parts.push(
            days < 30
                ? `account ${days} days old`
                : `account since ${r.accountCreatedAt.slice(0, 10)}`,
        );
    }
    return parts.join(' · ');
};

// ---- Queue rows ------------------------------------------------------

/** Every reason a run can be on the queue, in the order the queue ranks them. */
export const QUEUE_REASONS: readonly QueueReason[] = [
    'reported',
    'appealed',
    'manual_submission',
    'auto_verify_failed',
    'removed_from_src',
    'missing_video',
    'auto_verify_unavailable',
    'not_verified_on_src',
    'new_pb',
];

/** The reason's name, on the row's chips and in the filter rail. */
export const REASON_LABEL: Record<QueueReason, string> = {
    reported: 'Reported',
    appealed: 'Appealed',
    manual_submission: 'Manual submission',
    auto_verify_failed: 'Auto-verify failed',
    removed_from_src: 'Removed from SRC',
    missing_video: 'Missing video',
    auto_verify_unavailable: "Couldn't auto-verify",
    not_verified_on_src: 'Not verified on SRC yet',
    new_pb: 'New PB',
};

/** A failed auto-verify check, in words. Keyed by the raw check key. */
export const CHECK_SENTENCE: Record<string, string> = {
    consistency: "Split times don't add up to the final time",
    wall_clock: "The timer doesn't match the time that passed",
    'live-match': "Doesn't match what we saw live",
    no_live_match: "Doesn't match what we saw live",
    ambiguous_live_match: "Doesn't match what we saw live",
    live_not_comparable: "Doesn't match what we saw live",
    'gold-beat': 'Beats their best segments by a lot',
    'pb-jump': 'Big jump over their previous PB',
    'prior-runs': 'Much faster than their other runs',
    'top-n': 'Would be a top-N time; those always go to a mod',
};

/** The failed checks as sentences, each sentence once, in the backend's order. */
const checkSentences = (failedChecks: string[]): string[] => [
    ...new Set(
        failedChecks.flatMap((c) =>
            CHECK_SENTENCE[c] ? [CHECK_SENTENCE[c]] : [],
        ),
    ),
];

/** The row's "why": one line saying why the item is on the queue. */
export function reasonLine(e: WorklistEntry): string {
    switch (e.reason) {
        case 'reported':
            return e.detail
                ? `Reported: "${e.detail}" · check what the report says`
                : 'Reported · check what the report says';
        case 'appealed':
            return e.detail
                ? `Appealed the rejection: "${e.detail}"`
                : 'Appealed the rejection';
        case 'manual_submission':
            return 'Manual submission';
        case 'auto_verify_failed':
            return checkSentences(e.failedChecks)[0] ?? 'Auto-verify failed';
        case 'removed_from_src':
            return 'Was verified on SRC, now removed there';
        case 'missing_video':
            return 'No video, and this board needs one';
        case 'auto_verify_unavailable':
            return "Auto-verify is on, but this run's splits history wasn't uploaded";
        case 'not_verified_on_src':
            return 'Imported from SRC, not verified there yet';
        case 'new_pb':
            return 'New PB from LiveSplit';
    }
}

export type WhyTone = 'red' | 'amber' | 'quiet';

/** Someone's words or a failed check read red; a missing piece reads amber. */
const REASON_TONE: Record<QueueReason, WhyTone> = {
    reported: 'red',
    appealed: 'red',
    manual_submission: 'quiet',
    auto_verify_failed: 'red',
    removed_from_src: 'amber',
    missing_video: 'amber',
    auto_verify_unavailable: 'quiet',
    not_verified_on_src: 'quiet',
    new_pb: 'quiet',
};

export const reasonTone = (reason: QueueReason): WhyTone => REASON_TONE[reason];

/** "12 verified · 1 rejected" on this game, or null for a guest. */
export const trackRecordBadge = (
    r: WorklistTrackRecord | null,
): string | null =>
    r
        ? `${r.verifiedRunsThisGame} verified · ${r.rejectedRunsThisGame} rejected`
        : null;

export { videoSource };

/** One queue row, whether it is a run or a manual submission. */
export type QueueRowView = {
    key: string;
    target: ReviewTarget;
    /** The run, for the list's own verify; null for a manual submission. */
    runId: number | null;
    pending: boolean;
    /** The caller's own: nothing in the list verifies it. */
    isOwn: boolean;
    rank: number | null;
    runnerName: string;
    picture: string | null;
    isGuest: boolean;
    userId: number | null;
    participants?: RunParticipant[];
    board: string;
    timeMs: number;
    /** 'first' = no earlier PB; null = nothing to compare (a manual submission). */
    delta:
        | { text: string; title: string | null; faster: boolean }
        | 'first'
        | null;
    reason: QueueReason;
    why: { text: string; tone: WhyTone; title: string };
    /** The other reasons and the other failed checks, as small chips. */
    chips: string[];
    newRunner: boolean;
    trackRecord: string | null;
    /** Host label, or null for no video. */
    video: string | null;
    waitingSince: string;
};

export function entryRow(
    e: WorklistEntry,
    variables: VariableRow[],
): QueueRowView {
    const text = reasonLine(e);
    const extraChecks =
        e.reason === 'auto_verify_failed'
            ? checkSentences(e.failedChecks).slice(1)
            : [];
    const shared = {
        key: e.key,
        isOwn: e.isOwn,
        runnerName: e.runnerName,
        picture: e.runnerPicture ?? null,
        isGuest: e.isGuest,
        userId: e.userId,
        participants: e.participants,
        board: boardLabel(e, variables),
        reason: e.reason,
        chips: [...e.otherReasons.map((r) => REASON_LABEL[r]), ...extraChecks],
        newRunner: e.newRunner,
        trackRecord: trackRecordBadge(e.trackRecord),
    };
    if (e.kind === 'manual') {
        return {
            ...shared,
            target: { kind: 'manual', id: e.manualTimeId },
            runId: null,
            pending: true,
            rank: null,
            timeMs: e.timeMs,
            delta: null,
            why: {
                text,
                tone: reasonTone(e.reason),
                title: e.note ? `${text}: "${e.note}"` : text,
            },
            video: videoSource(e.evidenceUrl),
            waitingSince: e.createdAt,
        };
    }
    return {
        ...shared,
        target: { kind: 'run', id: e.runId },
        runId: e.runId,
        pending: e.verificationStatus === 'pending',
        rank: e.wouldBeRank,
        timeMs: boardTimeMs(e),
        delta:
            e.deltaMs === null
                ? 'first'
                : {
                      text: shortDelta(e.deltaMs),
                      title: deltaLabel(e),
                      faster: e.deltaMs < 0,
                  },
        why: { text, tone: reasonTone(e.reason), title: text },
        video: videoSource(e.vodUrl),
        waitingSince: e.waitingSince,
    };
}

/** The list can verify this row: a pending run that isn't the caller's own. */
export const canVerifyRow = (row: QueueRowView): boolean =>
    row.runId != null && row.pending && !row.isOwn;

// ---- Keyboard order ---------------------------------------------------
// Every row the keyboard can land on has one key, also written to the row as
// data-queue-key so the pane can scroll it into view. It is the entry's own
// `key` from the backend.

export const targetKey = (t: ReviewTarget): string => `${t.kind}:${t.id}`;
