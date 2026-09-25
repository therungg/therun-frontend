'use client';

import type { AllRunsSource } from '../../../../../../../types/all-runs.types';
import type { VariableRow } from '../../../../../../../types/leaderboards.types';
import type {
    QueueRan,
    QueueReason,
    WorklistFacets,
} from '../../../../../../../types/worklist.types';
import {
    type CategoryGroup,
    GroupDropdown,
    Option,
    railClass,
    Section,
    toggle,
    VariableSection,
} from '../shared/filter-rail-parts';
import {
    oneQueueCategory,
    type QueueQuery,
    withCategories,
} from './queue-params';

interface Props {
    query: QueueQuery;
    /** null = loading; options show "–" while this is null. */
    facets: WorklistFacets | null;
    categoryGroups: CategoryGroup[];
    variables: VariableRow[];
    onChange: (next: QueueQuery) => void;
}

const PLACINGS: Array<{ value: 1 | 3 | 10; label: string }> = [
    { value: 1, label: 'Top 1' },
    { value: 3, label: 'Top 3' },
    { value: 10, label: 'Top 10' },
];

const RAN: Array<{ value: QueueRan; label: string }> = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'older30d', label: 'Older than 30 days' },
];

const VIDEO: Array<{ value: 'has' | 'missing'; label: string }> = [
    { value: 'has', label: 'Has video' },
    { value: 'missing', label: 'Missing' },
];

const SOURCES: Array<{ value: AllRunsSource; label: string }> = [
    { value: 'livesplit', label: 'LiveSplit' },
    { value: 'manual', label: 'Manual' },
    { value: 'import', label: 'Imported' },
];

const REASONS: Array<{ value: QueueReason; label: string }> = [
    { value: 'reported', label: 'Reported' },
    { value: 'appeal', label: 'Appeal' },
    { value: 'claim', label: 'Typed-in time' },
    { value: 'missing_video', label: 'Missing video' },
    { value: 'checks', label: 'Checks' },
    { value: 'pending', label: 'Nothing flagged' },
];

export function QueueFilterRail({
    query,
    facets,
    categoryGroups,
    variables,
    onChange,
}: Props) {
    // Every filter change starts from the first page.
    const set = (patch: Partial<QueueQuery>) =>
        onChange({ ...query, ...patch, page: 1 });

    // While facets are loading, nothing is hidden and counts show "–". Once
    // loaded, a zero-count option drops out unless it's the one that's
    // picked — same rule as the All runs rail, applied to every section.
    const show = (count: number | undefined, picked: boolean) =>
        facets === null || picked || (count ?? 0) > 0;

    const oneCat = oneQueueCategory(query);
    const toggleCategory = (id: number) =>
        onChange(withCategories(query, toggle(query.categoryIds, id)));
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
        facets ? (facets.category[id] ?? 0) : undefined;

    const shownGroups = categoryGroups
        .map((g) => ({
            ...g,
            categories: g.categories.filter((c) =>
                show(categoryCount(c.id), query.categoryIds.includes(c.id)),
            ),
        }))
        .filter((g) => g.categories.length > 0);

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

    const placingCount = (v: 1 | 3 | 10) =>
        facets?.placing[String(v) as '1' | '3' | '10'];
    const shownPlacings = PLACINGS.filter((o) =>
        show(placingCount(o.value), query.maxRank === o.value),
    );
    const shownRan = RAN.filter((o) =>
        show(facets?.ran[o.value], query.ran === o.value),
    );
    const shownVideo = VIDEO.filter((o) =>
        show(facets?.video[o.value], query.video === o.value),
    );
    const shownSources = SOURCES.filter((o) =>
        show(facets?.source[o.value], query.source.includes(o.value)),
    );
    const shownReasons = REASONS.filter((o) =>
        show(facets?.reason[o.value], query.reason.includes(o.value)),
    );
    const showRunner = show(facets?.newRunner, query.newRunner);

    return (
        <div className={railClass}>
            {shownGroups.length > 0 && (
                <Section legend="Category">
                    {shownGroups.map((g) =>
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
                        facets ? (facets.vars[v.nameNormalized] ?? {}) : null
                    }
                    onChange={(values) =>
                        set({
                            vars: {
                                ...query.vars,
                                [v.nameNormalized]: values,
                            },
                        })
                    }
                />
            ))}

            {shownPlacings.length > 0 && (
                <Section legend="Placing">
                    {shownPlacings.map((o) => (
                        <Option
                            key={o.value}
                            label={o.label}
                            checked={query.maxRank === o.value}
                            count={placingCount(o.value)}
                            onToggle={() =>
                                set({
                                    maxRank:
                                        query.maxRank === o.value
                                            ? null
                                            : o.value,
                                })
                            }
                        />
                    ))}
                </Section>
            )}

            {shownRan.length > 0 && (
                <Section legend="Run date">
                    {shownRan.map((o) => (
                        <Option
                            key={o.value}
                            label={o.label}
                            checked={query.ran === o.value}
                            count={facets?.ran[o.value]}
                            onToggle={() =>
                                set({
                                    ran: query.ran === o.value ? null : o.value,
                                })
                            }
                        />
                    ))}
                </Section>
            )}

            {shownVideo.length > 0 && (
                <Section legend="Video">
                    {shownVideo.map((o) => (
                        <Option
                            key={o.value}
                            label={o.label}
                            checked={query.video === o.value}
                            count={facets?.video[o.value]}
                            onToggle={() =>
                                set({
                                    video:
                                        query.video === o.value
                                            ? null
                                            : o.value,
                                })
                            }
                        />
                    ))}
                </Section>
            )}

            {shownSources.length > 0 && (
                <Section legend="Source">
                    {shownSources.map((o) => (
                        <Option
                            key={o.value}
                            label={o.label}
                            checked={query.source.includes(o.value)}
                            count={facets?.source[o.value]}
                            onToggle={() =>
                                set({ source: toggle(query.source, o.value) })
                            }
                        />
                    ))}
                </Section>
            )}

            {shownReasons.length > 0 && (
                <Section legend="Reason">
                    {shownReasons.map((o) => (
                        <Option
                            key={o.value}
                            label={o.label}
                            checked={query.reason.includes(o.value)}
                            count={facets?.reason[o.value]}
                            onToggle={() =>
                                set({ reason: toggle(query.reason, o.value) })
                            }
                        />
                    ))}
                </Section>
            )}

            {showRunner && (
                <Section legend="Runner">
                    <Option
                        label="New runners only"
                        checked={query.newRunner}
                        count={facets?.newRunner}
                        onToggle={() => set({ newRunner: !query.newRunner })}
                    />
                </Section>
            )}
        </div>
    );
}
