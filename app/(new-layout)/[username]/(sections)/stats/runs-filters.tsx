'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useId } from 'react';
import { SegmentedControl } from '~app/(new-layout)/games/[game]/manage/shared/form-kit';
import styles from './stats.module.scss';

export type Timing = 'rta' | 'igt';

export interface GameOption {
    id: string;
    label: string;
}

/**
 * The Runs tab's two filters: which game, and which clock.
 *
 * The state is the URL — the page reads `searchParams` and does the
 * filtering server-side, so a filtered Runs tab is a link you can share and
 * the back button undoes a pick. This component only writes the URL; it
 * never reads it (`useSearchParams` would need a Suspense boundary around
 * every page that mounts it, and the page already has the values).
 */
export function RunsFilters({
    games,
    game,
    timing,
}: {
    games: GameOption[];
    /** The selected game id, or '' for all of them. */
    game: string;
    /** The selected clock, or null for each run's own. */
    timing: Timing | null;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const selectId = useId();

    const go = (next: { game?: string; timing?: string }) => {
        const params = new URLSearchParams();
        const nextGame = next.game ?? game;
        const nextTiming = next.timing ?? timing ?? '';
        if (nextGame) params.set('game', nextGame);
        if (nextTiming) params.set('timing', nextTiming);
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname, {
            scroll: false,
        });
    };

    return (
        <div className={styles.filters}>
            <div className={styles.filterField}>
                <label className={styles.filterLabel} htmlFor={selectId}>
                    Game
                </label>
                <select
                    id={selectId}
                    className={`form-select form-select-sm ${styles.filterSelect}`}
                    value={game}
                    onChange={(e) => go({ game: e.target.value })}
                >
                    <option value="">All games</option>
                    {games.map((g) => (
                        <option key={g.id} value={g.id}>
                            {g.label}
                        </option>
                    ))}
                </select>
            </div>
            <SegmentedControl
                label="Times"
                value={timing ?? 'igt'}
                options={[
                    { value: 'rta', label: 'RTA' },
                    { value: 'igt', label: 'IGT' },
                ]}
                onChange={(value) => go({ timing: value })}
            />
        </div>
    );
}
