'use client';

import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import type { LeaderboardsProfileEntry } from '../../../../../types/leaderboards-profile.types';
import type {
    RunnerStatus,
    SubmissionItem,
    SubmissionsOverview,
} from '../../../../../types/runner-status.types';
import { gameRefOf } from '../format';
import { useShowcaseOptional } from '../showcase-provider';

/** The runner themself gets controls; a moderator or admin only reads. */
export type LayerViewer = 'owner' | 'mod';

export type StatusFilter =
    | 'all'
    | 'needs_you'
    | 'waiting_mod'
    | 'rejected'
    | 'beaten'
    | 'removed';

export const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'needs_you', label: 'Needs you' },
    { id: 'waiting_mod', label: 'Waiting for a moderator' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'beaten', label: 'Beaten' },
    { id: 'removed', label: 'Removed' },
];

const FILTER_OF: Record<RunnerStatus, StatusFilter | null> = {
    on_board: null,
    waiting_mod: 'waiting_mod',
    needs_you: 'needs_you',
    beaten: 'beaten',
    rejected: 'rejected',
    removed_by_you: 'removed',
    removed_by_mod: 'removed',
    off_board: null,
};

export const matchesStatusFilter = (
    status: RunnerStatus,
    filter: StatusFilter,
) => filter === 'all' || FILTER_OF[status] === filter;

/** A game the layer can name and picture: the profile's, or one only a run off the boards is on. */
export interface LayerGame {
    gameId: number;
    /** What run and board links carry (`games.name`). */
    gameRef: string;
    game: string;
    imageUrl: string | null;
}

export interface LayerData {
    overview: SubmissionsOverview;
    viewer: LayerViewer;
    /** Games the runner has runs on that the public profile does not list. */
    extraGames: LayerGame[];
}

type ItemKind = SubmissionItem['kind'];

/** How a board prints its times, borrowed from a public row on it. */
export type ItemFormat = Pick<
    LeaderboardsProfileEntry,
    'timing' | 'gameTimeLabel' | 'showMilliseconds' | 'millisecondsMode'
>;

export const DEFAULT_FORMAT: ItemFormat = {
    timing: 'realtime',
    gameTimeLabel: 'igt',
    showMilliseconds: false,
};

const itemKey = (kind: ItemKind, id: number) => `${kind}:${id}`;
const sliceKey = (gameId: number, categoryId: number, subKey: string) =>
    `${gameId}|${categoryId}|${subKey}`;

interface OwnerLayer {
    /** Null: this viewer gets nothing beyond the public page. */
    overview: SubmissionsOverview | null;
    viewer: LayerViewer | null;
    runnerName: string;
    itemFor: (kind: ItemKind, id: number | null) => SubmissionItem | undefined;
    /** Runs on one board slice that the public page shows no row for. */
    offBoard: (
        gameId: number,
        categoryId: number,
        subcategoryKey: string,
    ) => SubmissionItem[];
    /** Every such run in one game, whatever its slice. */
    offBoardInGame: (gameId: number) => SubmissionItem[];
    /** Whether a slice has any run matching the status filter. */
    sliceMatches: (
        gameId: number,
        categoryId: number,
        subcategoryKey: string,
    ) => boolean;
    statusFilter: StatusFilter;
    setStatusFilter: (f: StatusFilter) => void;
    games: Map<number, LayerGame>;
    formatFor: (gameId: number, categoryId: number) => ItemFormat;
    /** Bumps whenever a fresh overview arrives, so lists loaded on the side reload. */
    version: number;
    setData: (data: LayerData | null) => void;
}

// No layer: nothing to hold, so setters have nothing to do.
const ignore = () => undefined;

const inert: OwnerLayer = {
    overview: null,
    viewer: null,
    runnerName: '',
    itemFor: () => undefined,
    offBoard: () => [],
    offBoardInGame: () => [],
    sliceMatches: () => true,
    statusFilter: 'all',
    setStatusFilter: ignore,
    games: new Map(),
    formatFor: () => DEFAULT_FORMAT,
    version: 0,
    setData: ignore,
};

const OwnerLayerContext = createContext<OwnerLayer>(inert);

export function useOwnerLayer(): OwnerLayer {
    return useContext(OwnerLayerContext);
}

/**
 * Holds the runner's own view of their runs for whoever may see it (the
 * runner, a moderator of their games, an admin). Starts empty, so the page
 * renders exactly as a visitor sees it; `OwnerLayerFeed`, streamed in from
 * behind a Suspense boundary, fills it in.
 */
export function OwnerLayerProvider({
    runnerName,
    children,
}: {
    runnerName: string;
    children: ReactNode;
}) {
    const showcase = useShowcaseOptional();
    const profileGames = showcase?.games;
    const [data, setDataState] = useState<LayerData | null>(null);
    const [version, setVersion] = useState(0);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const setData = useCallback((next: LayerData | null) => {
        setDataState(next);
        setVersion((v) => v + 1);
    }, []);

    const value = useMemo<OwnerLayer>(() => {
        if (!data) return { ...inert, runnerName, setData };
        const { overview } = data;

        const byKey = new Map<string, SubmissionItem>();
        for (const item of overview.items) {
            byKey.set(itemKey(item.kind, item.id), item);
        }
        for (const item of overview.needsYou) {
            if (!byKey.has(itemKey(item.kind, item.id))) {
                byKey.set(itemKey(item.kind, item.id), item);
            }
        }

        // Everything the public page already has a row for: board entries on
        // current and archived boards, and the earlier PBs under them.
        const shown = new Set<string>();
        const games = new Map<number, LayerGame>();
        const formats = new Map<string, ItemFormat>();
        for (const g of profileGames ?? []) {
            games.set(g.gameId, {
                gameId: g.gameId,
                gameRef: gameRefOf(g),
                game: g.game,
                imageUrl: g.imageUrl,
            });
            for (const e of [...g.entries, ...g.archived]) {
                const fk = `${g.gameId}|${e.categoryId}`;
                if (!formats.has(fk)) {
                    formats.set(fk, {
                        timing: e.timing,
                        gameTimeLabel: e.gameTimeLabel,
                        showMilliseconds: e.showMilliseconds,
                        millisecondsMode: e.millisecondsMode,
                    });
                }
                const id = e.kind === 'run' ? e.runId : e.manualTimeId;
                if (id !== null) shown.add(itemKey(e.kind, id));
                for (const pb of e.earlierPbs ?? []) {
                    const pbId = pb.kind === 'run' ? pb.runId : pb.manualTimeId;
                    if (pbId !== null) shown.add(itemKey(pb.kind, pbId));
                }
            }
        }
        for (const g of data.extraGames) {
            if (!games.has(g.gameId)) games.set(g.gameId, g);
        }

        // Off the board and not on the page: rejected, removed, held, and
        // beaten runs no moderator has looked at. A beaten run that was
        // verified is history, and a run on the board always has its row.
        const offBoardAll = [...byKey.values()].filter(
            (i) =>
                !shown.has(itemKey(i.kind, i.id)) &&
                i.status !== 'on_board' &&
                !(i.status === 'beaten' && i.decidedAt !== null) &&
                matchesStatusFilter(i.status, statusFilter),
        );
        const bySlice = new Map<string, SubmissionItem[]>();
        const byGame = new Map<number, SubmissionItem[]>();
        for (const i of offBoardAll) {
            const k = sliceKey(i.gameId, i.categoryId, i.subcategoryKey);
            bySlice.set(k, [...(bySlice.get(k) ?? []), i]);
            byGame.set(i.gameId, [...(byGame.get(i.gameId) ?? []), i]);
        }

        const matchingSlices = new Set<string>();
        for (const i of byKey.values()) {
            if (matchesStatusFilter(i.status, statusFilter)) {
                matchingSlices.add(
                    sliceKey(i.gameId, i.categoryId, i.subcategoryKey),
                );
            }
        }

        return {
            overview,
            viewer: data.viewer,
            runnerName,
            itemFor: (kind, id) =>
                id === null ? undefined : byKey.get(itemKey(kind, id)),
            offBoard: (gameId, categoryId, subKey) =>
                bySlice.get(sliceKey(gameId, categoryId, subKey)) ?? [],
            offBoardInGame: (gameId) => byGame.get(gameId) ?? [],
            sliceMatches: (gameId, categoryId, subKey) =>
                statusFilter === 'all' ||
                matchingSlices.has(sliceKey(gameId, categoryId, subKey)),
            statusFilter,
            setStatusFilter,
            games,
            formatFor: (gameId, categoryId) =>
                formats.get(`${gameId}|${categoryId}`) ?? DEFAULT_FORMAT,
            version,
            setData,
        };
    }, [data, profileGames, runnerName, statusFilter, version, setData]);

    return (
        <OwnerLayerContext.Provider value={value}>
            {children}
        </OwnerLayerContext.Provider>
    );
}

/** Hands the streamed-in overview to the provider above it. Renders nothing. */
export function OwnerLayerFeed({ data }: { data: LayerData }) {
    const { setData } = useOwnerLayer();
    useEffect(() => {
        setData(data);
    }, [data, setData]);
    useEffect(() => () => setData(null), [setData]);
    return null;
}
