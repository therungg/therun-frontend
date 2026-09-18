'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useState, useTransition } from 'react';
import {
    CaretDownFill,
    CaretUpFill,
    GripVertical,
    Plus,
} from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { sectionsFor } from '~src/lib/console/category-sections';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { formatPlaytime } from '~src/lib/setup/board-pulse';
import {
    boardsOfKind,
    fromRunsPool,
    type WorkspaceKind,
} from '~src/lib/setup/workspace';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { fireUndoToast } from '../../manage/moderation/shared/undo-toast';
import { updateVisibilityAction } from '../../manage/visibility/actions/update-visibility.action';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { archiveCategoryAction } from '../actions/archive-category.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import { buildCategorySeed } from '../steps/category-seed';
import { CreateCategoryDialog } from '../steps/create-category-dialog';
import styles from './board-list.module.scss';
import { FromRunsPanel } from './from-runs-panel';
import { useBoardPatches } from './use-board-patches';

export interface BoardListProps {
    kind: WorkspaceKind;
    game: ResolvedGame;
    /** Every category the game has; the list slices it by kind. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    /** Game defaults seeded onto a category as it joins the board. Null for a
     *  viewer whose console did not load them. */
    metadata: GameMetadata | null;
}

/**
 * What is on the board: one table for either kind. Categories come on from the
 * From runs panel or New category and come off with Remove (back to From
 * runs). Levels are only ever typed in, and Archive is how one leaves.
 */
export function BoardList({
    kind,
    game,
    categories,
    groups,
    metadata,
}: BoardListProps) {
    const router = useRouter();
    const { apply, patch, reorder, reorderPending } = useBoardPatches(game);
    const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
    const [, startWrite] = useTransition();
    const [dragId, setDragId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [archiving, setArchiving] = useState<ResolvedCategory | null>(null);
    const [archiveError, setArchiveError] = useState<string | null>(null);
    const [archivePending, startArchive] = useTransition();
    // Rows put on the board during this visit, badged "new".
    const [addedIds, setAddedIds] = useState<ReadonlySet<number>>(new Set());
    const markAdded = (id: number, added: boolean) =>
        setAddedIds((prev) => {
            const next = new Set(prev);
            if (added) next.add(id);
            else next.delete(id);
            return next;
        });

    const patched = apply(categories);
    const boards = boardsOfKind(patched, groups, kind);
    const pool = kind === 'categories' ? fromRunsPool(patched, groups) : [];
    const sections =
        kind === 'categories'
            ? sectionsFor(
                  boards,
                  groups.filter((g) => g.kind !== 'level'),
              ).filter((s) => s.items.length > 0)
            : [{ id: null, name: null, items: boards }];
    const grouped = sections.length > 1;
    const maxRunners = Math.max(1, ...boards.map((c) => c.uniqueRunners ?? 0));
    const seed = metadata ? buildCategorySeed(metadata) : null;

    const setBusy = (id: number, busy: boolean) =>
        setBusyIds((prev) => {
            const next = new Set(prev);
            if (busy) next.add(id);
            else next.delete(id);
            return next;
        });

    const feature = (category: ResolvedCategory) => {
        patch(category.id, { isMain: true });
        markAdded(category.id, true);
        setBusy(category.id, true);
        startWrite(async () => {
            const res = await curateCategoryAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: category.id,
                isMain: true,
                ...(seed ? { seed } : {}),
            });
            setBusy(category.id, false);
            if ('error' in res) {
                toast.error(res.error);
                patch(category.id, { isMain: false });
                markAdded(category.id, false);
                return;
            }
            router.refresh();
        });
    };

    const setFeatured = (categoryId: number, isMain: boolean) =>
        updateVisibilityAction({
            gameSlug: game.name,
            gameId: game.id,
            categoryId,
            isMain,
        });

    const unfeature = (category: ResolvedCategory) => {
        patch(category.id, { isMain: false });
        setBusy(category.id, true);
        startWrite(async () => {
            const res = await setFeatured(category.id, false);
            setBusy(category.id, false);
            if ('error' in res) {
                toast.error(res.error);
                patch(category.id, { isMain: true });
                return;
            }
            router.refresh();
            fireUndoToast(
                `${category.display} removed from the board.`,
                async () => {
                    const undo = await setFeatured(category.id, true);
                    if ('error' in undo) return { error: undo.error };
                    return { ok: true };
                },
                () => {
                    patch(category.id, { isMain: true });
                    router.refresh();
                },
            );
        });
    };

    const requestRemove = (category: ResolvedCategory) => {
        if (kind === 'categories') {
            unfeature(category);
            return;
        }
        setArchiveError(null);
        setArchiving(category);
    };

    const confirmArchive = () => {
        const level = archiving;
        if (!level) return;
        setArchiveError(null);
        startArchive(async () => {
            const res = await archiveCategoryAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryId: level.id,
            });
            if ('error' in res) {
                setArchiveError(res.error);
                return;
            }
            patch(level.id, { archived: true });
            setArchiving(null);
            toast.success(`${level.display} archived.`);
            router.refresh();
        });
    };

    const dropOn = (scope: ResolvedCategory[], overId: number) => {
        const dragged = dragId;
        setDragId(null);
        if (dragged === null || dragged === overId) return;
        // Order is per section; a drop from another section is ignored.
        if (!scope.some((c) => c.id === dragged)) return;
        reorder(
            scope,
            dragged,
            scope.findIndex((c) => c.id === overId),
        );
    };

    const noun = kind === 'categories' ? 'category' : 'level';
    const countLabel = `${boards.length.toLocaleString()} ${
        boards.length === 1
            ? noun
            : kind === 'categories'
              ? 'categories'
              : 'levels'
    }`;

    return (
        <div className={styles.wrap}>
            {kind === 'categories' && (
                <FromRunsPanel
                    pool={pool}
                    busyIds={busyIds}
                    onFeature={feature}
                />
            )}

            <div className={styles.panel}>
                <div className={styles.head}>
                    <div className={styles.panelHead}>
                        <h3 className={styles.panelTitle}>On the board</h3>
                        <span className={styles.panelHint}>
                            {countLabel} · drag to reorder
                        </span>
                    </div>
                    <button
                        type="button"
                        className={styles.newAction}
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus size={14} aria-hidden />
                        New {noun}
                    </button>
                </div>

                {boards.length === 0 ? (
                    <p className={styles.empty}>
                        {kind === 'categories'
                            ? 'Nothing on the board yet. Add a category from runs, or make a new one.'
                            : 'No levels yet. The first level adds a Levels dropdown to the board.'}
                    </p>
                ) : (
                    <div className={styles.scroller}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th
                                        className={styles.colOrder}
                                        aria-label="Order"
                                    />
                                    <th>
                                        {kind === 'categories'
                                            ? 'Category'
                                            : 'Level'}
                                    </th>
                                    <th className={styles.colActivity}>
                                        Activity
                                    </th>
                                    <th className={styles.num}>Runners</th>
                                    <th className={styles.num}>
                                        Finished runs
                                    </th>
                                    <th className={styles.num}>Playtime</th>
                                    <th
                                        className={styles.colActions}
                                        aria-label="Actions"
                                    />
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map((section, sectionIdx) => (
                                    <Fragment
                                        key={
                                            section.id ??
                                            `ungrouped-${sectionIdx}`
                                        }
                                    >
                                        {grouped && (
                                            <tr className={styles.groupRow}>
                                                <th
                                                    colSpan={7}
                                                    scope="colgroup"
                                                >
                                                    {section.name ??
                                                        'Ungrouped'}
                                                </th>
                                            </tr>
                                        )}
                                        {section.items.map((c, i) => (
                                            <tr
                                                key={c.id}
                                                className={
                                                    dragId === c.id
                                                        ? styles.rowDragging
                                                        : undefined
                                                }
                                                onDragOver={(e) =>
                                                    e.preventDefault()
                                                }
                                                onDrop={() =>
                                                    dropOn(section.items, c.id)
                                                }
                                            >
                                                <td className={styles.colOrder}>
                                                    <span
                                                        className={styles.order}
                                                    >
                                                        <span
                                                            className={
                                                                styles.grip
                                                            }
                                                            draggable={
                                                                !reorderPending
                                                            }
                                                            onDragStart={() =>
                                                                setDragId(c.id)
                                                            }
                                                            onDragEnd={() =>
                                                                setDragId(null)
                                                            }
                                                            title="Drag to reorder"
                                                            aria-hidden="true"
                                                        >
                                                            <GripVertical
                                                                size={14}
                                                            />
                                                        </span>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.orderBtn
                                                            }
                                                            disabled={
                                                                reorderPending ||
                                                                i === 0
                                                            }
                                                            onClick={() =>
                                                                reorder(
                                                                    section.items,
                                                                    c.id,
                                                                    i - 1,
                                                                )
                                                            }
                                                            aria-label={`Move ${c.display} up`}
                                                        >
                                                            <CaretUpFill
                                                                size={9}
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={
                                                                styles.orderBtn
                                                            }
                                                            disabled={
                                                                reorderPending ||
                                                                i ===
                                                                    section
                                                                        .items
                                                                        .length -
                                                                        1
                                                            }
                                                            onClick={() =>
                                                                reorder(
                                                                    section.items,
                                                                    c.id,
                                                                    i + 1,
                                                                )
                                                            }
                                                            aria-label={`Move ${c.display} down`}
                                                        >
                                                            <CaretDownFill
                                                                size={9}
                                                            />
                                                        </button>
                                                    </span>
                                                </td>
                                                <td className={styles.name}>
                                                    {c.display}
                                                    {addedIds.has(c.id) && (
                                                        <span
                                                            className={
                                                                styles.newBadge
                                                            }
                                                        >
                                                            new
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className={
                                                        styles.colActivity
                                                    }
                                                >
                                                    <div
                                                        className={
                                                            styles.activityBar
                                                        }
                                                    >
                                                        <div
                                                            className={
                                                                styles.activityFill
                                                            }
                                                            style={{
                                                                width: `${activityPercent(
                                                                    c.uniqueRunners ??
                                                                        0,
                                                                    maxRunners,
                                                                )}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className={styles.num}>
                                                    {(
                                                        c.uniqueRunners ?? 0
                                                    ).toLocaleString()}
                                                </td>
                                                <td className={styles.num}>
                                                    {(
                                                        c.totalFinishedAttemptCount ??
                                                        0
                                                    ).toLocaleString()}
                                                </td>
                                                <td className={styles.num}>
                                                    {playtimeLabel(
                                                        c.totalRunTime ?? 0,
                                                    )}
                                                </td>
                                                <td
                                                    className={
                                                        styles.colActions
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        className={
                                                            styles.removeAction
                                                        }
                                                        disabled={busyIds.has(
                                                            c.id,
                                                        )}
                                                        onClick={() =>
                                                            requestRemove(c)
                                                        }
                                                        title={
                                                            kind ===
                                                            'categories'
                                                                ? 'Takes this category off the board. Runs are kept.'
                                                                : 'Archives this level. Runs are kept.'
                                                        }
                                                    >
                                                        {kind === 'categories'
                                                            ? 'Remove'
                                                            : 'Archive'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <CreateCategoryDialog
                kind={kind}
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                game={game}
                metadata={metadata}
                existingNames={categories.map((c) => c.display)}
                onCreated={(created, warning) => {
                    markAdded(created.id, true);
                    if (warning) toast.warning(warning);
                    router.refresh();
                }}
            />

            <ConfirmDialog
                open={archiving !== null}
                onClose={() => setArchiving(null)}
                onConfirm={confirmArchive}
                labelledBy="archive-level-title"
                title="Archive level?"
                message={
                    archiving
                        ? `${archiving.display} leaves the board and the Levels dropdown. Its runs are kept.`
                        : ''
                }
                confirmLabel="Archive level"
                pending={archivePending}
                error={archiveError}
            />
        </div>
    );
}

/** Share of the busiest row; a row with no runners shows only the track. */
function activityPercent(runners: number, maxRunners: number): number {
    if (runners <= 0) return 0;
    return Math.max(2, Math.round((runners / maxRunners) * 100));
}

/** Compact hours, same vocabulary as the wizard header's playtime stat. */
function playtimeLabel(ms: number): string {
    const hours = formatPlaytime(ms);
    return hours ? `${hours} h` : '—';
}
