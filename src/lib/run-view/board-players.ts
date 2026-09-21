import { getLeaderboard } from '~src/lib/leaderboards-v1';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';
import type {
    PlayersRuleScope,
    ViewerStanding,
} from '~src/lib/run-view/roster';
import type { PlayersRange } from '../../../types/leaderboards.types';

/**
 * What a run's — or a manual time's — board credits, read from the BOARD.
 *
 * `coopBoard`/`players` also ride the detail payload, but that payload is
 * cached per entry (`run:{id}` / `manual-time:{id}`), so after a moderator
 * configures a board's players policy every already-cached page on that board
 * keeps reporting the old answer until its TTL expires — and a policy write
 * has no list of entries to drop. The board payload carries the same two
 * facts under the board's own cache tags (`lb:{gameSlug}:{categorySlug}`),
 * which a policy write DOES drop, so reading them from there is current the
 * moment the policy changes.
 *
 * One helper for both pages: the run page and the manual-time page ask the
 * same question about the same boards, and a second copy of the probe is a
 * second set of conditions to drift apart.
 */

export interface BoardPlayersPolicy {
    players: PlayersRange | null;
    coopBoard: boolean;
    /** Where the rule this answer resolved to lives, for the sentences that
     *  name it. */
    scope: PlayersRuleScope;
}

/**
 * How a resolved answer should be described to a runner.
 *
 * `playersScope: 'slice'` means the board answered about one board rather
 * than about the category as a whole — but on a category with no
 * subcategories that one board IS the category, and calling it a subcategory
 * would send somebody looking for a screen that does not exist. So a
 * subcategory is claimed only when the entry actually sits on one.
 */
export function playersRuleScope(
    playersScope: 'slice' | 'category' | null | undefined,
    subcategoryValues: Record<string, string>,
): PlayersRuleScope {
    const onASubcategory = Object.keys(subcategoryValues).length > 0;
    return playersScope === 'slice' && onASubcategory
        ? 'subcategory'
        : 'category';
}

/**
 * One board's answer about what it credits, as the board gave it.
 *
 * Deliberately NOT collapsed to "not co-op": a read that failed, a backend
 * that does not send the fields yet, and a board that genuinely credits one
 * runner are three different facts, and a caller that cannot tell them apart
 * cannot word the difference either.
 */
export interface BoardPlayersProbe {
    /** The board answered. False means the request failed or was refused —
     * nothing below is known, and nothing may be concluded from it. */
    ok: boolean;
    /** Absent when the backend deploy does not send the field (older deploy),
     * false when the board credits one runner. */
    coopBoard?: boolean;
    players?: PlayersRange | null;
    /** `'slice'` — the answer is this board's own. `'category'` — it is the
     * category-wide resolution and says nothing about this slice (guide §5).
     * Absent alongside the other two on an older deploy. */
    playersScope?: 'slice' | 'category' | null;
}

/**
 * Ask a board what it credits — the ONE read behind both doors that need it:
 * the run and manual-time pages (through `resolveBoardPlayers` below) and the
 * submit dialog (through its server action).
 *
 * Read off the ordinary cached board fetcher rather than a request of its
 * own: the backend resolves `players`/`coopBoard`/`playersScope` per board
 * request, outside its own entry cache, and a policy write drops the coarse
 * per-category tag this read is filed under — so both doors are current the
 * moment a moderator changes what the board credits. One row is asked for
 * because nothing here reads the entries.
 */
export async function probeBoardPlayers(args: {
    gameSlug: string;
    categorySlug: string;
    timing: 'rt' | 'gt';
    subcategoryValues: Record<string, string>;
}): Promise<BoardPlayersProbe> {
    try {
        const res = await getLeaderboard({
            gameSlug: args.gameSlug,
            categorySlug: args.categorySlug,
            timing: args.timing,
            subcategoryValues: args.subcategoryValues,
            page: 1,
            pageSize: 1,
        });
        if (!res.ok) return { ok: false };
        return {
            ok: true,
            coopBoard: res.result.coopBoard,
            players: res.result.players ?? null,
            playersScope: res.result.playersScope ?? null,
        };
    } catch {
        return { ok: false };
    }
}

/** The detail payload's own copies — the fallback whenever the probe is not
 * made, fails, or answers about the category rather than this slice. */
interface DetailPolicy {
    players?: PlayersRange | null;
    coopBoard?: boolean;
}

interface Args {
    gameSlug: string;
    /** The entry's own category, or null when it cannot be resolved — the
     * probe needs its slug and its default clock. */
    category: { name: string; primaryTiming?: string | null } | null;
    /** The entry's STORED subcategory key (defaults materialized). */
    subcategoryKey: string | null;
    detail: DetailPolicy;
    /** Who is looking, and whether the entry is already held for its roster.
     * The probe is only worth a request when the answer can change what
     * renders: for a signed-out passer-by with no stake in the roster, the
     * detail payload's copies are good enough for a line of text. A held
     * entry always probes — the notice is the point, and it has to be
     * current for anyone reading it. */
    viewer: ViewerStanding & { isMod: boolean };
}

/** The fallback answer: the detail payload, as-is. */
function fromDetail(detail: DetailPolicy): BoardPlayersPolicy {
    return {
        players: detail.players ?? null,
        coopBoard: detail.coopBoard === true,
        // The detail payload says nothing about where the rule lives, so the
        // sentence falls back to the category.
        scope: 'category',
    };
}

export async function resolveBoardPlayers({
    gameSlug,
    category,
    subcategoryKey,
    detail,
    viewer,
}: Args): Promise<BoardPlayersPolicy> {
    const shouldProbe =
        category != null &&
        (viewer.rosterHeld ||
            viewer.isMod ||
            viewer.isFiler ||
            viewer.onRoster);
    if (!shouldProbe || !category) return fromDetail(detail);

    // The probe is of the entry's own slice — its own cache entry, keyed by
    // the STORED (defaults-materialized) subcategory key rather than by a
    // board URL's defaults-omitted selection, populated on first use and then
    // shared by every entry on that slice. The clock is the category's own
    // default, not a hardcoded 'rt': an IGT-only category has no 'rt' board
    // to probe.
    const subcategoryValues = Object.fromEntries(
        parseSubcategoryKey(subcategoryKey ?? '').map((p) => [p.name, p.value]),
    );
    const probe = await probeBoardPlayers({
        gameSlug,
        categorySlug: category.name,
        timing: category.primaryTiming === 'gt' ? 'gt' : 'rt',
        subcategoryValues,
    });

    // Trusted only when it actually describes THIS slice
    // (`playersScope: 'slice'`) — an entry whose `subcategoryKey` is empty on
    // a category that HAS subcategory variables gets the combined view back
    // (`'category'`), whose numbers are the category-wide resolution and not
    // this board's (guide §5). Anything else falls back to the detail copies:
    // an error, an invalid-combination answer, or an older backend that left
    // the fields off entirely.
    if (!probe.ok || probe.playersScope !== 'slice') return fromDetail(detail);
    return {
        players: probe.players ?? detail.players ?? null,
        coopBoard: probe.coopBoard ?? detail.coopBoard === true,
        scope: playersRuleScope(probe.playersScope, subcategoryValues),
    };
}
