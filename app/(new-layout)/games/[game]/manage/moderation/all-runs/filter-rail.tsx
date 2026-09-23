'use client';

import { type ReactNode, useId, useState } from 'react';
import { formatDuration, parseDurationText } from '~src/lib/duration';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    AllRunsCounts,
    AllRunsPosition,
    AllRunsSource,
    AllRunsVerification,
} from '../../../../../../../types/all-runs.types';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import {
    type AllRunsQuery,
    oneCategory,
    withCategories,
} from './all-runs-params';
import styles from './filter-rail.module.scss';

interface Props {
    query: AllRunsQuery;
    /** null = loading. */
    counts: AllRunsCounts | null;
    /** The counts read failed for this query; the filters still work. */
    countsFailed: boolean;
    categoryGroups: CategoryGroup[];
    variables: VariableRow[];
    onChange: (next: AllRunsQuery) => void;
}

/** A category group and its searched boards; `name` null = ungrouped. */
export interface CategoryGroup {
    id: number | null;
    name: string | null;
    categories: Array<{ id: number; display: string }>;
}

export const POSITIONS: Array<{ value: AllRunsPosition; label: string }> = [
    { value: 'board', label: 'On board' },
    { value: 'beaten', label: 'Beaten' },
    { value: 'held', label: 'Held back' },
    { value: 'rejected', label: 'Rejected' },
];

export const VERIFICATIONS: Array<{
    value: AllRunsVerification;
    label: string;
}> = [
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
];

const VIDEO: Array<{ value: 'has' | 'missing'; label: string }> = [
    { value: 'has', label: 'Has video' },
    { value: 'missing', label: 'Missing' },
];

export const SOURCES: Array<{ value: AllRunsSource; label: string }> = [
    { value: 'livesplit', label: 'LiveSplit' },
    { value: 'manual', label: 'Manual' },
    { value: 'import', label: 'Imported' },
];

const toggle = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export function FilterRail({
    query,
    counts,
    countsFailed,
    categoryGroups,
    variables,
    onChange,
}: Props) {
    // Every filter change starts from the first page.
    const set = (patch: Partial<AllRunsQuery>) =>
        onChange({ ...query, ...patch, page: 1 });

    const oneCat = oneCategory(query);
    const toggleCategory = (id: number) =>
        onChange(withCategories(query, toggle(query.categoryIds, id)));
    // The group's checkbox picks all of its boards, or drops them all once
    // every one is picked.
    const toggleGroup = (ids: number[]) => {
        const all = ids.every((id) => query.categoryIds.includes(id));
        onChange(
            withCategories(
                query,
                all
                    ? query.categoryIds.filter((id) => !ids.includes(id))
                    : [...query.categoryIds, ...ids],
            ),
        );
    };
    const categoryCount = (id: number) =>
        counts ? (counts.category[id] ?? 0) : undefined;

    const categoryVars =
        oneCat == null
            ? []
            : variables
                  .filter((v) => v.published && v.categoryId === oneCat)
                  .sort(
                      (a, b) =>
                          (a.role === 'subcategory' ? 0 : 1) -
                              (b.role === 'subcategory' ? 0 : 1) ||
                          a.sortOrder - b.sortOrder,
                  );

    return (
        <div className={styles.rail}>
            {countsFailed && (
                <p className={styles.countsError} role="status">
                    {"Counts didn't load"}
                </p>
            )}
            <Section legend="Position">
                {POSITIONS.map((o) => (
                    <Option
                        key={o.value}
                        label={o.label}
                        checked={query.position.includes(o.value)}
                        count={counts?.position[o.value]}
                        onToggle={() =>
                            set({ position: toggle(query.position, o.value) })
                        }
                    />
                ))}
            </Section>

            <Section legend="Verification">
                {VERIFICATIONS.map((o) => (
                    <Option
                        key={o.value}
                        label={o.label}
                        checked={query.verification.includes(o.value)}
                        count={counts?.verification[o.value]}
                        onToggle={() =>
                            set({
                                verification: toggle(
                                    query.verification,
                                    o.value,
                                ),
                            })
                        }
                    />
                ))}
            </Section>

            {categoryGroups.length > 0 && (
                <Section legend="Category">
                    {categoryGroups.map((g) =>
                        g.name == null ? (
                            g.categories.map((c) => (
                                <Option
                                    key={c.id}
                                    label={c.display}
                                    checked={query.categoryIds.includes(c.id)}
                                    count={categoryCount(c.id)}
                                    onToggle={() => toggleCategory(c.id)}
                                />
                            ))
                        ) : (
                            <GroupDropdown
                                key={g.id}
                                name={g.name}
                                categories={g.categories}
                                picked={query.categoryIds}
                                countOf={categoryCount}
                                onToggleGroup={toggleGroup}
                                onToggleCategory={toggleCategory}
                            />
                        ),
                    )}
                </Section>
            )}

            {categoryVars.map((v) => (
                <VariableSection
                    key={v.id}
                    variable={v}
                    picked={query.vars[v.nameNormalized] ?? []}
                    counts={
                        counts ? (counts.vars[v.nameNormalized] ?? {}) : null
                    }
                    onChange={(values) =>
                        set({
                            vars: { ...query.vars, [v.nameNormalized]: values },
                        })
                    }
                />
            ))}

            <Section legend="Video">
                {VIDEO.map((o) => (
                    <Option
                        key={o.value}
                        label={o.label}
                        checked={query.video === o.value}
                        count={counts?.video[o.value]}
                        onToggle={() =>
                            set({
                                video: query.video === o.value ? null : o.value,
                            })
                        }
                    />
                ))}
            </Section>

            <Section legend="Source">
                {SOURCES.map((o) => (
                    <Option
                        key={o.value}
                        label={o.label}
                        checked={query.source.includes(o.value)}
                        count={
                            counts ? (counts.source?.[o.value] ?? 0) : undefined
                        }
                        onToggle={() =>
                            set({ source: toggle(query.source, o.value) })
                        }
                    />
                ))}
            </Section>

            {oneCat != null && (
                <fieldset className={styles.section}>
                    <legend className={styles.legend}>Time</legend>
                    <TimeInput
                        label="Faster than"
                        value={query.fasterThan}
                        onApply={(ms) => set({ fasterThan: ms })}
                    />
                    <TimeInput
                        label="Slower than"
                        value={query.slowerThan}
                        onApply={(ms) => set({ slowerThan: ms })}
                    />
                </fieldset>
            )}
        </div>
    );
}

function Section({
    legend,
    children,
}: {
    legend: string;
    children: ReactNode;
}) {
    return (
        <fieldset className={styles.section}>
            <legend className={styles.legend}>{legend}</legend>
            <div className={styles.options}>{children}</div>
        </fieldset>
    );
}

/** A category group, closed until opened or until one of its boards is
 *  picked. Its own checkbox picks or drops the whole group. */
function GroupDropdown({
    name,
    categories,
    picked,
    countOf,
    onToggleGroup,
    onToggleCategory,
}: {
    name: string;
    categories: Array<{ id: number; display: string }>;
    picked: number[];
    countOf: (id: number) => number | undefined;
    onToggleGroup: (ids: number[]) => void;
    onToggleCategory: (id: number) => void;
}) {
    const ids = categories.map((c) => c.id);
    const pickedHere = ids.filter((id) => picked.includes(id)).length;
    const [open, setOpen] = useState(pickedHere > 0);
    const listId = useId();
    const counts = ids.map(countOf);
    const total = counts.some((n) => n === undefined)
        ? undefined
        : counts.reduce<number>((sum, n) => sum + (n ?? 0), 0);
    const all = pickedHere === ids.length;
    const some = pickedHere > 0 && !all;

    return (
        <div className={styles.group}>
            <div className={styles.groupHead}>
                <label
                    className={`${styles.option} ${styles.groupOption} ${
                        all ? styles.on : some ? styles.mixed : ''
                    }`}
                >
                    <input
                        type="checkbox"
                        className={styles.input}
                        checked={all}
                        ref={(el) => {
                            if (el) el.indeterminate = some;
                        }}
                        onChange={() => onToggleGroup(ids)}
                    />
                    <span className={styles.box} aria-hidden="true" />
                    <span className={styles.label}>{name}</span>
                    <span className={styles.count}>
                        {total === undefined ? '–' : total.toLocaleString()}
                    </span>
                </label>
                <button
                    type="button"
                    className={styles.groupToggle}
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-label={open ? `Close ${name}` : `Open ${name}`}
                    onClick={() => setOpen((o) => !o)}
                >
                    <span
                        className={
                            open
                                ? `${styles.chevron} ${styles.chevronOpen}`
                                : styles.chevron
                        }
                        aria-hidden="true"
                    />
                </button>
            </div>
            {open && (
                <div id={listId} className={styles.groupList}>
                    {categories.map((c) => (
                        <Option
                            key={c.id}
                            label={c.display}
                            checked={picked.includes(c.id)}
                            count={countOf(c.id)}
                            onToggle={() => onToggleCategory(c.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function Option({
    label,
    checked,
    count,
    onToggle,
}: {
    label: string;
    checked: boolean;
    /** undefined = loading. */
    count: number | undefined;
    onToggle: () => void;
}) {
    return (
        <label
            className={
                checked ? `${styles.option} ${styles.on}` : styles.option
            }
        >
            <input
                type="checkbox"
                className={styles.input}
                checked={checked}
                onChange={onToggle}
            />
            <span className={styles.box} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
            <span className={styles.count}>
                {count === undefined ? '–' : count.toLocaleString()}
            </span>
        </label>
    );
}

function VariableSection({
    variable,
    picked,
    counts,
    onChange,
}: {
    variable: VariableRow;
    picked: string[];
    /** Sparse: a missing value is 0. null = loading. */
    counts: Record<string, number> | null;
    onChange: (values: string[]) => void;
}) {
    const options = variable.values.map((v) => ({
        label: v[0],
        value: normalizeVariableName(v[0]),
    }));
    if (variable.role === 'filter') {
        options.push({ label: 'Not set', value: '' });
    }
    // Zero-count values drop out once counts are in; a ticked one stays so
    // it can be unticked. "Not set" only shows when some run lacks the value.
    const shown = options.filter((o) => {
        if (picked.includes(o.value)) return true;
        if (!counts) return o.value !== '';
        return (counts[o.value] ?? 0) > 0;
    });
    if (shown.length === 0) return null;

    return (
        <Section legend={variable.name}>
            {shown.map((o) => (
                <Option
                    key={o.value}
                    label={o.label}
                    checked={picked.includes(o.value)}
                    count={counts ? (counts[o.value] ?? 0) : undefined}
                    onToggle={() => onChange(toggle(picked, o.value))}
                />
            ))}
        </Section>
    );
}

function TimeInput({
    label,
    value,
    onApply,
}: {
    label: string;
    value: number | null;
    onApply: (ms: number | null) => void;
}) {
    const id = useId();
    const shown = value == null ? '' : formatDuration(value);
    const [draft, setDraft] = useState(shown);
    const [synced, setSynced] = useState(value);
    const [invalid, setInvalid] = useState(false);
    // The query can change under the input (category switch, chip removal).
    if (synced !== value) {
        setSynced(value);
        setDraft(shown);
        setInvalid(false);
    }

    const apply = () => {
        if (draft.trim() === '') {
            setInvalid(false);
            if (value != null) onApply(null);
            return;
        }
        const ms = parseDurationText(draft);
        if (ms === undefined) {
            setInvalid(true);
            return;
        }
        setInvalid(false);
        if (ms !== value) onApply(ms);
        else setDraft(shown);
    };

    return (
        <div className={styles.timeField}>
            <label htmlFor={id} className={styles.timeLabel}>
                {label}
            </label>
            <input
                id={id}
                type="text"
                inputMode="decimal"
                className={styles.timeInput}
                placeholder="h:mm:ss"
                value={draft}
                aria-invalid={invalid || undefined}
                onChange={(e) => {
                    setDraft(e.target.value);
                    setInvalid(false);
                }}
                onBlur={apply}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        apply();
                    }
                }}
            />
        </div>
    );
}
