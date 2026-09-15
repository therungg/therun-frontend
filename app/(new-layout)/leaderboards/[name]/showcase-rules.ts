import { isEmbeddableVod } from '~src/lib/vod-url';
import type {
    GameOrder,
    LeaderboardsLayout,
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
    PinRef,
    ResolvedLeaderboardsLayout,
} from '../../../../types/leaderboards-profile.types';

export const PIN_LIMIT = 3;
export const SHELF_SCROLL_AT = 12;

export const DEFAULT_LAYOUT: ResolvedLeaderboardsLayout = {
    mainGameId: null,
    pins: [],
    videoPin: null,
    gameOrder: 'runners',
    manualGameIds: [],
    showActivity: true,
    isDefault: true,
};

export type Pinned = {
    entry: LeaderboardsProfileEntry;
    game: LeaderboardsProfileGame;
};

export const entryRef = (e: LeaderboardsProfileEntry): PinRef =>
    e.kind === 'run'
        ? { kind: 'run', id: e.runId ?? 0 }
        : { kind: 'manual', id: e.manualTimeId ?? 0 };

export const pinKey = (p: PinRef) => `${p.kind}-${p.id}`;

export const samePin = (a: PinRef | null, b: PinRef | null) =>
    a !== null && b !== null && a.kind === b.kind && a.id === b.id;

export function findEntry(
    games: LeaderboardsProfileGame[],
    ref: PinRef,
): Pinned | null {
    for (const game of games) {
        const entry = game.entries.find((e) => samePin(entryRef(e), ref));
        if (entry) return { entry, game };
    }
    return null;
}

const rankOf = (e: LeaderboardsProfileEntry) =>
    e.rank ?? Number.POSITIVE_INFINITY;
const dateOf = (e: LeaderboardsProfileEntry) =>
    e.runDate ? Date.parse(e.runDate) || 0 : 0;

/** Rank first (unranked last), then full game before level, then newest. */
export const outranks = (
    a: LeaderboardsProfileEntry,
    b: LeaderboardsProfileEntry,
) => {
    if (rankOf(a) !== rankOf(b)) return rankOf(a) < rankOf(b);
    const la = a.level === null ? 0 : 1;
    const lb = b.level === null ? 0 : 1;
    if (la !== lb) return la < lb;
    return dateOf(a) > dateOf(b);
};

/** How many runners are on the board this entry sits on. */
export const boardSize = (e: LeaderboardsProfileEntry) => e.totalRunners ?? 0;

/** The bigger board first, then the better rank, then the newer run. */
export const onBiggerBoard = (
    a: LeaderboardsProfileEntry,
    b: LeaderboardsProfileEntry,
) => boardSize(b) - boardSize(a) || (outranks(a, b) ? -1 : 1);

/**
 * What a run is worth for the showcase: the board's field divided by the
 * rank. A bigger board pays more, but placing counts just as hard, so a
 * back-of-the-pack run on a huge board is worth about a point: #4 of 200 is
 * 50, #1 of 10 is 10, #2 of 10 is 5, #997 of 1,044 is 1. (The standings'
 * square-root curve is gentler on rank than a showcase should be.)
 */
export const entryPoints = (e: LeaderboardsProfileEntry) =>
    e.rank !== null && e.rank > 0 && boardSize(e) > 0
        ? boardSize(e) / e.rank
        : 0;

/**
 * The default showcase when the runner pinned nothing: their three runs worth
 * the most points, whatever game they are in. Each category and
 * subcategory is its own board.
 */
export function autoPins(games: LeaderboardsProfileGame[]): Pinned[] {
    const all: Pinned[] = [];
    for (const game of games) {
        for (const entry of game.entries) {
            if (entry.archived || entry.status === 'rejected') continue;
            all.push({ entry, game });
        }
    }
    all.sort(
        (a, b) =>
            entryPoints(b.entry) - entryPoints(a.entry) ||
            onBiggerBoard(a.entry, b.entry),
    );
    return all.slice(0, PIN_LIMIT);
}

/** Saved pins in saved order; auto pins only when none survive. */
export function resolvePins(
    games: LeaderboardsProfileGame[],
    pins: PinRef[],
): Pinned[] {
    const saved = pins
        .map((p) => findEntry(games, p))
        .filter((p): p is Pinned => p !== null)
        .slice(0, PIN_LIMIT);
    return saved.length > 0 ? saved : autoPins(games);
}

const embeddable = (p: Pinned): p is Pinned & { entry: { vodUrl: string } } =>
    !!p.entry.vodUrl && isEmbeddableVod(p.entry.vodUrl);

/** The saved video pin if it still plays, else the best pinned run that does. */
export function pickVideoPin(
    pins: Pinned[],
    saved: PinRef | null,
): Pinned | null {
    const chosen = pins.find((p) => samePin(entryRef(p.entry), saved));
    if (chosen && embeddable(chosen)) return chosen;
    return pins.find(embeddable) ?? null;
}

/** Saved main game, else best rank with more attempts breaking a tie. */
export function mainGameOf(
    games: LeaderboardsProfileGame[],
    mainGameId: number | null,
): LeaderboardsProfileGame | null {
    const saved = games.find((g) => g.gameId === mainGameId);
    if (saved) return saved;
    let best: LeaderboardsProfileGame | null = null;
    for (const g of games) {
        if (g.bestRank === null) continue;
        if (
            !best ||
            g.bestRank < (best.bestRank ?? Number.POSITIVE_INFINITY) ||
            (g.bestRank === best.bestRank &&
                (g.attempts ?? 0) > (best.attempts ?? 0))
        ) {
            best = g;
        }
    }
    return best;
}

export type SortMode = 'runner' | GameOrder | 'attempts';

export const SORT_LABELS: Record<SortMode, string> = {
    runner: "Runner's order",
    runners: 'Most runners',
    manual: "Runner's order",
    rank: 'Best rank',
    recent: 'Most recent',
    attempts: 'Most attempts',
    name: 'Name',
};

const byName = (a: LeaderboardsProfileGame, b: LeaderboardsProfileGame) =>
    a.game.localeCompare(b.game, 'en');

/**
 * Game blocks in the order the page shows them. `sort` is the viewer's pick;
 * 'runner' means the layout's own mode. A manual order lists the saved ids
 * first and appends anything new by rank.
 */
export function orderGames(
    games: LeaderboardsProfileGame[],
    layout: Pick<LeaderboardsLayout, 'gameOrder' | 'manualGameIds'>,
    sort: SortMode = 'runner',
): LeaderboardsProfileGame[] {
    const mode: SortMode = sort === 'runner' ? layout.gameOrder : sort;
    const list = [...games];
    switch (mode) {
        case 'manual': {
            const pos = new Map(layout.manualGameIds.map((id, i) => [id, i]));
            const saved = list
                .filter((g) => pos.has(g.gameId))
                .sort(
                    (a, b) =>
                        (pos.get(a.gameId) ?? 0) - (pos.get(b.gameId) ?? 0),
                );
            const rest = orderGames(
                list.filter((g) => !pos.has(g.gameId)),
                layout,
                'rank',
            );
            return [...saved, ...rest];
        }
        case 'recent':
            return list.sort(
                (a, b) =>
                    (b.lastRanAt ? Date.parse(b.lastRanAt) : 0) -
                        (a.lastRanAt ? Date.parse(a.lastRanAt) : 0) ||
                    byName(a, b),
            );
        case 'attempts':
            return list.sort(
                (a, b) => (b.attempts ?? 0) - (a.attempts ?? 0) || byName(a, b),
            );
        case 'name':
            return list.sort(byName);
        case 'runners': {
            const biggest = (g: LeaderboardsProfileGame) =>
                Math.max(0, ...g.entries.map(boardSize));
            return list.sort(
                (a, b) =>
                    biggest(b) - biggest(a) ||
                    (a.bestRank ?? Number.POSITIVE_INFINITY) -
                        (b.bestRank ?? Number.POSITIVE_INFINITY) ||
                    byName(a, b),
            );
        }
        default:
            return list.sort(
                (a, b) =>
                    (a.bestRank ?? Number.POSITIVE_INFINITY) -
                        (b.bestRank ?? Number.POSITIVE_INFINITY) ||
                    byName(a, b),
            );
    }
}

/** The sort options a viewer gets for this layout, first = default. */
export function sortOptions(
    layout: Pick<LeaderboardsLayout, 'gameOrder'>,
): SortMode[] {
    const auto: SortMode[] = ['runners', 'rank', 'recent', 'attempts', 'name'];
    if (layout.gameOrder === 'manual') return ['runner', ...auto];
    return [layout.gameOrder, ...auto.filter((m) => m !== layout.gameOrder)];
}
