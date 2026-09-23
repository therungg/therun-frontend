import { videoSource } from '~src/lib/vod-url';
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
    wall_clock: "The timer doesn't match the time that passed",
    live_not_comparable: 'Too few live splits to compare',
    could_not_check: 'Nothing to check it against',
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

/** Reasons that mean a check failed or someone raised a hand. */
const RED_REASONS = new Set([
    'reported',
    'appeal',
    'consistency',
    'wall_clock',
    'live-match',
    'live_not_comparable',
    'ambiguous_live_match',
    'no_live_match',
    'gold-beat',
    'pb-jump',
]);

/**
 * Which flag leads the row when a run carries several: someone's words
 * first, then failed checks, then the rest.
 */
const REASON_ORDER = [
    'reported',
    'appeal',
    'consistency',
    'wall_clock',
    'live-match',
    'gold-beat',
    'pb-jump',
    'ambiguous_live_match',
    'no_live_match',
    'live_not_comparable',
    'missing_video',
    'could_not_check',
    'top-n',
    'prior-runs',
];

const reasonRank = (reason: string): number => {
    const i = REASON_ORDER.indexOf(reason);
    return i === -1 ? REASON_ORDER.length : i;
};

export type WhyTone = 'red' | 'amber' | 'quiet';

const words = (v: unknown): string =>
    typeof v === 'string' ? v.trim().replace(/\.$/, '') : '';

/** The failed check's own sentence, from the flag or the verdict it came from. */
const checkMessage = (item: WorklistItem, r: WorklistReason): string => {
    const own = words(r.details.message);
    if (own) return own;
    const result = item.autoVerifyResult as {
        checks?: Record<
            string,
            { reason?: unknown; flagReason?: unknown } | null | undefined
        >;
    } | null;
    for (const [name, check] of Object.entries(result?.checks ?? {})) {
        if (!check) continue;
        if (name === r.reason || check.flagReason === r.reason) {
            const text = words(check.reason);
            if (text) return text;
        }
    }
    return '';
};

/** "Segment 41 beats…" read after "New runner · ". */
const lowerFirst = (s: string): string =>
    /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;

const flagText = (item: WorklistItem, r: WorklistReason): string => {
    switch (r.reason) {
        case 'reported': {
            const text =
                words(r.details.text) ||
                words(r.details.reason) ||
                words(r.details.message);
            return text ? `Reported: “${text}”` : 'Reported';
        }
        case 'appeal': {
            const text = words(r.details.reason);
            return text ? `Appeal: “${text}”` : 'Appeal';
        }
        case 'missing_video': {
            const n = Number(r.details.topN ?? r.details.n);
            return Number.isFinite(n) && n > 0
                ? `No video · top ${n} needs one`
                : 'No video';
        }
        case 'top-n':
            return item.wouldBeRank === 1
                ? 'New record'
                : `Would be #${item.wouldBeRank}`;
        default:
            return checkMessage(item, r) || reasonLabel(r);
    }
};

/** No verified run on this game yet, or no account at all. */
const isNewRunner = (item: WorklistItem): boolean =>
    item.isGuest ||
    !item.trackRecord ||
    item.trackRecord.verifiedRunsThisGame === 0;

/**
 * A routine row's reason is the runner's record here, kept short enough to
 * read in the column: "14 verified here, none rejected".
 */
export const shortTrackRecord = (r: WorklistTrackRecord | null): string => {
    if (!r) return 'Guest';
    const n = r.verifiedRunsThisGame;
    const m = r.rejectedRunsThisGame;
    if (m > 0) return `${n} verified, ${m} rejected here`;
    if (n === 0) return 'New here';
    if (n >= 5) return `${n} verified here, none rejected`;
    return `${n} verified here`;
};

/**
 * Why the run is in the queue, in one line. A flagged or checked run
 * (tiers 1 and 2) says what flagged it; a routine run says who ran it.
 */
export const whyLine = (
    item: WorklistItem,
): { text: string; tone: WhyTone } => {
    if (item.tier === 3)
        return { text: shortTrackRecord(item.trackRecord), tone: 'quiet' };

    const top = item.reasons
        .filter((x) => x.reason !== 'pending_verification')
        .sort((a, b) => reasonRank(a.reason) - reasonRank(b.reason))[0];
    const newRunner = isNewRunner(item);

    if (!top) {
        if (newRunner)
            return {
                text:
                    item.wouldBeRank === 1
                        ? 'New runner · new record'
                        : `New runner · would be #${item.wouldBeRank}`,
                tone: 'amber',
            };
        if (item.wouldBeRank === 1)
            return { text: 'New record', tone: 'amber' };
        return { text: shortTrackRecord(item.trackRecord), tone: 'quiet' };
    }

    const tone: WhyTone = RED_REASONS.has(top.reason) ? 'red' : 'amber';
    const text = flagText(item, top);
    // A report or an appeal is someone's own words; nothing goes before them.
    const spoken = top.reason === 'reported' || top.reason === 'appeal';
    return {
        text: newRunner && !spoken ? `New runner · ${lowerFirst(text)}` : text,
        tone,
    };
};

export { videoSource };

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
    /** Host label, or null for no video. */
    video: string | null;
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
