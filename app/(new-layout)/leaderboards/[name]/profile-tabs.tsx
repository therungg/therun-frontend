'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type {
    LeaderboardsProfileEntry,
    LeaderboardsProfileGame,
} from '../../../../types/leaderboards-profile.types';
import { GameBlock } from './game-block';
import styles from './leaderboards-profile.module.scss';

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

// The selected tab lives in the URL hash so it survives a reload.
function subscribe(onChange: () => void) {
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
}
const readHash = () => window.location.hash.slice(1);
const serverHash = () => '';

function selectTab(id: TabId, fallback: TabId) {
    const url = new URL(window.location.href);
    url.hash = id === fallback ? '' : id;
    window.history.replaceState(window.history.state, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function ProfileTabs({
    games,
    country,
}: {
    games: LeaderboardsProfileGame[];
    country: string | null;
}) {
    const hash = useSyncExternalStore(subscribe, readHash, serverHash);

    const views = (Object.keys(pick) as TabId[]).map((id) => {
        const blocks = games
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

    // The block may only exist once the tab above has switched, after the
    // browser has already tried (and failed) to scroll to it.
    useEffect(() => {
        if (!hash.startsWith('game-')) return;
        document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    }, [hash]);

    if (games.length === 0) {
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
                            onClick={() => selectTab(t.id, fallback.id)}
                        >
                            {`${TAB_LABELS[t.id]} (${t.count.toLocaleString('en-US')})`}
                        </button>
                    ))}
                </div>
            ) : null}
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
                        {EMPTY_TEXT[active.id]}
                    </div>
                ) : (
                    active.blocks.map((b) => (
                        <GameBlock
                            key={b.game.gameId}
                            game={b.game}
                            entries={b.entries}
                            country={country}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
