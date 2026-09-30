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
import {
    getGameCategories,
    getGameCategoryStats,
} from '~src/lib/game-category-stats';
import type { Count } from '~src/types/game-stats.types';
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
    const wantsGameTime = params.get('igt') === '1';

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
        igt: wantsGameTime ? '1' : '',
    };

    // The category list first, then only the picked category's stats: the
    // whole game's are too big to load for the largest games.
    const categoryList = useLoad(game || null, () => getGameCategories(game));
    const summaries =
        categoryList.state === 'done' ? (categoryList.data ?? []) : [];
    const summary = summaries.find((c) => c.categoryNameDisplay === category);
    const hasGameTime = (summary?.runnersGameTime ?? 0) >= 2;
    const gameTime = wantsGameTime && hasGameTime;
    // Two runners are the least a comparison needs.
    const categories = summaries.filter((c) => c.runners >= 2);

    const categoryStats = useLoad(
        game && summary ? `${game}\n${category}` : null,
        () => getGameCategoryStats(game, category),
    );
    const statsData =
        categoryStats.state === 'done' ? categoryStats.data : null;
    const timingStats =
        gameTime && statsData?.statsGameTime
            ? statsData.statsGameTime
            : statsData?.stats;
    const board = timingStats?.categoryLeaderboards?.[0];
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
                            value={summary ? category : ''}
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
                                    {c.categoryNameDisplay} ({c.runners}{' '}
                                    runners)
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
                            value={wantsGameTime ? '1' : ''}
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
                categoryList={categoryList}
                hasCategories={categories.length > 0}
                category={category}
                picked={!!summary}
                categoryStats={categoryStats}
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
    categoryList,
    hasCategories,
    category,
    picked,
    categoryStats,
    board,
}: {
    game: string;
    categoryList: Load<unknown>;
    hasCategories: boolean;
    category: string;
    picked: boolean;
    categoryStats: Load<unknown>;
    board: boolean;
}) {
    if (!game) return null;
    if (categoryList.state === 'loading')
        return <p className={styles.note}>Loading {game}…</p>;
    if (
        categoryList.state === 'error' ||
        (categoryList.state === 'done' && !categoryList.data)
    )
        return <p className={styles.error}>Could not load stats for {game}.</p>;
    if (categoryList.state === 'done' && !hasCategories)
        return (
            <p className={styles.note}>
                No category of {game} has two runners with splits yet.
            </p>
        );
    if (!category) return null;
    if (!picked)
        return (
            <p className={styles.note}>
                {game} has no category {category} with runners to compare.
            </p>
        );
    if (categoryStats.state === 'loading')
        return <p className={styles.note}>Loading {category}…</p>;
    if (
        categoryStats.state === 'error' ||
        (categoryStats.state === 'done' && !categoryStats.data)
    )
        return (
            <p className={styles.error}>Could not load stats for {category}.</p>
        );
    if (categoryStats.state === 'done' && !board)
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

/**
 * `load()`'s result for `key`; reloaded when the key changes, idle without
 * one. Tagged with the key it loaded, so a changed key reads as loading
 * instead of showing the previous answer.
 */
function useLoad<T>(key: string | null, load: () => Promise<T>): Load<T> {
    const [result, setResult] = useState<{ key: string; load: Load<T> }>();
    // `load` is rebuilt every render; the key names what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (key === null) return;
        let stale = false;
        load()
            .then((data) => {
                if (!stale) setResult({ key, load: { state: 'done', data } });
            })
            .catch(() => {
                if (!stale) setResult({ key, load: { state: 'error' } });
            });
        return () => {
            stale = true;
        };
    }, [key]);
    if (key === null) return { state: 'idle' };
    return result?.key === key ? result.load : { state: 'loading' };
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
