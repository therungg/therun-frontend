'use client';

import { useMemo, useState } from 'react';
import { Check, GripVertical } from 'react-bootstrap-icons';
import type { CategoryVariableSuggestion } from '~src/lib/leaderboard-variables';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type { VariableRoleId } from '~src/lib/variables/language';
import {
    bucketsFromValues,
    mergeBuckets,
} from '~src/lib/variables/suggested-buckets';
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
                    category yet. Add subcategories and filters below by hand.
                </p>
            </section>
        );
    }

    // One section-level line instead of the same sentence under every card.
    const anyMergeable = suggestions.some((s) => s.values.length > 1);

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <h3 className={styles.title}>Suggested variables</h3>
                {anyMergeable && (
                    <span className={styles.headHint}>
                        Drag a value onto another to merge their spellings.
                    </span>
                )}
            </div>
            <ul className={styles.list}>
                {suggestions.map((s) => (
                    <SuggestionCard
                        key={s.variable}
                        suggestion={s}
                        existing={
                            existingByName.get(
                                normalizeVariableName(s.variable),
                            ) ?? []
                        }
                        catName={catName}
                        onAdd={onAdd}
                    />
                ))}
            </ul>
        </section>
    );
}

interface CardProps {
    suggestion: CategoryVariableSuggestion;
    existing: { role: VariableRoleId; categoryId: number }[];
    catName: (id: number) => string;
    onAdd: (prefill: SuggestionAddPrefill) => void;
}

function SuggestionCard({
    suggestion: s,
    existing,
    catName,
    onAdd,
}: CardProps) {
    // Live bucket set: starts alias-grouped, mutated by drag-to-merge. The add
    // form is pre-filled from THIS, so pre-merges carry through.
    const [buckets, setBuckets] = useState(() => bucketsFromValues(s.values));
    const [expanded, setExpanded] = useState(false);
    const [dragLabel, setDragLabel] = useState<string | null>(null);
    const [overLabel, setOverLabel] = useState<string | null>(null);

    const maxCount = Math.max(0, ...buckets.map((b) => b.count));
    const raw = buckets.map((b) => b.aliases.join(', ')).join('\n');

    const addedCategoryIds = new Set(existing.map((e) => e.categoryId));
    const addedRoles = [...new Set(existing.map((e) => e.role))];
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

    const openAdd = (role: VariableRoleId) =>
        onAdd({
            role,
            name: s.variable,
            raw,
            selectedIds: remaining.length ? remaining : s.relevantCategoryIds,
        });

    // Drop `dragLabel`'s bucket onto `target`, folding its spellings in as
    // aliases (the mod declaring N64 and Nintendo 64 the same thing early).
    const dropOnto = (target: string) => {
        if (dragLabel && dragLabel !== target) {
            setBuckets((prev) => mergeBuckets(prev, dragLabel, target));
        }
        setDragLabel(null);
        setOverLabel(null);
    };

    const shown = expanded ? buckets : buckets.slice(0, VALUE_HEAD);
    const hidden = buckets.length - shown.length;

    return (
        <li className={styles.card}>
            <div className={styles.cardHead}>
                {/* The exact key runners submit, verbatim — it's what the add
                    form's LiveSplit field is prefilled with, so inventing a
                    prettier title here only adds a second name to reconcile. */}
                <span className={styles.name}>{s.variable}</span>
                {state !== 'new' && (
                    <span className={styles.pillAdded}>
                        <Check size={14} aria-hidden />
                        {addedRoleText}
                    </span>
                )}
            </div>

            <div className={styles.bars}>
                {shown.map((b) => (
                    <div
                        key={b.label}
                        className={`${styles.barRow} ${
                            overLabel === b.label ? styles.barRowOver : ''
                        } ${dragLabel === b.label ? styles.barRowDragging : ''}`}
                        draggable
                        onDragStart={() => setDragLabel(b.label)}
                        onDragEnd={() => {
                            setDragLabel(null);
                            setOverLabel(null);
                        }}
                        onDragOver={(e) => {
                            if (!dragLabel || dragLabel === b.label) return;
                            e.preventDefault();
                            setOverLabel(b.label);
                        }}
                        onDragLeave={() =>
                            setOverLabel((o) => (o === b.label ? null : o))
                        }
                        onDrop={(e) => {
                            e.preventDefault();
                            dropOnto(b.label);
                        }}
                    >
                        <span
                            className={styles.barLabel}
                            title={b.aliases.join(', ')}
                        >
                            <span className={styles.dragHandle} aria-hidden>
                                <GripVertical size={12} />
                            </span>
                            {b.label === '' ? '(blank)' : b.label}
                            {b.aliases.length > 1 && (
                                <span className={styles.aliasTag}>
                                    +{b.aliases.length - 1}
                                </span>
                            )}
                        </span>
                        <span className={styles.barTrack} aria-hidden="true">
                            <span
                                className={styles.barFill}
                                style={{
                                    width: `${
                                        maxCount > 0
                                            ? (b.count / maxCount) * 100
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

                {hidden > 0 && (
                    <button
                        type="button"
                        className={styles.moreRow}
                        onClick={() => setExpanded(true)}
                    >
                        + {hidden} more {hidden === 1 ? 'value' : 'values'}
                    </button>
                )}
                {expanded && buckets.length > VALUE_HEAD && (
                    <button
                        type="button"
                        className={styles.moreRow}
                        onClick={() => setExpanded(false)}
                    >
                        Show fewer
                    </button>
                )}
            </div>

            <div className={styles.footer}>
                <span className={styles.relevance}>{relevance}</span>

                {state === 'covered' && (
                    <span className={styles.coveredNote}>
                        Already a {addedRoleText.toLowerCase()} in all of them
                    </span>
                )}
                {state === 'partial' && (
                    <span className={styles.gapNote}>
                        {addedRoleText} in {addedCategoryIds.size} · not yet in{' '}
                        {nameList(remaining.map(catName))}
                        <button
                            type="button"
                            className={styles.addPrimary}
                            onClick={() => openAdd(addedRoles[0])}
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
                            onClick={() => openAdd('subcategory')}
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
}
