import { isEmbeddableVod } from '~src/lib/vod-url';
import type {
    GameOrder,
    LeaderboardsLayout,
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
    PinRef,
    ResolvedLeaderboardsLayout,
} from '../../../../types/leaderboards-profile.types';

export const PIN_LIMIT = 6;
export const COLLAPSE_AT = 9;
export const SHELF_SCROLL_AT = 12;

export const DEFAULT_LAYOUT: ResolvedLeaderboardsLayout = {
    mainGameId: null,
    pins: [],
    videoPin: null,
    gameOrder: 'rank',
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

/**
 * The default showcase when the runner pinned nothing: each game's best
 * visible entry, best ranks first, up to the pin limit.
 */
export function autoPins(games: LeaderboardsProfileGame[]): Pinned[] {
    const best: Pinned[] = [];
    for (const game of games) {
        let top: LeaderboardsProfileEntry | null = null;
        for (const entry of game.entries) {
            if (entry.archived) continue;
            if (!top || outranks(entry, top)) top = entry;
        }
        if (top) best.push({ entry: top, game });
    }
    best.sort((a, b) => (outranks(a.entry, b.entry) ? -1 : 1));
    return best.slice(0, PIN_LIMIT);
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
    const auto: SortMode[] = ['rank', 'recent', 'attempts', 'name'];
    if (layout.gameOrder === 'manual') return ['runner', ...auto];
    return [layout.gameOrder, ...auto.filter((m) => m !== layout.gameOrder)];
}
