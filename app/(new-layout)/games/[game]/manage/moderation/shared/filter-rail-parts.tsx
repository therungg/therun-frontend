'use client';

import { type ReactNode, useId, useState } from 'react';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import styles from './filter-rail-parts.module.scss';

export const railClass = styles.rail;
export const railStyles = styles;

/** A category group and its searched boards; `name` null = ungrouped. */
export interface CategoryGroup {
    id: number | null;
    name: string | null;
    categories: Array<{ id: number; display: string }>;
}

export const toggle = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export function Section({
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
export function GroupDropdown({
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

export function Option({
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
            className={[
                styles.option,
                checked ? styles.on : '',
                count === 0 ? styles.empty : '',
            ].join(' ')}
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

export function VariableSection({
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
