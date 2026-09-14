'use client';

import styles from './leaderboards-profile.module.scss';
import { useShowcase } from './showcase-provider';
import {
    COLLAPSE_AT,
    SORT_LABELS,
    type SortMode,
    sortOptions,
} from './showcase-rules';
import { setProfileUrl, useProfileUrl } from './url-state';

export function LedgerControls({
    anyCollapsed,
    onExpandAll,
}: {
    anyCollapsed: boolean;
    onExpandAll: () => void;
}) {
    const { games, draft } = useShowcase();
    const { sort, game } = useProfileUrl();
    const options = sortOptions(draft);
    const current = (options as string[]).includes(sort)
        ? (sort as SortMode)
        : options[0];
    if (games.length < 2) return null;

    return (
        <div className={styles.ledgerControls}>
            <label className={styles.ledgerSort}>
                <span>Sort</span>
                <select
                    value={current}
                    onChange={(e) =>
                        setProfileUrl({
                            sort:
                                e.target.value === options[0]
                                    ? ''
                                    : e.target.value,
                        })
                    }
                >
                    {options.map((m) => (
                        <option key={m} value={m}>
                            {SORT_LABELS[m]}
                        </option>
                    ))}
                </select>
            </label>
            {games.length >= COLLAPSE_AT ? (
                <input
                    type="search"
                    value={game}
                    placeholder="Filter games"
                    aria-label="Filter games"
                    className={styles.ledgerFilter}
                    onChange={(e) => setProfileUrl({ game: e.target.value })}
                />
            ) : null}
            {anyCollapsed ? (
                <button
                    type="button"
                    className={styles.tab}
                    onClick={onExpandAll}
                >
                    Expand all
                </button>
            ) : null}
        </div>
    );
}
