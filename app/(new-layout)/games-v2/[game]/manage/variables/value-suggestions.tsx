'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { VariableValueCount } from '~src/lib/leaderboard-variables';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import { loadVariableValueCountsAction } from './actions/load-variable-value-counts.action';
import styles from './value-suggestions.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    selectedCategory: ResolvedCategory;
}

type Scope = 'category' | 'game';

// Values shown per variable before the rest collapse into a "+N more" line.
// Raw submitted values have a long, noisy tail (typos, casing, jokes); the
// head is what's worth bucketing.
const TOP_N = 6;

interface Group {
    variable: string;
    values: VariableValueCount[];
    max: number;
    hidden: number;
}

function groupByVariable(counts: VariableValueCount[]): Group[] {
    const byVar = new Map<string, VariableValueCount[]>();
    for (const c of counts) {
        const list = byVar.get(c.variable);
        if (list) list.push(c);
        else byVar.set(c.variable, [c]);
    }
    const groups: Group[] = [];
    for (const [variable, values] of byVar) {
        // Backend already orders by count desc within a variable, but don't
        // rely on it surviving the round-trip — sort defensively.
        const sorted = [...values].sort((a, b) => b.count - a.count);
        const head = sorted.slice(0, TOP_N);
        groups.push({
            variable,
            values: head,
            max: head[0]?.count ?? 0,
            hidden: sorted.length - head.length,
        });
    }
    // Variables with the most distinct submitted values first — those are the
    // ones a moderator most needs help bucketing.
    return groups.sort(
        (a, b) =>
            b.values.length + b.hidden - (a.values.length + a.hidden) ||
            a.variable.localeCompare(b.variable),
    );
}

/**
 * Read-only setup hint: how many distinct runners submitted each raw
 * variable=value on finished runs, so a moderator configuring subcategories
 * and filters can see the real distribution instead of guessing. Rendered as a
 * subsection of the variables section.
 */
export function ValueSuggestions({
    gameSlug,
    gameId,
    selectedCategory,
}: Props) {
    const [scope, setScope] = useState<Scope>('category');
    const [counts, setCounts] = useState<VariableValueCount[]>([]);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, startLoad] = useTransition();
    const categoryId = selectedCategory.id;

    useEffect(() => {
        startLoad(async () => {
            const res = await loadVariableValueCountsAction({
                gameSlug,
                gameId,
                categoryId: scope === 'category' ? categoryId : null,
            });
            if ('error' in res) {
                setLoadError(res.error);
                setCounts([]);
            } else {
                setLoadError(null);
                setCounts(res.result);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, categoryId, scope]);

    const groups = useMemo(() => groupByVariable(counts), [counts]);

    return (
        <div className="mb-3" id="value-suggestions">
            <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
                <h3 className="h6 mb-0">Suggested values</h3>
                <div
                    className="btn-group btn-group-sm"
                    role="group"
                    aria-label="Suggestion scope"
                >
                    <button
                        type="button"
                        className={`btn btn-outline-secondary ${scope === 'category' ? 'active' : ''}`}
                        aria-pressed={scope === 'category'}
                        onClick={() => setScope('category')}
                        disabled={isLoading}
                    >
                        This category
                    </button>
                    <button
                        type="button"
                        className={`btn btn-outline-secondary ${scope === 'game' ? 'active' : ''}`}
                        aria-pressed={scope === 'game'}
                        onClick={() => setScope('game')}
                        disabled={isLoading}
                    >
                        Whole game
                    </button>
                </div>
            </div>
            <p className="text-muted small mb-2">
                What runners have actually submitted on finished{' '}
                {scope === 'category'
                    ? 'runs in this category'
                    : 'runs game-wide'}
                . Use it to decide which values are worth a subcategory or
                filter — the counts are distinct runners.
            </p>

            {loadError && (
                <div className="alert alert-danger py-2" role="alert">
                    {loadError}
                </div>
            )}

            {isLoading && (
                <p className="text-muted small mb-0">Loading suggestions…</p>
            )}

            {!isLoading && !loadError && groups.length === 0 && (
                <p className="text-muted small mb-0">
                    No submitted values yet
                    {scope === 'category'
                        ? ' for this category'
                        : ' for this game'}
                    . Suggestions appear once runs come in.
                </p>
            )}

            {!isLoading && groups.length > 0 && (
                <div className={styles.groups}>
                    {groups.map((g) => (
                        <div key={g.variable} className={styles.group}>
                            <div className={styles.groupName}>{g.variable}</div>
                            <ul className={styles.valueList}>
                                {g.values.map((v) => (
                                    <li
                                        key={v.value}
                                        className={styles.valueRow}
                                    >
                                        <span
                                            className={styles.valueLabel}
                                            title={v.value}
                                        >
                                            {v.value === ''
                                                ? '(blank)'
                                                : v.value}
                                        </span>
                                        <span
                                            className={styles.bar}
                                            aria-hidden="true"
                                        >
                                            <span
                                                className={styles.barFill}
                                                style={{
                                                    width: `${g.max > 0 ? (v.count / g.max) * 100 : 0}%`,
                                                }}
                                            />
                                        </span>
                                        <span className={styles.valueCount}>
                                            {v.count.toLocaleString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            {g.hidden > 0 && (
                                <div className={styles.tail}>
                                    +{g.hidden.toLocaleString()} more value
                                    {g.hidden === 1 ? '' : 's'}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
