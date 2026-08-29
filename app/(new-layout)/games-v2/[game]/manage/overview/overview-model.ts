// Pure derivations for the console front door (BoardOverview). No React, no
// fetching — everything the dashboard shows is computed here from data the
// /manage page already loads, so the numbers are trivially testable and can't
// drift from the panels that render them.
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import { splitLevelBoards } from '~src/lib/levels/display';
import type { AttentionItem } from '../moderation/attention/attention-model';

export interface AttentionBreakdown {
    total: number;
    flags: number;
    reports: number;
    /** Self-claims + appeals — the runner-initiated bucket. */
    claims: number;
}

export interface OverviewStats {
    /** Featured + active full-game categories: what the board's category band
     * shows. Excludes level boards (counted under `levels`). */
    featured: number;
    /** Full-game categories with runs that aren't on the board (add-dialog pool). */
    offBoardWithRuns: number;
    /** Archived (inactive) full-game categories. */
    archived: number;
    /** Individual levels — category groups with kind 'level'. */
    levels: number;
    /** Category groups (kind 'normal') — the band's grouping structure. */
    categoryGroups: number;
    /** Sum of finished runs across every board, levels included. */
    finishedRuns: number;
    attention: AttentionBreakdown;
    moderatorCount: number;
    pendingApplications: number;
}

export function buildOverviewStats(input: {
    rows: ManageCategoryRow[];
    groups: ManageGroup[];
    attentionItems: AttentionItem[];
    moderatorCount: number;
    pendingApplications: number;
}): OverviewStats {
    const {
        rows,
        groups,
        attentionItems,
        moderatorCount,
        pendingApplications,
    } = input;

    // A level board is a category sitting in a kind:'level' group; everything
    // else is a full-game category. The overview counts and lists them apart.
    const { fullGame } = splitLevelBoards(rows, groups);

    let featured = 0;
    let offBoardWithRuns = 0;
    let archived = 0;
    for (const r of fullGame) {
        if (!r.active) {
            archived += 1;
        } else if (r.isMain) {
            featured += 1;
        } else if (r.totalFinishedAttemptCount > 0) {
            offBoardWithRuns += 1;
        }
    }

    // Finished runs is a whole-board headline, so it spans every row (level
    // boards included), not just the full-game slice.
    let finishedRuns = 0;
    for (const r of rows) finishedRuns += r.totalFinishedAttemptCount;

    let levels = 0;
    let categoryGroups = 0;
    for (const g of groups) {
        if (g.kind === 'level') levels += 1;
        else categoryGroups += 1;
    }

    // A merged row can carry several sources (flagged AND reported), so these
    // are "items involving X" tallies and may overlap — total stays the count
    // of distinct items.
    let flags = 0;
    let reports = 0;
    let claims = 0;
    for (const it of attentionItems) {
        for (const s of it.sources) {
            if (s === 'flag') flags += 1;
            else if (s === 'report') reports += 1;
            else claims += 1; // self_claim + appeal
        }
    }

    return {
        featured,
        offBoardWithRuns,
        archived,
        levels,
        categoryGroups,
        finishedRuns,
        attention: {
            total: attentionItems.length,
            flags,
            reports,
            claims,
        },
        moderatorCount,
        pendingApplications,
    };
}

/** Featured, active categories ranked by finished runs — the overview table. */
export function topFeaturedRows(
    rows: ManageCategoryRow[],
    limit: number,
): { shown: ManageCategoryRow[]; remaining: number } {
    const featured = rows
        .filter((r) => r.isMain && r.active)
        .sort(
            (a, b) => b.totalFinishedAttemptCount - a.totalFinishedAttemptCount,
        );
    return {
        shown: featured.slice(0, limit),
        remaining: Math.max(0, featured.length - limit),
    };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Compact relative time ("2h ago", "6d ago") for import timestamps. Returns
 * null for a missing/invalid date so callers can render an em dash. `now` is
 * injectable for deterministic tests.
 */
export function timeAgo(
    iso: string | null | undefined,
    now: number = Date.now(),
): string | null {
    if (!iso) return null;
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return null;
    const diff = now - then;
    if (diff < MINUTE) return 'just now';
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
    if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
    if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
    if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
    if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo ago`;
    return `${Math.floor(diff / YEAR)}y ago`;
}
