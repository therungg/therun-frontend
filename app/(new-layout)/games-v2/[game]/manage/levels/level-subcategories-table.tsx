'use client';

import { useState, useTransition } from 'react';
import { Diagram3, Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { archiveLevelTemplateAction } from '~src/actions/levels/archive-level-template.action';
import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import { renameLevelTemplateAction } from '~src/actions/levels/rename-level-template.action';
import type {
    LevelOverview,
    LevelTemplate,
} from '../../../../../../types/levels.types';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { PromptDialog } from '../../shared/prompt-dialog';
import styles from './levels.module.scss';

interface Props {
    gameSlug: string;
    gameId: number;
    overview: LevelOverview;
    onSaved: () => void | Promise<void>;
}

type ActionResult = { error?: string } | { result: unknown };

/**
 * The subcategories every level can split into: one row per definition, how
 * many levels carry it, rename and remove in the row, and the add button
 * under the table. Which level carries which is the grid's business.
 */
export function LevelSubcategoriesTable({
    gameSlug,
    gameId,
    overview,
    onSaved,
}: Props) {
    const [addOpen, setAddOpen] = useState(false);
    const [renaming, setRenaming] = useState<LevelTemplate | null>(null);
    const [removing, setRemoving] = useState<LevelTemplate | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const templates = [...overview.templates].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.id - b.id,
    );
    const levelCount = overview.levels.length;
    const reachOf = (t: LevelTemplate) =>
        overview.levels.filter((l) => l.variants.includes(t.display)).length;

    const run = (
        label: string,
        call: () => Promise<ActionResult>,
        close: () => void,
        busy: number | null = null,
    ) => {
        setDialogError(null);
        setBusyId(busy);
        startTransition(async () => {
            const res = await call();
            setBusyId(null);
            if ('error' in res && res.error) {
                setDialogError(res.error);
                return;
            }
            close();
            toast.success(label);
            await onSaved();
        });
    };

    return (
        <section className={styles.section} aria-labelledby="level-subs-title">
            <div className={styles.sectionHead}>
                <span className={styles.sectionTitle} id="level-subs-title">
                    Subcategories
                </span>
                <span className={styles.sectionCount}>
                    {templates.length === 0
                        ? 'none yet'
                        : `${templates.length} across ${levelCount} level${
                              levelCount === 1 ? '' : 's'
                          }`}
                </span>
            </div>

            {templates.length === 0 ? (
                <div className={styles.empty}>
                    <Diagram3
                        size={28}
                        className={styles.emptyIcon}
                        aria-hidden="true"
                    />
                    <p className={styles.emptyTitle}>No subcategories yet</p>
                    <button
                        type="button"
                        className={styles.addAction}
                        onClick={() => {
                            setDialogError(null);
                            setAddOpen(true);
                        }}
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add subcategory
                    </button>
                </div>
            ) : (
                <>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th>On levels</th>
                                <th>
                                    <span className="visually-hidden">
                                        Actions
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {templates.map((t) => {
                                const reach = reachOf(t);
                                const partial =
                                    levelCount > 0 && reach < levelCount;
                                const pct =
                                    levelCount === 0
                                        ? 0
                                        : Math.round(
                                              (reach / levelCount) * 100,
                                          );
                                return (
                                    <tr
                                        key={t.id}
                                        className={
                                            busyId === t.id
                                                ? styles.busyRow
                                                : undefined
                                        }
                                    >
                                        <td className={styles.name}>
                                            {t.display}
                                        </td>
                                        <td>
                                            <span
                                                className={`${styles.reach} ${
                                                    partial
                                                        ? styles.reachPartial
                                                        : ''
                                                }`}
                                            >
                                                <span
                                                    className={
                                                        styles.reachCount
                                                    }
                                                >
                                                    {reach} of {levelCount}
                                                </span>
                                                <span
                                                    className={
                                                        styles.reachMeter
                                                    }
                                                    role="progressbar"
                                                    aria-label={`${t.display} is on ${reach} of ${levelCount} levels`}
                                                    aria-valuenow={pct}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                >
                                                    <span
                                                        className={
                                                            styles.reachFill
                                                        }
                                                        style={{
                                                            width: `${pct}%`,
                                                        }}
                                                    />
                                                </span>
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.quietAction
                                                    }
                                                    disabled={pending}
                                                    onClick={() => {
                                                        setDialogError(null);
                                                        setRenaming(t);
                                                    }}
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.quietAction} ${styles.removeAction}`}
                                                    disabled={pending}
                                                    onClick={() => {
                                                        setDialogError(null);
                                                        setRemoving(t);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className={styles.sectionFoot}>
                        <button
                            type="button"
                            className={styles.addAction}
                            onClick={() => {
                                setDialogError(null);
                                setAddOpen(true);
                            }}
                        >
                            <Plus size={16} aria-hidden="true" />
                            Add subcategory
                        </button>
                        <p className={styles.footNote}>
                            A new subcategory lands on every level. Take it off
                            single levels in the grid below.
                        </p>
                    </div>
                </>
            )}

            <PromptDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSubmit={(value) =>
                    run(
                        'Subcategory added',
                        () =>
                            createLevelTemplateAction({
                                gameSlug,
                                gameId,
                                display: value,
                            }),
                        () => setAddOpen(false),
                    )
                }
                labelledBy="add-level-subcategory-title"
                title="Add subcategory"
                blurb="Every level gets this subcategory. Untick it per level in the grid."
                fieldLabel="Subcategory name"
                placeholder="e.g. Any%"
                minLength={1}
                submitLabel="Add subcategory"
                pending={pending}
                error={dialogError}
            />

            <PromptDialog
                open={renaming != null}
                onClose={() => setRenaming(null)}
                onSubmit={(value) => {
                    const t = renaming;
                    if (!t) return;
                    run(
                        `Renamed to ${value}`,
                        () =>
                            renameLevelTemplateAction({
                                gameSlug,
                                gameId,
                                templateId: t.id,
                                display: value,
                            }),
                        () => setRenaming(null),
                        t.id,
                    );
                }}
                labelledBy="rename-level-subcategory-title"
                title="Rename subcategory"
                blurb="The new name replaces the old one on every level."
                fieldLabel="Subcategory name"
                initialValue={renaming?.display ?? ''}
                minLength={1}
                submitLabel="Rename"
                pending={pending}
                error={dialogError}
            />

            <ConfirmDialog
                open={removing != null}
                onClose={() => setRemoving(null)}
                onConfirm={() => {
                    const t = removing;
                    if (!t) return;
                    run(
                        `${t.display} removed`,
                        () =>
                            archiveLevelTemplateAction({
                                gameSlug,
                                gameId,
                                templateId: t.id,
                            }),
                        () => setRemoving(null),
                        t.id,
                    );
                }}
                labelledBy="remove-level-subcategory-title"
                title="Remove subcategory?"
                message={
                    removing
                        ? `${removing.display} leaves every level it is on (${reachOf(removing)} of ${levelCount}). Runs keep their times; the board stops splitting on it.`
                        : ''
                }
                confirmLabel="Remove"
                variant="danger"
                pending={pending}
                error={dialogError}
            />
        </section>
    );
}
