'use client';

import { type ReactNode, useId, useState } from 'react';
import { formatDuration, parseDurationText } from '~src/lib/duration';
import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    AllRunsCounts,
    AllRunsPosition,
    AllRunsVerification,
} from '../../../../../../../types/all-runs.types';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type { AllRunsQuery, Arrived } from './all-runs-params';
import styles from './filter-rail.module.scss';

interface Props {
    query: AllRunsQuery;
    /** null = loading. */
    counts: AllRunsCounts | null;
    categories: Array<{ id: number; display: string }>;
    variables: VariableRow[];
    onChange: (next: AllRunsQuery) => void;
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

export const ARRIVED: Array<{ value: Arrived | ''; label: string }> = [
    { value: '', label: 'Any time' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
];

const toggle = <T,>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

export function FilterRail({
    query,
    counts,
    categories,
    variables,
    onChange,
}: Props) {
    const arrivedId = useId();
    // Every filter change starts from the first page.
    const set = (patch: Partial<AllRunsQuery>) =>
        onChange({ ...query, ...patch, page: 1 });

    const pickCategory = (id: number) => {
        const next = query.categoryId === id ? null : id;
        set({
            categoryId: next,
            vars: {},
            fasterThan: null,
            slowerThan: null,
            sort: query.sort === 'time' ? 'arrived' : query.sort,
        });
    };

    const categoryVars =
        query.categoryId == null
            ? []
            : variables
                  .filter(
                      (v) => v.published && v.categoryId === query.categoryId,
                  )
                  .sort(
                      (a, b) =>
                          (a.role === 'subcategory' ? 0 : 1) -
                              (b.role === 'subcategory' ? 0 : 1) ||
                          a.sortOrder - b.sortOrder,
                  );

    return (
        <div className={styles.rail}>
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

            {categories.length > 0 && (
                <Section legend="Category">
                    {categories.map((c) => (
                        <Option
                            key={c.id}
                            label={c.display}
                            checked={query.categoryId === c.id}
                            count={
                                counts
                                    ? (counts.category[c.id] ?? 0)
                                    : undefined
                            }
                            onToggle={() => pickCategory(c.id)}
                        />
                    ))}
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

            <div className={styles.section}>
                <label htmlFor={arrivedId} className={styles.legend}>
                    Arrived
                </label>
                <select
                    id={arrivedId}
                    className={styles.select}
                    value={query.arrived ?? ''}
                    onChange={(e) =>
                        set({
                            arrived: (e.target.value || null) as Arrived | null,
                        })
                    }
                >
                    {ARRIVED.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {query.categoryId != null && (
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
