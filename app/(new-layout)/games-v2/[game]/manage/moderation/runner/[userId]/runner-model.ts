// Pure assembly of the runner dossier — no React, no fetching — trivially
// reasoned about and unit-tested. The page fetches four raw feeds (eligible
// runs, manual times, exclusion rules, the game's mod-action log) plus the
// game's category list, and this module folds them into the shapes the view
// renders: one "combo" per (category, subcategoryKey) the runner appears on,
// ordered the way the public category band orders categories, plus the
// runner's ban state, a per-runner slice of the audit log, and header stats.

import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import type { ResolvedCategory } from '../../../../../../../../types/leaderboards.types';
import type {
    GameExclusionRuleRow,
    ManualTimeRow,
    ModActionRow,
    ModTiming,
    UserEligibleRunRow,
} from '../../../../../../../../types/moderation.types';

export interface RunnerCombo {
    /** `${categoryId}::${subcategoryKey}` — stable selection key. */
    key: string;
    categoryId: number;
    categoryDisplay: string;
    /** Category slug when the category still exists; null → no public link. */
    categorySlug: string | null;
    subcategoryKey: string;
    primaryTiming: ModTiming;
    /** Eligible runs, best-first on the combo's primary timing (nulls last). */
    runs: UserEligibleRunRow[];
    manualTimes: ManualTimeRow[];
    /** The run currently on the board for the primary timing, if any. */
    board: UserEligibleRunRow | null;
    /** Primary-timing ms shown on the band chip; board > best run > manual. */
    bestTime: number | null;
    rank: number | null;
    totalRunners: number | null;
}

export interface RunnerBanState {
    /** Whole-game exclusion rule targeting this runner, if any. */
    gameRule: GameExclusionRuleRow | null;
    /** Per-category rules targeting this runner. */
    categoryRules: GameExclusionRuleRow[];
}

export interface RunnerSummary {
    comboCount: number;
    runCount: number;
    manualCount: number;
    /** The runner's single best placement across combos. */
    bestRank: { rank: number; comboKey: string } | null;
    /** ISO timestamp of the newest eligible run, if any. */
    lastActive: string | null;
}

function primaryValue(
    row: UserEligibleRunRow,
    timing: ModTiming,
): number | null {
    return timing === 'gametime' ? row.gameTime : row.time;
}

/** Best-first on the primary timing; null times last; ties by date, oldest first. */
function compareRuns(
    a: UserEligibleRunRow,
    b: UserEligibleRunRow,
    timing: ModTiming,
): number {
    const av = primaryValue(a, timing);
    const bv = primaryValue(b, timing);
    if (av == null && bv == null) return a.endedAt.localeCompare(b.endedAt);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av !== bv) return av - bv;
    return a.endedAt.localeCompare(b.endedAt);
}

/**
 * Folds the runner's eligible runs and manual times into per-board combos,
 * ordered by the game's category order (the same source order the public
 * category band renders, so "top left" here matches what runners see),
 * then by run count within a category. A combo can exist on manual times
 * alone — a mod-asserted time for a board the runner never uploaded to.
 */
export function buildCombos(
    rows: UserEligibleRunRow[],
    manualTimes: ManualTimeRow[],
    categories: ResolvedCategory[],
): RunnerCombo[] {
    const catById = new Map(categories.map((c) => [c.id, c]));
    const orderByCat = new Map(categories.map((c, i) => [c.id, i]));

    const map = new Map<string, RunnerCombo>();
    const ensure = (
        categoryId: number,
        subcategoryKey: string,
        categoryNameFallback: string,
    ): RunnerCombo => {
        const key = `${categoryId}::${subcategoryKey}`;
        let combo = map.get(key);
        if (!combo) {
            const cat = catById.get(categoryId);
            combo = {
                key,
                categoryId,
                categoryDisplay:
                    cat?.display || categoryNameFallback || `#${categoryId}`,
                categorySlug: cat?.name ?? null,
                subcategoryKey,
                primaryTiming:
                    cat?.primaryTiming === 'gt' ? 'gametime' : 'realtime',
                runs: [],
                manualTimes: [],
                board: null,
                bestTime: null,
                rank: null,
                totalRunners: null,
            };
            map.set(key, combo);
        }
        return combo;
    };

    for (const r of rows) {
        // Rows carry their own primaryTiming; prefer it over the category's
        // (they should agree, but the row is closer to the board).
        const combo = ensure(r.categoryId, r.subcategoryKey, r.categoryName);
        combo.primaryTiming = r.primaryTiming;
        combo.runs.push(r);
    }
    for (const m of manualTimes) {
        ensure(m.categoryId, m.subcategoryKey, '').manualTimes.push(m);
    }

    for (const combo of map.values()) {
        combo.runs.sort((a, b) => compareRuns(a, b, combo.primaryTiming));
        combo.manualTimes.sort((a, b) => a.timeMs - b.timeMs);
        combo.board =
            combo.runs.find((r) =>
                combo.primaryTiming === 'gametime'
                    ? r.isLeaderboardEntryGt
                    : r.isLeaderboardEntry,
            ) ?? null;
        combo.rank = combo.board?.rank ?? null;
        combo.totalRunners = combo.board?.totalRunners ?? null;

        const bestRun = combo.runs.length > 0 ? combo.runs[0] : null;
        const bestManual =
            combo.manualTimes.find(
                (m) =>
                    m.timing === combo.primaryTiming &&
                    m.verificationStatus !== 'rejected',
            ) ?? null;
        combo.bestTime =
            (combo.board && primaryValue(combo.board, combo.primaryTiming)) ??
            (bestRun && primaryValue(bestRun, combo.primaryTiming)) ??
            bestManual?.timeMs ??
            null;
    }

    return Array.from(map.values()).sort((a, b) => {
        const ao = orderByCat.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
        const bo = orderByCat.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        if (a.categoryId !== b.categoryId) return a.categoryId - b.categoryId;
        if (a.runs.length !== b.runs.length) {
            return b.runs.length - a.runs.length;
        }
        return a.subcategoryKey.localeCompare(b.subcategoryKey);
    });
}

/** Rules targeting this runner, split by scope. */
export function buildBanState(
    rules: GameExclusionRuleRow[],
    userId: number,
): RunnerBanState {
    const mine = rules.filter((r) => r.targetId === userId);
    return {
        gameRule: mine.find((r) => r.categoryId == null) ?? null,
        categoryRules: mine.filter((r) => r.categoryId != null),
    };
}

/**
 * The rule that keeps this combo's runner off the board — a game-wide rule
 * covers every combo; otherwise a rule pinned to the combo's category.
 */
export function ruleForCombo(
    ban: RunnerBanState,
    categoryId: number,
): GameExclusionRuleRow | null {
    return (
        ban.gameRule ??
        ban.categoryRules.find((r) => r.categoryId === categoryId) ??
        null
    );
}

/**
 * The per-runner slice of the game's mod-action log. The backend feed is
 * game-scoped with no runner filter, so this keeps rows that reference one
 * of the runner's runs or manual times by target id, or carry the runner's
 * userId in their rule-snapshot `data` (exclude_via_rule /
 * delete_exclusion_rule).
 */
export function filterRunnerActions(
    actions: ModActionRow[],
    runIds: ReadonlySet<number>,
    manualTimeIds: ReadonlySet<number>,
    userId: number,
): ModActionRow[] {
    return actions.filter((row) => {
        if (row.target != null) {
            const target = Number.parseInt(row.target, 10);
            if (Number.isFinite(target)) {
                if (row.entity === 'finished_run' && runIds.has(target)) {
                    return true;
                }
                if (row.entity === 'manual_time' && manualTimeIds.has(target)) {
                    return true;
                }
            }
        }
        const data = row.data;
        if (data && typeof data === 'object' && 'targetId' in data) {
            return Number((data as { targetId: unknown }).targetId) === userId;
        }
        return false;
    });
}

export function buildSummary(combos: RunnerCombo[]): RunnerSummary {
    let runCount = 0;
    let manualCount = 0;
    let bestRank: RunnerSummary['bestRank'] = null;
    let lastActive: string | null = null;
    for (const c of combos) {
        runCount += c.runs.length;
        manualCount += c.manualTimes.length;
        if (c.rank != null && (bestRank == null || c.rank < bestRank.rank)) {
            bestRank = { rank: c.rank, comboKey: c.key };
        }
        for (const r of c.runs) {
            if (lastActive == null || r.endedAt > lastActive) {
                lastActive = r.endedAt;
            }
        }
    }
    return {
        comboCount: combos.length,
        runCount,
        manualCount,
        bestRank,
        lastActive,
    };
}

/**
 * Public board URL for a combo — the exact view a visitor sees, category
 * plus each subcategory variable as its own query param. Null when the
 * category no longer resolves (archived/deleted): nothing to link to.
 */
export function publicBoardHref(
    gameSlug: string,
    combo: Pick<RunnerCombo, 'categorySlug' | 'subcategoryKey'>,
): string | null {
    if (!combo.categorySlug) return null;
    const params = new URLSearchParams({ category: combo.categorySlug });
    for (const { name, value } of parseSubcategoryKey(combo.subcategoryKey)) {
        params.set(name, value);
    }
    return `/games-v2/${gameSlug}?${params.toString()}`;
}
