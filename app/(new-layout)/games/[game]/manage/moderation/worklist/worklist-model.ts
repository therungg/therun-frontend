import type {
    RunParticipant,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    WorklistItem,
    WorklistReason,
    WorklistSelfClaim,
    WorklistTier,
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

/** Plain words for every reason the backend emits. Unknown reasons fall back to the raw key. */
export const REASON_LABEL: Record<string, string> = {
    pending_verification: 'Pending',
    reported: 'Reported',
    appeal: 'Runner appealed a rejection',
    consistency: "Splits don't add up to the time",
    'live-match': "Doesn't match the live run",
    ambiguous_live_match: 'More than one live run could match',
    no_live_match: 'No live run found',
    'gold-beat': 'Beats their golds by a lot',
    'pb-jump': 'Big jump from their PB',
    'prior-runs': 'Few verified runs before this',
    'top-n': 'Would place near the top',
    missing_video: 'No video, and the board needs one',
};

export const reasonLabel = (r: WorklistReason): string =>
    REASON_LABEL[r.reason] ?? r.reason;

/** The same tiers as a count reads them: "3 reports, appeals and self-claims". */
export const TIER_COUNT_LABEL: Record<WorklistTier, string> = {
    1: 'reports, appeals and self-claims',
    2: 'failed checks or unknown runners',
    3: 'routine',
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

/** Reasons that mean a check failed or someone raised a hand. */
const RED_REASONS = new Set([
    'reported',
    'appeal',
    'consistency',
    'live-match',
    'ambiguous_live_match',
    'no_live_match',
    'gold-beat',
    'pb-jump',
]);
/** Reasons worth a second look that are not a failure. */
const AMBER_REASONS = new Set(['top-n', 'missing_video', 'prior-runs']);

export type WhyTone = 'red' | 'amber' | 'quiet';

/**
 * Why the run is in the queue, in one line: its first reason (an appeal
 * with the runner's words), or the runner's track record for a plain
 * pending run.
 */
export const whyLine = (
    item: WorklistItem,
): { text: string; tone: WhyTone } => {
    const r = item.reasons.find((x) => x.reason !== 'pending_verification');
    if (!r)
        return { text: trackRecordLine(item.trackRecord) ?? '', tone: 'quiet' };
    const tone: WhyTone = RED_REASONS.has(r.reason)
        ? 'red'
        : AMBER_REASONS.has(r.reason)
          ? 'amber'
          : 'quiet';
    if (r.reason === 'appeal') {
        const words =
            typeof r.details.reason === 'string' ? r.details.reason.trim() : '';
        return { text: words ? `Appeal: “${words}”` : 'Appeal', tone };
    }
    if (r.reason === 'reported') return { text: 'Reported', tone };
    if (r.reason === 'top-n' && item.wouldBeRank === 1)
        return { text: 'New record', tone };
    return { text: reasonLabel(r), tone };
};

/** Where the video lives: "YouTube", "Twitch", another host, or "None". */
export const videoSource = (url: string | null): string => {
    if (!url) return 'None';
    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        return 'Video';
    }
    if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be')
        return 'YouTube';
    if (/(^|\.)twitch\.tv$/.test(host)) return 'Twitch';
    return host.replace(/^www\./, '');
};

/** One queue row, whether it is a run or a runner's typed-in time. */
export type QueueRowView = {
    key: string;
    target: ReviewTarget;
    /** The run, for the list's own Verify; null for a typed-in time. */
    runId: number | null;
    pending: boolean;
    rank: number | null;
    runnerName: string;
    isGuest: boolean;
    userId: number | null;
    participants?: RunParticipant[];
    board: string;
    timeMs: number;
    /** 'first' = no earlier PB; null = nothing to compare (a typed-in time). */
    delta:
        | { text: string; title: string | null; faster: boolean }
        | 'first'
        | null;
    why: { text: string; tone: WhyTone };
    video: string;
    waitingSince: string;
};

export const itemRow = (
    item: WorklistItem,
    variables: VariableRow[],
): QueueRowView => ({
    key: runQueueKey(item),
    target: { kind: 'run', id: item.runId },
    runId: item.runId,
    pending: item.verificationStatus === 'pending',
    rank: item.wouldBeRank,
    runnerName: item.runnerName,
    isGuest: item.isGuest,
    userId: item.userId,
    participants: item.participants,
    board: boardLabel(item, variables),
    timeMs: boardTimeMs(item),
    delta:
        item.deltaMs === null
            ? 'first'
            : {
                  text: shortDelta(item.deltaMs),
                  title: deltaLabel(item),
                  faster: item.deltaMs < 0,
              },
    why: whyLine(item),
    video: videoSource(item.vodUrl),
    waitingSince: item.waitingSince,
});

export const claimRow = (
    claim: WorklistSelfClaim,
    variables: VariableRow[],
): QueueRowView => ({
    key: claimQueueKey(claim),
    target: { kind: 'manual', id: claim.manualTimeId },
    runId: null,
    pending: true,
    rank: null,
    runnerName: claim.runnerName,
    isGuest: claim.isGuest,
    userId: claim.userId,
    participants: claim.participants,
    board: boardLabel(claim, variables),
    timeMs: claim.timeMs,
    delta: null,
    why: {
        text: claim.note ? `Typed-in time: “${claim.note}”` : 'Typed-in time',
        tone: 'quiet',
    },
    video: videoSource(claim.evidenceUrl),
    waitingSince: claim.createdAt,
});

// ---- Keyboard order ---------------------------------------------------
// Every row the keyboard can land on has one key, also written to the row as
// data-queue-key so the pane can scroll it into view.

export const runQueueKey = (item: Pick<WorklistItem, 'runId'>): string =>
    `run:${item.runId}`;
export const claimQueueKey = (claim: { manualTimeId: number }): string =>
    `claim:${claim.manualTimeId}`;
