'use client';

import { useId, useState } from 'react';
import { formatDuration, parseDurationText } from '~src/lib/duration';
import type {
    AllRunsCounts,
    AllRunsPosition,
    AllRunsSource,
    AllRunsVerification,
} from '../../../../../../../types/all-runs.types';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import {
    type CategoryGroup,
    GroupDropdown,
    Option,
    railStyles,
    Section,
    toggle,
    VariableSection,
} from '../shared/filter-rail-parts';
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
    { value: 'rejected', label: 'Rejected' },
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
        <div className={railStyles.rail}>
            {countsFailed && (
                <p className={railStyles.countsError} role="status">
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
                <fieldset className={railStyles.section}>
                    <legend className={railStyles.legend}>Time</legend>
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
