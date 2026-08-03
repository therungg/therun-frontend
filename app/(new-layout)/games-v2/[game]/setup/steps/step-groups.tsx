'use client';

import { useMemo, useState, useTransition } from 'react';
import { ArrowDownShort, ArrowUpShort } from 'react-bootstrap-icons';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { curateCategoryAction } from '../actions/curate-category.action';
import styles from '../setup.module.scss';
import type { StepProps } from '../types';
import { CategoryBandPreview } from './category-band-preview';
import { GroupBuilder } from './group-builder';
import { computeGroupSaveChanges, moveWithinScope } from './group-order';
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
    // Draft board order for every featured category — one global list, each
    // column reads its members out of it. Nudges edit this locally; the save
    // pass writes it (only if touched) together with the assignments, so the
    // step stays a single-save surface.
    const [orderedIds, setOrderedIds] = useState<number[]>(() =>
        [...mains].sort(compareByBoardOrder).map((c) => c.id),
    );
    const [orderDirty, setOrderDirty] = useState(false);
    const byId = useMemo(() => new Map(mains.map((c) => [c.id, c])), [mains]);
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

    // Which categories land in which column of the board below, in draft
    // order — orderedIds is the single source of row order.
    const columns = useMemo(() => {
        const ordered = orderedIds
            .map((id) => byId.get(id))
            .filter((c): c is ResolvedCategory => c != null);
        const buckets = groups.map((g) => ({
            group: g as ResolvedGroup | null,
            categories: ordered.filter((c) => assignments.get(c.id) === g.id),
        }));
        buckets.push({
            group: null,
            categories: ordered.filter(
                (c) => (assignments.get(c.id) ?? null) === null,
            ),
        });
        return buckets;
    }, [groups, byId, orderedIds, assignments]);

    // The preview must render the DRAFT order, so each category gets its
    // draft column position as sortOrder (1..N per column) — the same
    // numbers the save pass would write.
    const previewCategories = useMemo<ResolvedCategory[]>(() => {
        const draftSort = new Map<number, number>();
        if (layout === 'grouped') {
            for (const col of columns) {
                col.categories.forEach((c, i) => draftSort.set(c.id, i + 1));
            }
        } else {
            // Flat layout is one scope: number by global draft position.
            orderedIds.forEach((id, i) => draftSort.set(id, i + 1));
        }
        return orderedIds
            .map((id) => byId.get(id))
            .filter((c): c is ResolvedCategory => c != null)
            .map((c) => ({
                ...c,
                groupId: groupIdOf(c.id),
                sortOrder: draftSort.get(c.id) ?? 0,
            }));
        // groupIdOf closes over assignments+layout, and both drive the result.
    }, [columns, orderedIds, byId, assignments, layout]);

    const ungroupedCount = columns[columns.length - 1].categories.length;
    const groupingOk =
        layout === 'flat' || groups.length <= 1 || ungroupedCount === 0;

    if (mains.length === 0) {
        return (
            <section>
                <StepHeader step="groups" title="Nothing to group yet" />
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

    const nudge = (columnIds: number[], id: number, dir: -1 | 1) => {
        setOrderedIds((prev) => {
            const next = moveWithinScope(prev, new Set(columnIds), id, dir);
            if (next !== prev) setOrderDirty(true);
            return next;
        });
    };

    const save = () => {
        startSaving(async () => {
            setRowErrors(new Map());
            // Final columns under the chosen layout: flat collapses
            // everything into the single ungrouped scope.
            const finalColumns =
                layout === 'grouped'
                    ? columns.map((col) => ({
                          groupId: col.group?.id ?? null,
                          ids: col.categories.map((c) => c.id),
                      }))
                    : [
                          {
                              groupId: null,
                              ids: orderedIds.filter((id) => byId.has(id)),
                          },
                      ];
            const changes = computeGroupSaveChanges({
                mains: mains.map((c) => ({
                    id: c.id,
                    groupId: c.groupId ?? null,
                    sortOrder: c.sortOrder,
                })),
                columns: finalColumns,
                writeOrder: orderDirty,
            });
            const failures = new Map<number, string>();
            for (let i = 0; i < changes.length; i++) {
                const change = changes[i];
                setProgress(`Saving ${i + 1} / ${changes.length}…`);
                const res = await curateCategoryAction({
                    gameSlug: data.game.name,
                    gameId: data.game.id,
                    categoryId: change.id,
                    ...(change.groupId !== undefined
                        ? { groupId: change.groupId }
                        : {}),
                    ...(change.sortOrder !== undefined
                        ? { sortOrder: change.sortOrder }
                        : {}),
                });
                if ('error' in res) failures.set(change.id, res.error);
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
                                                    {col.categories.length >
                                                        1 && (
                                                        <span
                                                            className={
                                                                styles.nudgeGroup
                                                            }
                                                        >
                                                            <button
                                                                type="button"
                                                                className={
                                                                    styles.nudgeBtn
                                                                }
                                                                aria-label={`Move ${c.display} up`}
                                                                disabled={
                                                                    isSaving ||
                                                                    col
                                                                        .categories[0]
                                                                        .id ===
                                                                        c.id
                                                                }
                                                                onClick={() =>
                                                                    nudge(
                                                                        col.categories.map(
                                                                            (
                                                                                x,
                                                                            ) =>
                                                                                x.id,
                                                                        ),
                                                                        c.id,
                                                                        -1,
                                                                    )
                                                                }
                                                            >
                                                                <ArrowUpShort
                                                                    size={18}
                                                                    aria-hidden
                                                                />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className={
                                                                    styles.nudgeBtn
                                                                }
                                                                aria-label={`Move ${c.display} down`}
                                                                disabled={
                                                                    isSaving ||
                                                                    col
                                                                        .categories[
                                                                        col
                                                                            .categories
                                                                            .length -
                                                                            1
                                                                    ].id ===
                                                                        c.id
                                                                }
                                                                onClick={() =>
                                                                    nudge(
                                                                        col.categories.map(
                                                                            (
                                                                                x,
                                                                            ) =>
                                                                                x.id,
                                                                        ),
                                                                        c.id,
                                                                        1,
                                                                    )
                                                                }
                                                            >
                                                                <ArrowDownShort
                                                                    size={18}
                                                                    aria-hidden
                                                                />
                                                            </button>
                                                        </span>
                                                    )}
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
