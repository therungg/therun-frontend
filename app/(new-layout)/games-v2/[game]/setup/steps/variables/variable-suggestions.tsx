'use client';

import { useMemo } from 'react';
import type { CategoryVariableSuggestion } from '~src/lib/leaderboard-variables';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type { VariableRoleId } from '~src/lib/variables/language';
import { bucketsFromValues } from '~src/lib/variables/suggested-buckets';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import styles from './variable-suggestions.module.scss';

export interface SuggestionAddPrefill {
    role: VariableRoleId;
    name: string;
    /** Grouped `label, alias…` lines for the add form's textarea. */
    raw: string;
    selectedIds: number[];
}

interface Props {
    suggestions: CategoryVariableSuggestion[];
    loading: boolean;
    error: string | null;
    categories: ResolvedCategory[];
    existingVariables: VariableRow[];
    onAdd: (prefill: SuggestionAddPrefill) => void;
}

// Values beyond this collapse into a "+N more" row — the head is enough to
// recognize the variable; the full set pre-fills the add form.
const VALUE_HEAD = 6;

const roleLabel = (role: VariableRoleId) =>
    role === 'subcategory' ? 'Subcategory' : 'Filter';

/** "16 Star, 1 Star +3" — a few names, then a count, never a wall. */
function nameList(names: string[], cap = 3): string {
    if (names.length <= cap) return names.join(', ');
    return `${names.slice(0, cap).join(', ')} +${names.length - cap}`;
}

/**
 * The step's lead surface: variables runners actually set, per category, each
 * addable as a subcategory or filter with its observed values pre-filled. We
 * suggest and attribute; the moderator chooses role and categories in the add
 * form this opens (owned by the grid, so this stays presentational).
 */
export function VariableSuggestions({
    suggestions,
    loading,
    error,
    categories,
    existingVariables,
    onAdd,
}: Props) {
    const displayById = useMemo(
        () => new Map(categories.map((c) => [c.id, c.display])),
        [categories],
    );

    // Configured variables keyed by normalized name → where they already live
    // (and as which role), so a suggestion can say it's already set. Restricted
    // to the FEATURED categories this step manages: `existingVariables` spans
    // every category on the game (hundreds of ILs/extensions on a big game), and
    // without this filter the "already added" line listed all of them.
    const existingByName = useMemo(() => {
        const featured = new Set(categories.map((c) => c.id));
        const map = new Map<
            string,
            { role: VariableRoleId; categoryId: number }[]
        >();
        for (const v of existingVariables) {
            if (!featured.has(v.categoryId)) continue;
            const list = map.get(v.nameNormalized) ?? [];
            list.push({ role: v.role, categoryId: v.categoryId });
            map.set(v.nameNormalized, list);
        }
        return map;
    }, [existingVariables, categories]);

    const catName = (id: number) => displayById.get(id) ?? `#${id}`;

    if (error) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.title}>Suggested variables</h3>
                <p className={styles.muted}>
                    Couldn&rsquo;t load suggestions: {error}
                </p>
            </section>
        );
    }
    if (loading && suggestions.length === 0) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.title}>Suggested variables</h3>
                <p className={styles.muted}>Finding what runners submit…</p>
            </section>
        );
    }
    if (suggestions.length === 0) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.title}>Suggested variables</h3>
                <p className={styles.muted}>
                    No variable is set by enough runners in any featured
                    category yet — add subcategories and filters below by hand.
                </p>
            </section>
        );
    }

    return (
        <section className={styles.panel}>
            <h3 className={styles.title}>Suggested variables</h3>
            <ul className={styles.list}>
                {suggestions.map((s) => {
                    const buckets = bucketsFromValues(s.values);
                    const maxCount = buckets[0]?.count ?? 0;
                    const raw = buckets
                        .map((b) => b.aliases.join(', '))
                        .join('\n');
                    const existing =
                        existingByName.get(normalizeVariableName(s.variable)) ??
                        [];
                    const addedCategoryIds = new Set(
                        existing.map((e) => e.categoryId),
                    );
                    const addedRoles = [
                        ...new Set(existing.map((e) => e.role)),
                    ];
                    const addedRoleText = addedRoles.map(roleLabel).join(' + ');
                    const remaining = s.relevantCategoryIds.filter(
                        (id) => !addedCategoryIds.has(id),
                    );

                    const pcts = s.relevantCategoryIds.map((id) =>
                        Math.round((s.perCategory[id]?.share ?? 0) * 100),
                    );
                    const lo = Math.min(...pcts);
                    const hi = Math.max(...pcts);
                    const shareText = lo === hi ? `${hi}%` : `${lo}–${hi}%`;
                    const n = s.relevantCategoryIds.length;
                    const relevance = `Relevant in ${n} ${
                        n === 1 ? 'category' : 'categories'
                    } · ${shareText} of runners`;

                    const state =
                        existing.length === 0
                            ? 'new'
                            : remaining.length === 0
                              ? 'covered'
                              : 'partial';

                    // Default the picker to the categories where it's relevant
                    // and not yet added; fall back to all relevant ones.
                    const openAdd = (role: VariableRoleId) =>
                        onAdd({
                            role,
                            name: s.variable,
                            raw,
                            selectedIds: remaining.length
                                ? remaining
                                : s.relevantCategoryIds,
                        });

                    return (
                        <li key={s.variable} className={styles.card}>
                            <div className={styles.cardHead}>
                                <span className={styles.name}>
                                    {s.variable}
                                </span>
                                {state !== 'new' && (
                                    <span className={styles.pillAdded}>
                                        ✓ {addedRoleText}
                                    </span>
                                )}
                            </div>

                            <div className={styles.bars}>
                                {buckets.slice(0, VALUE_HEAD).map((b) => (
                                    <div
                                        key={b.label}
                                        className={styles.barRow}
                                    >
                                        <span
                                            className={styles.barLabel}
                                            title={b.aliases.join(', ')}
                                        >
                                            {b.label === ''
                                                ? '(blank)'
                                                : b.label}
                                            {b.aliases.length > 1 && (
                                                <span
                                                    className={styles.aliasTag}
                                                >
                                                    +{b.aliases.length - 1}
                                                </span>
                                            )}
                                        </span>
                                        <span
                                            className={styles.barTrack}
                                            aria-hidden="true"
                                        >
                                            <span
                                                className={styles.barFill}
                                                style={{
                                                    width: `${
                                                        maxCount > 0
                                                            ? (
                                                                  b.count /
                                                                      maxCount
                                                              ) * 100
                                                            : 0
                                                    }%`,
                                                }}
                                            />
                                        </span>
                                        <span className={styles.barValue}>
                                            {b.count.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                {buckets.length > VALUE_HEAD && (
                                    <div className={styles.moreRow}>
                                        +{buckets.length - VALUE_HEAD} more{' '}
                                        {buckets.length - VALUE_HEAD === 1
                                            ? 'value'
                                            : 'values'}
                                    </div>
                                )}
                            </div>

                            <div className={styles.footer}>
                                <span className={styles.relevance}>
                                    {relevance}
                                </span>

                                {state === 'covered' && (
                                    <span className={styles.coveredNote}>
                                        Already a {addedRoleText.toLowerCase()}{' '}
                                        in all of them
                                    </span>
                                )}
                                {state === 'partial' && (
                                    <span className={styles.gapNote}>
                                        {addedRoleText} in{' '}
                                        {addedCategoryIds.size} · not yet in{' '}
                                        {nameList(remaining.map(catName))}
                                        <button
                                            type="button"
                                            className={styles.addPrimary}
                                            onClick={() =>
                                                openAdd(addedRoles[0])
                                            }
                                        >
                                            Add to {remaining.length} more
                                        </button>
                                    </span>
                                )}
                                {state === 'new' && (
                                    <span className={styles.actions}>
                                        <button
                                            type="button"
                                            className={styles.addPrimary}
                                            onClick={() =>
                                                openAdd('subcategory')
                                            }
                                        >
                                            Add as subcategory
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.addSecondary}
                                            onClick={() => openAdd('filter')}
                                        >
                                            Add as filter
                                        </button>
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
