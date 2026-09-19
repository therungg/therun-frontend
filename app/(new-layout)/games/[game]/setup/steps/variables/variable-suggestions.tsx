'use client';

import { useMemo, useState } from 'react';
import { GripVertical } from 'react-bootstrap-icons';
import type { CategoryVariableSuggestion } from '~src/lib/leaderboard-variables';
import { boardNoun, type WorkspaceKind } from '~src/lib/setup/workspace';
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
    kind: WorkspaceKind;
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

/**
 * Suggestions worth offering: the ones that are not already a subcategory or
 * filter on this step's boards. A name that is set up is not a suggestion —
 * it is configured, and its categories are its own screen's business.
 */
export function unusedSuggestions(
    suggestions: CategoryVariableSuggestion[],
    existingVariables: VariableRow[],
    categories: ResolvedCategory[],
): CategoryVariableSuggestion[] {
    const featured = new Set(categories.map((c) => c.id));
    const configured = new Set(
        existingVariables
            .filter((v) => featured.has(v.categoryId))
            .map((v) => v.nameNormalized),
    );
    return suggestions.filter(
        (s) => !configured.has(normalizeVariableName(s.variable)),
    );
}

/**
 * The step's lead surface: variables runners actually set, per category, each
 * addable as a subcategory or filter with its observed values pre-filled. We
 * suggest and attribute; the moderator chooses role and categories in the add
 * form this opens (owned by the grid, so this stays presentational).
 */
export function VariableSuggestions({
    kind,
    suggestions,
    loading,
    error,
    categories,
    existingVariables,
    onAdd,
}: Props) {
    // What is already set up is not a suggestion. Restricted to the FEATURED
    // categories this step manages: `existingVariables` spans every category
    // on the game (hundreds of ILs/extensions on a big game).
    const open = useMemo(
        () => unusedSuggestions(suggestions, existingVariables, categories),
        [suggestions, existingVariables, categories],
    );

    if (error) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.title}>From runs</h3>
                <p className={styles.muted}>
                    Couldn&rsquo;t load suggestions: {error}
                </p>
            </section>
        );
    }
    if (loading && open.length === 0) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.title}>From runs</h3>
                <p className={styles.muted}>Finding what runners submit…</p>
            </section>
        );
    }
    if (open.length === 0) {
        return (
            <section className={styles.panel}>
                <h3 className={styles.title}>From runs</h3>
                <p className={styles.muted}>
                    No variable is set by enough runners in any{' '}
                    {boardNoun(kind)} yet. Add subcategories and filters below
                    by hand.
                </p>
            </section>
        );
    }

    // One section-level line instead of the same sentence under every card.
    const anyMergeable = open.some((s) => s.values.length > 1);

    return (
        <section className={styles.panel}>
            <div className={styles.head}>
                <h3 className={styles.title}>From runs</h3>
                <span className={styles.headHint}>
                    Values runners fill in, per {boardNoun(kind)}
                    {anyMergeable &&
                        ' · drag a value onto another to merge their spellings'}
                </span>
            </div>
            <ul className={styles.list}>
                {open.map((s) => (
                    <SuggestionCard
                        kind={kind}
                        key={s.variable}
                        suggestion={s}
                        onAdd={onAdd}
                    />
                ))}
            </ul>
        </section>
    );
}

interface CardProps {
    kind: WorkspaceKind;
    suggestion: CategoryVariableSuggestion;
    onAdd: (prefill: SuggestionAddPrefill) => void;
}

function SuggestionCard({ kind, suggestion: s, onAdd }: CardProps) {
    // Live bucket set: starts alias-grouped, mutated by drag-to-merge. The add
    // form is pre-filled from THIS, so pre-merges carry through.
    const [buckets, setBuckets] = useState(() => bucketsFromValues(s.values));
    const [expanded, setExpanded] = useState(false);
    const [dragLabel, setDragLabel] = useState<string | null>(null);
    const [overLabel, setOverLabel] = useState<string | null>(null);

    const maxCount = Math.max(0, ...buckets.map((b) => b.count));
    const raw = buckets.map((b) => b.aliases.join(', ')).join('\n');

    const pcts = s.relevantCategoryIds.map((id) =>
        Math.round((s.perCategory[id]?.share ?? 0) * 100),
    );
    const lo = Math.min(...pcts);
    const hi = Math.max(...pcts);
    const shareText = lo === hi ? `${hi}%` : `${lo}–${hi}%`;
    const n = s.relevantCategoryIds.length;
    const relevance = `Relevant in ${n} ${boardNoun(kind, n)} · ${shareText} of runners`;

    const openAdd = (role: VariableRoleId) =>
        onAdd({
            role,
            name: s.variable,
            raw,
            selectedIds: s.relevantCategoryIds,
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
            </div>
        </li>
    );
}
