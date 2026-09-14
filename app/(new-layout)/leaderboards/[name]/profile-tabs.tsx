'use client';

import { useEffect, useState } from 'react';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { GameBlock } from './game-block';
import styles from './leaderboards-profile.module.scss';
import { LedgerControls } from './ledger-controls';
import { useShowcase } from './showcase-provider';
import {
    COLLAPSE_AT,
    mainGameOf,
    orderGames,
    type SortMode,
    sortOptions,
} from './showcase-rules';
import { setProfileUrl, useProfileUrl } from './url-state';

type TabId = 'full' | 'levels' | 'pending' | 'archived';

const TAB_LABELS: Record<TabId, string> = {
    full: 'Full game',
    levels: 'Levels',
    pending: 'Pending',
    archived: 'Archived',
};

const EMPTY_TEXT: Record<TabId, string> = {
    full: 'No full-game runs yet.',
    levels: 'No level runs yet.',
    pending: 'Nothing pending.',
    archived: 'Nothing archived.',
};

// Pending runs are on the boards, so Full game and Levels include them; the
// Pending tab is that subset across both.
const pick: Record<
    TabId,
    (game: LeaderboardsProfileGame) => LeaderboardsProfileEntry[]
> = {
    full: (g) => g.entries.filter((e) => e.level === null),
    levels: (g) => g.entries.filter((e) => e.level !== null),
    pending: (g) => g.entries.filter((e) => e.status === 'pending'),
    archived: (g) => g.archived,
};

export function ProfileTabs({ country }: { country: string | null }) {
    const { games: unordered, draft } = useShowcase();
    const { hash, sort, game: filter } = useProfileUrl();
    const options = sortOptions(draft);
    const mode = (options as string[]).includes(sort)
        ? (sort as SortMode)
        : 'runner';
    const games = orderGames(unordered, draft, mode);
    const mainId = mainGameOf(unordered, draft.mainGameId)?.gameId ?? null;
    const needle = filter.trim().toLowerCase();
    const matches = (g: LeaderboardsProfileGame) =>
        needle === '' || g.game.toLowerCase().includes(needle);
    const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
    const collapsing = unordered.length >= COLLAPSE_AT;
    const isCollapsed = (g: LeaderboardsProfileGame) =>
        collapsing &&
        needle === '' &&
        g.gameId !== mainId &&
        !expanded.has(g.gameId);

    const views = (Object.keys(pick) as TabId[]).map((id) => {
        const blocks = games
            .filter(matches)
            .map((game) => ({ game, entries: pick[id](game) }))
            .filter((b) => b.entries.length > 0);
        const count = blocks.reduce((n, b) => n + b.entries.length, 0);
        return { id, blocks, count };
    });
    // Full game is always offered; the others only when they have something.
    const tabs = views.filter((v) => v.id === 'full' || v.count > 0);
    // A runner with only level runs lands on Levels rather than an empty tab.
    const fallback =
        tabs.find((t) => t.id === 'full' && t.count > 0) ??
        tabs.find((t) => t.count > 0) ??
        tabs[0];
    // A `#game-<id>` hash (from the sidebar's Games card) is not a tab: it
    // opens whichever tab shows that game, Full game first. Any other unknown
    // hash is the default tab.
    const gameId = hash.startsWith('game-') ? Number(hash.slice(5)) : null;
    const gameTab =
        gameId === null
            ? undefined
            : [fallback, ...tabs].find((t) =>
                  t.blocks.some((b) => b.game.gameId === gameId),
              );
    const active = tabs.find((t) => t.id === hash) ?? gameTab ?? fallback;

    // A `#game-<id>` hash also expands that block. The block may only exist
    // once the tab above has switched, after the browser has already tried
    // (and failed) to scroll to it, so this effect scrolls again once it can.
    useEffect(() => {
        if (!hash.startsWith('game-')) return;
        const id = Number(hash.slice(5));
        setExpanded((s) => (s.has(id) ? s : new Set(s).add(id)));
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    }, [hash]);

    if (unordered.length === 0) {
        return <div className={styles.emptyNote}>No leaderboard runs yet.</div>;
    }

    return (
        <div className={styles.tabsWrap}>
            {tabs.length > 1 ? (
                <div className={styles.tabs} role="tablist" aria-label="Runs">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            id={`profile-tab-${t.id}`}
                            aria-selected={t.id === active.id}
                            aria-controls="profile-tabpanel"
                            className={
                                t.id === active.id
                                    ? `${styles.tab} ${styles.tabActive}`
                                    : styles.tab
                            }
                            onClick={() =>
                                setProfileUrl({
                                    hash: t.id === fallback.id ? '' : t.id,
                                })
                            }
                        >
                            {`${TAB_LABELS[t.id]} (${t.count.toLocaleString('en-US')})`}
                        </button>
                    ))}
                </div>
            ) : null}
            <LedgerControls
                anyCollapsed={active.blocks.some((b) => isCollapsed(b.game))}
                onExpandAll={() =>
                    setExpanded(new Set(unordered.map((g) => g.gameId)))
                }
            />
            <div
                id="profile-tabpanel"
                role={tabs.length > 1 ? 'tabpanel' : undefined}
                aria-labelledby={
                    tabs.length > 1 ? `profile-tab-${active.id}` : undefined
                }
                className={styles.tabPanel}
            >
                {active.blocks.length === 0 ? (
                    <div className={styles.emptyNote}>
                        {needle ? 'No games match.' : EMPTY_TEXT[active.id]}
                    </div>
                ) : (
                    active.blocks.map((b) => (
                        <GameBlock
                            key={b.game.gameId}
                            game={b.game}
                            entries={b.entries}
                            country={country}
                            collapsed={isCollapsed(b.game)}
                            onExpand={() =>
                                setExpanded((s) =>
                                    new Set(s).add(b.game.gameId),
                                )
                            }
                            single={unordered.length === 1}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
