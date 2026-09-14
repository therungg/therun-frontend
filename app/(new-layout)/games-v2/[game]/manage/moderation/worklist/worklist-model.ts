import type {
    LeaderboardEntry,
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import type {
    WorklistItem,
    WorklistReason,
    WorklistTier,
    WorklistTrackRecord,
} from '../../../../../../../types/worklist.types';
import { formatSubcategoryKey } from '../../../labels';
import type { TimingKey } from '../../../leaderboard/timing-columns';

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
    pending_verification: 'Waiting for a verdict',
    reported: 'Reported',
    appeal: 'Runner appealed a decline',
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

export const TIER_TITLE: Record<WorklistTier, string> = {
    1: 'Reports, appeals and self-claimed times',
    2: 'Failed checks and unknown runners near the top',
    3: 'Routine',
};

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
            ? [`${r.rejectedRunsThisGame} declined here`]
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

/**
 * What RunInspector needs to draw this run. The worklist is not a board, so
 * `rank` is the would-be rank and variables are unknown here — the inspector
 * loads the runner's own runs and history itself.
 */
export const toInspectorEntry = (item: WorklistItem): LeaderboardEntry => ({
    runId: item.runId,
    rank: item.wouldBeRank,
    runnerName: item.runnerName,
    userId: item.userId,
    isGuest: item.isGuest,
    time: boardTimeMs(item),
    realTime: item.time,
    gameTime: item.gameTime,
    runDate: item.endedAt,
    vodUrl: item.vodUrl,
    verificationStatus: item.verificationStatus,
    variables: null,
});

export type InspectorBoard = {
    category: ResolvedCategory;
    primaryTiming: TimingKey;
};

/** The board context for an item, or null if the category is not in the console's list. */
export const inspectorBoard = (
    item: WorklistItem,
    categories: ResolvedCategory[],
): InspectorBoard | null => {
    const category = categories.find((c) => c.id === item.categoryId);
    if (!category) return null;
    return { category, primaryTiming: category.primaryTiming };
};
