import { getLeaderboard } from '~src/lib/leaderboards-v1';
import { parseSubcategoryKey } from '~src/lib/run-view/parse-subcategory-key';

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
    players: { min: number; max: number | null } | null;
    coopBoard: boolean;
}

/** The detail payload's own copies — the fallback whenever the probe is not
 * made, fails, or answers about the category rather than this slice. */
interface DetailPolicy {
    players?: { min: number; max: number | null } | null;
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
    viewer: {
        isMod: boolean;
        isFiler: boolean;
        onRoster: boolean;
        rosterHeld: boolean;
    };
}

/** The fallback answer: the detail payload, as-is. */
function fromDetail(detail: DetailPolicy): BoardPlayersPolicy {
    return {
        players: detail.players ?? null,
        coopBoard: detail.coopBoard === true,
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

    // A `pageSize: 1` probe of the entry's own slice — its own cache entry,
    // keyed by the STORED (defaults-materialized) subcategory key rather than
    // by a board URL's defaults-omitted selection, populated on first use and
    // then shared by every entry on that slice. The clock is the category's
    // own default, not a hardcoded 'rt': an IGT-only category has no 'rt'
    // board to probe.
    const probe = await getLeaderboard({
        gameSlug,
        categorySlug: category.name,
        timing: category.primaryTiming === 'gt' ? 'gt' : 'rt',
        subcategoryValues: Object.fromEntries(
            parseSubcategoryKey(subcategoryKey ?? '').map((p) => [
                p.name,
                p.value,
            ]),
        ),
        page: 1,
        pageSize: 1,
    }).catch(() => null);

    // Trusted only when it actually describes THIS slice
    // (`playersScope: 'slice'`) — an entry whose `subcategoryKey` is empty on
    // a category that HAS subcategory variables gets the combined view back
    // (`'category'`), whose numbers are the category-wide resolution and not
    // this board's (guide §5). Anything else falls back to the detail copies:
    // an error, an invalid-combination answer, or an older backend that left
    // the fields off entirely.
    if (probe?.ok !== true || probe.result.playersScope !== 'slice') {
        return fromDetail(detail);
    }
    return {
        players: probe.result.players ?? detail.players ?? null,
        coopBoard: probe.result.coopBoard ?? detail.coopBoard === true,
    };
}
