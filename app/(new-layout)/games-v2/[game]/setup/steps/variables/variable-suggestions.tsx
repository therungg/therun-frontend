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

// Values beyond this collapse into a "+N more" chip — the head is enough to
// recognize the variable; the full set pre-fills the add form.
const VALUE_HEAD = 8;

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
    // (and as which role), so a suggestion can say it's already set.
    const existingByName = useMemo(() => {
        const map = new Map<
            string,
            { role: VariableRoleId; categoryId: number }[]
        >();
        for (const v of existingVariables) {
            const list = map.get(v.nameNormalized) ?? [];
            list.push({ role: v.role, categoryId: v.categoryId });
            map.set(v.nameNormalized, list);
        }
        return map;
    }, [existingVariables]);

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
            <p className={styles.lede}>
                Variables runners actually set, measured against each
                category&rsquo;s own runners. Add one as a subcategory (its own
                boards) or a filter — the observed values pre-fill so you can
                merge spellings before it saves.
            </p>
            <ul className={styles.list}>
                {suggestions.map((s) => {
                    const buckets = bucketsFromValues(s.values);
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
                    const remaining = s.relevantCategoryIds.filter(
                        (id) => !addedCategoryIds.has(id),
                    );
                    const relevantLabel = s.relevantCategoryIds
                        .map((id) => {
                            const pct = Math.round(
                                (s.perCategory[id]?.share ?? 0) * 100,
                            );
                            return `${catName(id)} (${pct}%)`;
                        })
                        .join(' · ');

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
                        <li key={s.variable} className={styles.row}>
                            <div className={styles.head}>
                                <span className={styles.name}>
                                    {s.variable}
                                </span>
                                <span className={styles.relevant}>
                                    relevant in {relevantLabel}
                                </span>
                            </div>

                            <div className={styles.values}>
                                {buckets.slice(0, VALUE_HEAD).map((b) => (
                                    <span
                                        key={b.label}
                                        className={styles.value}
                                    >
                                        {b.label === '' ? '(blank)' : b.label}
                                        {b.aliases.length > 1 && (
                                            <span className={styles.alias}>
                                                {' '}
                                                +{b.aliases.length - 1}
                                            </span>
                                        )}
                                        <span className={styles.count}>
                                            {b.count.toLocaleString()}
                                        </span>
                                    </span>
                                ))}
                                {buckets.length > VALUE_HEAD && (
                                    <span className={styles.moreValues}>
                                        +{buckets.length - VALUE_HEAD} more
                                    </span>
                                )}
                            </div>

                            {existing.length > 0 && (
                                <p className={styles.already}>
                                    Already added as {addedRoles.join(' / ')} in{' '}
                                    {[...addedCategoryIds]
                                        .map(catName)
                                        .join(', ')}
                                    {remaining.length === 0
                                        ? '.'
                                        : ' — add it to the rest below.'}
                                </p>
                            )}

                            {remaining.length > 0 && (
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        onClick={() => openAdd('subcategory')}
                                    >
                                        Add as subcategory
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        onClick={() => openAdd('filter')}
                                    >
                                        Add as filter
                                    </button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
