'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { GameAutocomplete } from '~app/(new-layout)/runs/game-autocomplete';
import { AppContext } from '~src/common/app.context';
import {
    loadRunner,
    metaForTiming,
    type RunnerData,
} from '~src/components/run/compare/load-runner';
import { ShowComparison } from '~src/components/run/compare/show-comparison';
import { getFormattedString } from '~src/components/util/datetime';
import type { Count, StatsData } from '~src/types/game-stats.types';
import { safeEncodeURI } from '~src/utils/uri';
import styles from '../tools.module.scss';

type Load<T> =
    | { state: 'idle' }
    | { state: 'loading' }
    | { state: 'error' }
    | { state: 'done'; data: T };

/** A runner the pair needs: loaded, or why not. */
type RunnerLoad = Load<RunnerData | null>;

export function CompareTool() {
    const { baseUrl = 'https://therun.gg' } = React.useContext(AppContext);
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const game = params.get('game') ?? '';
    const category = params.get('category') ?? '';
    const userA = params.get('a') ?? '';
    const userB = params.get('b') ?? '';
    const gameTime = params.get('igt') === '1';

    const setParams = (next: Record<string, string>) => {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
        const s = q.toString();
        router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    };
    const current = {
        game,
        category,
        a: userA,
        b: userB,
        igt: gameTime ? '1' : '',
    };

    const stats = useGameStats(baseUrl, game);

    const statsData = stats.state === 'done' ? stats.data : null;
    const hasGameTime = !!statsData?.statsGameTime;
    const timingStats =
        gameTime && statsData?.statsGameTime
            ? statsData.statsGameTime
            : statsData?.stats;
    // Two runners are the least a comparison needs.
    const categories = (timingStats?.categoryLeaderboards ?? []).filter(
        (c) => c.pbLeaderboard.length >= 2,
    );
    const board = categories.find((c) => c.categoryNameDisplay === category);
    const entries = board?.pbLeaderboard ?? [];
    const entryA = entries.find((e) => e.username === userA);
    const entryB = entries.find((e) => e.username === userB);

    const runnerA = useRunner(baseUrl, entryA?.url);
    const runnerB = useRunner(baseUrl, entryB?.url);

    return (
        <>
            <div className={styles.form}>
                <label className={styles.field}>
                    <span className={styles.label}>Game</span>
                    <GameAutocomplete
                        value={game}
                        className="form-control"
                        onChange={(value) => setParams({ game: value })}
                    />
                </label>
                {categories.length > 0 && (
                    <label className={styles.field}>
                        <span className={styles.label}>Category</span>
                        <select
                            className="form-select"
                            value={board ? category : ''}
                            onChange={(e) =>
                                setParams({
                                    game,
                                    category: e.target.value,
                                    igt: current.igt,
                                })
                            }
                        >
                            <option value="" disabled>
                                Pick a category
                            </option>
                            {categories.map((c) => (
                                <option
                                    key={c.categoryName}
                                    value={c.categoryNameDisplay}
                                >
                                    {c.categoryNameDisplay} (
                                    {c.pbLeaderboard.length} runners)
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                {hasGameTime && (
                    <label className={styles.field}>
                        <span className={styles.label}>Timing</span>
                        <select
                            className="form-select"
                            value={gameTime ? '1' : ''}
                            onChange={(e) =>
                                setParams({ ...current, igt: e.target.value })
                            }
                        >
                            <option value="">Real time</option>
                            <option value="1">Game time</option>
                        </select>
                    </label>
                )}
            </div>

            {board && (
                <div className={styles.form}>
                    <RunnerSelect
                        label="Runner"
                        entries={entries}
                        value={entryA ? userA : ''}
                        exclude={userB}
                        onChange={(a) => setParams({ ...current, a })}
                    />
                    <RunnerSelect
                        label="Compared to"
                        entries={entries}
                        value={entryB ? userB : ''}
                        exclude={userA}
                        onChange={(b) => setParams({ ...current, b })}
                    />
                </div>
            )}

            <CompareStatus
                game={game}
                stats={stats}
                hasCategories={categories.length > 0}
                category={category}
                board={!!board}
            />

            {entryA && entryB && (
                <Comparison
                    userA={userA}
                    userB={userB}
                    runnerA={runnerA}
                    runnerB={runnerB}
                    gameTime={gameTime}
                />
            )}
        </>
    );
}

function RunnerSelect({
    label,
    entries,
    value,
    exclude,
    onChange,
}: {
    label: string;
    entries: Count[];
    value: string;
    exclude: string;
    onChange: (username: string) => void;
}) {
    return (
        <label className={styles.field}>
            <span className={styles.label}>{label}</span>
            <select
                className="form-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="" disabled>
                    Pick a runner
                </option>
                {entries
                    .filter((e) => e.username !== exclude)
                    .map((e) => (
                        <option key={e.username} value={e.username}>
                            {e.placing}. {e.username} (
                            {getFormattedString(e.stat.toString())})
                        </option>
                    ))}
            </select>
        </label>
    );
}

function CompareStatus({
    game,
    stats,
    hasCategories,
    category,
    board,
}: {
    game: string;
    stats: Load<StatsData | null>;
    hasCategories: boolean;
    category: string;
    board: boolean;
}) {
    if (!game) return null;
    if (stats.state === 'loading')
        return <p className={styles.note}>Loading {game}…</p>;
    if (stats.state === 'error' || (stats.state === 'done' && !stats.data))
        return <p className={styles.error}>Could not load stats for {game}.</p>;
    if (stats.state === 'done' && !hasCategories)
        return (
            <p className={styles.note}>
                No category of {game} has two runners with splits yet.
            </p>
        );
    if (category && !board)
        return (
            <p className={styles.note}>
                {category} has no runners with splits for this timing.
            </p>
        );
    return null;
}

function Comparison({
    userA,
    userB,
    runnerA,
    runnerB,
    gameTime,
}: {
    userA: string;
    userB: string;
    runnerA: RunnerLoad;
    runnerB: RunnerLoad;
    gameTime: boolean;
}) {
    if (runnerA.state === 'loading' || runnerB.state === 'loading')
        return <p className={styles.note}>Loading splits…</p>;

    const failed = (r: RunnerLoad) =>
        r.state === 'error' || (r.state === 'done' && !r.data);
    const missing = [
        failed(runnerA) ? userA : null,
        failed(runnerB) ? userB : null,
    ].filter((u): u is string => u !== null);
    if (missing.length > 0)
        return (
            <p className={styles.error}>
                Could not load splits for {missing.join(' and ')}.
            </p>
        );

    if (runnerA.state !== 'done' || runnerB.state !== 'done') return null;
    const a = runnerA.data!;
    const b = runnerB.data!;
    const historyA = gameTime ? a.gameTime : a.realTime;
    const historyB = gameTime ? b.gameTime : b.realTime;
    if (!historyA || !historyB)
        return (
            <p className={styles.error}>
                {!historyA ? userA : userB} has no game time splits.
            </p>
        );

    return (
        <ShowComparison
            key={`${userA}:${userB}:${gameTime}`}
            one={historyA.splits}
            two={historyB.splits}
            userOne={userA}
            userTwo={userB}
            runOne={metaForTiming(a.meta, gameTime)}
            runTwo={metaForTiming(b.meta, gameTime)}
            runsOne={historyA.runs}
            runsTwo={historyB.runs}
        />
    );
}

/** A game's stats, for its category leaderboards; refetched when it changes. */
function useGameStats(baseUrl: string, game: string): Load<StatsData | null> {
    const [load, setLoad] = useState<{
        game: string;
        load: Load<StatsData | null>;
    }>();
    useEffect(() => {
        if (!game) return;
        let stale = false;
        fetch(`${baseUrl}/api/games/${safeEncodeURI(game)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data: StatsData | null) => {
                if (!stale) setLoad({ game, load: { state: 'done', data } });
            })
            .catch(() => {
                if (!stale) setLoad({ game, load: { state: 'error' } });
            });
        return () => {
            stale = true;
        };
    }, [baseUrl, game]);
    if (!game) return { state: 'idle' };
    return load?.game === game ? load.load : { state: 'loading' };
}

/** One runner's data for a leaderboard entry url; refetched when it changes. */
function useRunner(baseUrl: string, url: string | undefined): RunnerLoad {
    // Tagged with the url it was loaded for, so a runner that was just
    // switched reads as loading instead of showing the previous one's splits.
    const [load, setLoad] = useState<{ url: string; load: RunnerLoad }>();
    useEffect(() => {
        if (!url) return;
        let stale = false;
        loadRunner(baseUrl, url)
            .then((data) => {
                if (!stale) setLoad({ url, load: { state: 'done', data } });
            })
            .catch(() => {
                if (!stale) setLoad({ url, load: { state: 'error' } });
            });
        return () => {
            stale = true;
        };
    }, [baseUrl, url]);
    if (!url) return { state: 'idle' };
    return load?.url === url ? load.load : { state: 'loading' };
}
