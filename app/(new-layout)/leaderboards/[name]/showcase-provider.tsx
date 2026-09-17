'use client';

import { useRouter } from 'next/navigation';
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
    useState,
    useTransition,
} from 'react';
import { saveLeaderboardsLayout } from '~src/actions/leaderboards-layout.action';
import type {
    LeaderboardsLayout,
    LeaderboardsProfileGame,
    ResolvedLeaderboardsLayout,
} from '../../../../types/leaderboards-profile.types';

const strip = (l: ResolvedLeaderboardsLayout): LeaderboardsLayout => ({
    mainGameId: l.mainGameId,
    pins: l.pins,
    videoPin: l.videoPin,
    gameOrder: l.gameOrder,
    manualGameIds: l.manualGameIds,
    showActivity: l.showActivity,
});

interface Showcase {
    games: LeaderboardsProfileGame[];
    /** Whether this viewer can open board pages; names link to boards only then. */
    boardsVisible: boolean;
    /** What is saved (resolved by the backend). */
    layout: ResolvedLeaderboardsLayout;
    /** What the page shows: the saved layout, or the edit-mode draft. */
    draft: LeaderboardsLayout;
    editing: boolean;
    dirty: boolean;
    saving: boolean;
    error: string | null;
    setEditing: (on: boolean) => void;
    setDraft: (update: (d: LeaderboardsLayout) => LeaderboardsLayout) => void;
    /** The leaderboards stat strip's draft picks, set while customizing. */
    stripDraft: string[] | null;
    setStripDraft: (ids: string[]) => void;
    save: () => void;
}

const ShowcaseContext = createContext<Showcase | null>(null);

export function ShowcaseProvider({
    games,
    layout,
    boardsVisible,
    children,
}: {
    games: LeaderboardsProfileGame[];
    layout: ResolvedLeaderboardsLayout;
    boardsVisible: boolean;
    children: ReactNode;
}) {
    const router = useRouter();
    const [editing, setEditingState] = useState(false);
    const [draft, setDraftState] = useState<LeaderboardsLayout>(() =>
        strip(layout),
    );
    const [stripDraft, setStripDraftState] = useState<string[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, startSaving] = useTransition();

    const dirty = useMemo(
        () =>
            JSON.stringify(draft) !== JSON.stringify(strip(layout)) ||
            stripDraft !== null,
        [draft, layout, stripDraft],
    );

    const setEditing = useCallback(
        (on: boolean) => {
            // Reset the draft from the current (possibly just-refreshed)
            // layout whenever edit mode changes, so a stale draft from a
            // prior save never resurfaces the next time it opens.
            setDraftState(strip(layout));
            setStripDraftState(null);
            setError(null);
            setEditingState(on);
        },
        [layout],
    );

    const setDraft = useCallback(
        (update: (d: LeaderboardsLayout) => LeaderboardsLayout) =>
            setDraftState((d) => update(d)),
        [],
    );

    const setStripDraft = useCallback(
        (ids: string[]) => setStripDraftState(ids),
        [],
    );

    const save = useCallback(() => {
        startSaving(async () => {
            const result = await saveLeaderboardsLayout(draft, stripDraft);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setEditingState(false);
            setStripDraftState(null);
            router.refresh();
        });
    }, [draft, stripDraft, router]);

    const value = useMemo<Showcase>(
        () => ({
            games,
            boardsVisible,
            layout,
            draft: editing ? draft : strip(layout),
            editing,
            dirty,
            saving,
            error,
            setEditing,
            setDraft,
            stripDraft,
            setStripDraft,
            save,
        }),
        [
            games,
            boardsVisible,
            layout,
            draft,
            editing,
            dirty,
            saving,
            error,
            setEditing,
            setDraft,
            stripDraft,
            setStripDraft,
            save,
        ],
    );

    return (
        <ShowcaseContext.Provider value={value}>
            {children}
        </ShowcaseContext.Provider>
    );
}

export function useShowcase(): Showcase {
    const ctx = useContext(ShowcaseContext);
    if (!ctx) throw new Error('useShowcase outside ShowcaseProvider');
    return ctx;
}

/** Null outside the provider, for components that also render elsewhere. */
export function useShowcaseOptional(): Showcase | null {
    return useContext(ShowcaseContext);
}
