'use client';

import { useMemo, useState, useTransition } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { CategoryBandPreview } from './category-band-preview';
import { GroupBuilder } from './group-builder';
import { StepHeader } from './step-header';

type Layout = 'flat' | 'grouped';

const UNGROUPED = 'ungrouped';

export function StepGroups({ data, onAdvance }: StepProps) {
    // Only what step 2 chose to show. Grouping a hidden category would be
    // filing something nobody can see.
    const mains = useMemo(
        () => data.categories.filter((c) => !c.archived && (c.isMain ?? false)),
        [data.categories],
    );

    const [assignments, setAssignments] = useState<Map<number, number | null>>(
        () => new Map(mains.map((c) => [c.id, c.groupId ?? null])),
    );
    const [groups, setGroups] = useState<ResolvedGroup[]>(data.groups);
    const [layout, setLayout] = useState<Layout>(
        data.groups.length > 0 ? 'grouped' : 'flat',
    );
    const [rowErrors, setRowErrors] = useState<Map<number, string>>(new Map());
    const [progress, setProgress] = useState<string | null>(null);
    const [isSaving, startSaving] = useTransition();

    const groupIdOf = (id: number): number | null =>
        layout === 'grouped' ? (assignments.get(id) ?? null) : null;

    const assign = (categoryId: number, groupId: number | null) =>
        setAssignments((prev) => {
            const next = new Map(prev);
            next.set(categoryId, groupId);
            return next;
        });

    const releaseGroup = (groupId: number) =>
        setAssignments((prev) => {
            const next = new Map(prev);
            for (const [catId, gid] of next) {
                if (gid === groupId) next.set(catId, null);
            }
            return next;
        });

    const countByGroupId = useMemo(() => {
        const m = new Map<number, number>();
        for (const c of mains) {
            const gid = assignments.get(c.id) ?? null;
            if (gid != null) m.set(gid, (m.get(gid) ?? 0) + 1);
        }
        return m;
    }, [mains, assignments]);

    const previewCategories = useMemo<ResolvedCategory[]>(
        () => mains.map((c) => ({ ...c, groupId: groupIdOf(c.id) })),
        // groupIdOf closes over both, and both drive the result.
        [mains, assignments, layout],
    );

    // Which categories land in which column of the board below.
    const columns = useMemo(() => {
        const buckets = groups.map((g) => ({
            group: g as ResolvedGroup | null,
            categories: mains.filter((c) => assignments.get(c.id) === g.id),
        }));
        buckets.push({
            group: null,
            categories: mains.filter(
                (c) => (assignments.get(c.id) ?? null) === null,
            ),
        });
        return buckets;
    }, [groups, mains, assignments]);

    const ungroupedCount = columns[columns.length - 1].categories.length;
    const groupingOk =
        layout === 'flat' || groups.length <= 1 || ungroupedCount === 0;

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader
                    step="groups"
                    title="Nothing to group yet"
                    lede="Groups organise the categories you show on the board. Pick some in the previous step and this one has something to work with."
                />
                <button
                    type="button"
                    className={styles.primaryAction}
                    onClick={onAdvance}
                >
                    Continue
                </button>
            </section>
        );
    }

    const save = () => {
        startSaving(async () => {
            setRowErrors(new Map());
            const changed = mains.filter(
                (c) => (c.groupId ?? null) !== groupIdOf(c.id),
            );
            const failures = new Map<number, string>();
            for (let i = 0; i < changed.length; i++) {
                const c = changed[i];
                setProgress(`Saving ${i + 1} / ${changed.length}…`);
                const res = await curateCategoryAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: c.id,
                    groupId: groupIdOf(c.id),
                });
                if ('error' in res) failures.set(c.id, res.error);
            }
            setProgress(null);
            setRowErrors(failures);
            if (failures.size === 0) onAdvance();
        });
    };

    return (
        <section>
            <StepHeader
                step="groups"
                title="Do these categories belong in groups?"
                lede={`You're showing ${mains.length} categor${
                    mains.length === 1 ? 'y' : 'ies'
                }. Groups split them into labeled sections on the game page — Category Extensions as its own block, or one section per version of the game. Most boards don't need any.`}
            />

            <div
                className={styles.segmented}
                role="radiogroup"
                aria-label="Category layout"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={layout === 'flat'}
                    className={
                        layout === 'flat' ? styles.segmentActive : undefined
                    }
                    onClick={() => setLayout('flat')}
                >
                    One flat list
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={layout === 'grouped'}
                    className={
                        layout === 'grouped' ? styles.segmentActive : undefined
                    }
                    onClick={() => setLayout('grouped')}
                >
                    Grouped
                </button>
            </div>

            <CategoryBandPreview
                categories={previewCategories}
                groups={layout === 'grouped' ? groups : []}
                variables={data.variables}
            />

            {layout === 'grouped' && (
                <>
                    <div className={styles.section}>
                        <h3 className="h6">Your groups</h3>
                        <GroupBuilder
                            game={data.game}
                            groups={groups}
                            countByGroupId={countByGroupId}
                            onGroupsChange={setGroups}
                            onGroupDeleted={releaseGroup}
                        />
                    </div>

                    {groups.length > 0 && (
                        <div className={styles.board}>
                            {columns.map((col) => (
                                <div
                                    key={col.group?.id ?? UNGROUPED}
                                    className={styles.boardColumn}
                                >
                                    <div className={styles.boardColumnHead}>
                                        <span
                                            className={styles.boardColumnName}
                                        >
                                            {col.group?.name ??
                                                'Not in a group'}
                                        </span>
                                        <span
                                            className={styles.boardColumnCount}
                                        >
                                            {col.categories.length}
                                        </span>
                                    </div>
                                    {col.group?.hiddenByDefault && (
                                        <p className={styles.previewNote}>
                                            Collapsed by default
                                        </p>
                                    )}
                                    {col.categories.length === 0 ? (
                                        <p
                                            className={`${styles.previewNote} mb-0`}
                                        >
                                            {col.group
                                                ? 'Empty — this group won’t appear.'
                                                : 'Everything is filed.'}
                                        </p>
                                    ) : (
                                        <ul className={styles.rows}>
                                            {col.categories.map((c) => (
                                                <li
                                                    key={c.id}
                                                    className={styles.rowItem}
                                                >
                                                    <span>{c.display}</span>
                                                    <span
                                                        className={
                                                            styles.spacer
                                                        }
                                                    />
                                                    <select
                                                        className="form-select form-select-sm w-auto"
                                                        aria-label={`Group for ${c.display}`}
                                                        value={
                                                            assignments.get(
                                                                c.id,
                                                            ) ?? ''
                                                        }
                                                        onChange={(e) =>
                                                            assign(
                                                                c.id,
                                                                e.target.value
                                                                    ? Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      )
                                                                    : null,
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            Not in a group
                                                        </option>
                                                        {groups.map((g) => (
                                                            <option
                                                                key={g.id}
                                                                value={g.id}
                                                            >
                                                                {g.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {rowErrors.has(c.id) && (
                                                        <span
                                                            className={`${styles.textDanger} small`}
                                                        >
                                                            {rowErrors.get(
                                                                c.id,
                                                            )}
                                                        </span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {!groupingOk && (
                <div className={`${styles.warnNote} mt-2`}>
                    {ungroupedCount}{' '}
                    {ungroupedCount === 1 ? 'category is' : 'categories are'}{' '}
                    not in a group. With more than one group, everything you
                    show has to be filed — put{' '}
                    {ungroupedCount === 1 ? 'it' : 'them'} in a group, or delete
                    a group so there’s only one.
                </div>
            )}
            {progress && <div className="text-muted small">{progress}</div>}
            <button
                type="button"
                className={`${styles.primaryAction} mt-2`}
                disabled={isSaving || !groupingOk}
                onClick={save}
            >
                {isSaving ? 'Saving…' : 'Save & continue'}
            </button>
        </section>
    );
}
