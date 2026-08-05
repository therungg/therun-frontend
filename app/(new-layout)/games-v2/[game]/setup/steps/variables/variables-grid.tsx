'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import type { VariableChangeInput } from '~src/lib/leaderboard-variables';
import {
    groupVariables,
    type PendingToggle,
    resolveToggles,
    subBoardCount,
    type VariableGroup,
} from '~src/lib/setup/variable-view';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { describeConsequences } from '~src/lib/variables/consequences';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import {
    applyVariableChangesAction,
    previewVariableChangesAction,
} from '../../actions/apply-variable-changes.action';
import type { WizardData } from '../../types';
import styles from './variables-grid.module.scss';

/**
 * Zone 2 of step 4: the board's variables, as a board-level view over rows
 * that remain category-scoped in the database.
 *
 * A variable cannot be a matrix column — it is a structure (name, role,
 * ordered alias buckets, default index), and editing one moves existing runs
 * between boards. And it cannot have a game-level default: the buckets
 * genuinely differ per category. So the sharing a moderator wants comes back
 * as a VIEW: rows are grouped by nameNormalized, presented as one object with
 * a bucket x category grid, and every edit fans out as per-category writes.
 *
 * Toggles STAGE rather than write. That is the deliberate asymmetry with the
 * scalar matrix above, which writes immediately: scalar edits are reversible,
 * variable edits relocate runs, so the whole set is previewed once and
 * confirmed once. Staging is client-side only — this never writes an
 * unpublished row, because `published` is supersede history here, not a draft
 * flag.
 */
export function VariablesGrid({ data }: { data: WizardData }) {
    const router = useRouter();
    const [pending, setPending] = useState<Map<string, PendingToggle[]>>(
        new Map(),
    );
    const [preview, setPreview] = useState<{
        group: VariableGroup;
        preview: VariablePreview;
        changes: VariableChangeInput[];
        slugs: string[];
    } | null>(null);
    const [isBusy, startBusy] = useTransition();

    const mains = useMemo(
        () =>
            data.categories
                .filter((c) => !c.archived && (c.isMain ?? false))
                .sort(compareByBoardOrder),
        [data.categories],
    );
    const groups = useMemo(
        () => groupVariables(data.variables),
        [data.variables],
    );

    const toggleCell = (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
        on: boolean,
    ) => {
        setPending((prev) => {
            const next = new Map(prev);
            const list = [...(next.get(group.nameNormalized) ?? [])];
            list.push({ categoryId, bucketKey, on });
            next.set(group.nameNormalized, list);
            return next;
        });
    };

    /** Effective on/off for a cell, staged toggles included. */
    const cellOn = (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
    ): boolean => {
        const base =
            group.byCategory.get(categoryId)?.buckets.has(bucketKey) ?? false;
        const staged = (pending.get(group.nameNormalized) ?? []).filter(
            (t) => t.categoryId === categoryId && t.bucketKey === bucketKey,
        );
        return staged.length > 0 ? staged[staged.length - 1].on : base;
    };

    const pendingCount = (group: VariableGroup): number =>
        resolveToggles(group, pending.get(group.nameNormalized) ?? []).length;

    const buildChanges = (
        group: VariableGroup,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const resolved = resolveToggles(
            group,
            pending.get(group.nameNormalized) ?? [],
        );
        const labelFor = new Map(group.buckets.map((b) => [b.key, b.label]));
        const slugs: string[] = [];

        const changes = resolved.map((r): VariableChangeInput => {
            const cat = mains.find((c) => c.id === r.categoryId);
            if (cat) slugs.push(cat.name);

            // No buckets left means the variable no longer applies here. An
            // empty values array is not a legal variable, so this is a
            // removal rather than an empty write.
            if (r.buckets.length === 0) {
                return {
                    categoryId: r.categoryId,
                    input: null,
                    nameNormalized: group.nameNormalized,
                };
            }

            const existing = group.byCategory.get(r.categoryId);
            const role = existing?.role ?? group.dominantRole;
            const values = r.buckets.map((k) => [labelFor.get(k) ?? k]);
            // A subcategory variable must name a default bucket. Keep the
            // category's own if it survived the edit, else fall back to the
            // first remaining bucket rather than emitting an invalid write.
            const keptDefault =
                existing?.defaultBucket &&
                r.buckets.includes(existing.defaultBucket)
                    ? r.buckets.indexOf(existing.defaultBucket)
                    : 0;

            return {
                categoryId: r.categoryId,
                input: {
                    name: group.name,
                    role,
                    values,
                    defaultValueIndex:
                        role === 'subcategory' ? keptDefault : null,
                    sortOrder: existing?.row.sortOrder ?? 0,
                    description: existing?.row.description ?? null,
                },
            };
        });

        return { changes, slugs };
    };

    const stageApply = (group: VariableGroup) => {
        const { changes, slugs } = buildChanges(group);
        if (changes.length === 0) return;
        startBusy(async () => {
            const res = await previewVariableChangesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                changes,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setPreview({ group, preview: res.preview, changes, slugs });
        });
    };

    const confirmApply = () => {
        if (!preview) return;
        const { group, changes, slugs } = preview;
        startBusy(async () => {
            const res = await applyVariableChangesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                changes,
                touchedCategorySlugs: slugs,
            });
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setPreview(null);
            setPending((prev) => {
                const next = new Map(prev);
                next.delete(group.nameNormalized);
                return next;
            });
            toast.success(`${group.name} updated.`);
            router.refresh();
        });
    };

    const discard = (group: VariableGroup) => {
        setPending((prev) => {
            const next = new Map(prev);
            next.delete(group.nameNormalized);
            return next;
        });
    };

    if (mains.length === 0) return null;

    return (
        <section className={styles.zone}>
            <h3 className={styles.zoneHead}>
                Variables
                <span className={styles.zoneCount}>
                    {groups.length === 0
                        ? 'none on this board'
                        : `${groups.length} on this board`}
                </span>
            </h3>

            {groups.length === 0 ? (
                <p className={styles.emptyNote}>
                    No variables yet. Variables split a category into sub-boards
                    (Platform, Region) or add a filter. Add one from a
                    category&rsquo;s full editor and it shows up here across the
                    whole board.
                </p>
            ) : (
                groups.map((group) => (
                    <VariablePalette
                        key={group.nameNormalized}
                        group={group}
                        categories={mains}
                        variables={data.variables}
                        busy={isBusy}
                        pendingCount={pendingCount(group)}
                        cellOn={(categoryId, bucketKey) =>
                            cellOn(group, categoryId, bucketKey)
                        }
                        onToggle={(categoryId, bucketKey, on) =>
                            toggleCell(group, categoryId, bucketKey, on)
                        }
                        onApply={() => stageApply(group)}
                        onDiscard={() => discard(group)}
                    />
                ))
            )}

            {preview && (
                <ConsequenceDialog
                    name={preview.group.name}
                    preview={preview.preview}
                    busy={isBusy}
                    onCancel={() => setPreview(null)}
                    onConfirm={confirmApply}
                />
            )}
        </section>
    );
}

function VariablePalette({
    group,
    categories,
    variables,
    busy,
    pendingCount,
    cellOn,
    onToggle,
    onApply,
    onDiscard,
}: {
    group: VariableGroup;
    categories: ResolvedCategory[];
    variables: WizardData['variables'];
    busy: boolean;
    pendingCount: number;
    cellOn: (categoryId: number, bucketKey: string) => boolean;
    onToggle: (categoryId: number, bucketKey: string, on: boolean) => void;
    onApply: () => void;
    onDiscard: () => void;
}) {
    const [open, setOpen] = useState(true);
    const onCount = categories.filter((c) => group.byCategory.has(c.id)).length;

    return (
        <div className={styles.palette}>
            <button
                type="button"
                className={styles.paletteHead}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className={styles.paletteName}>{group.name}</span>
                <span className={styles.paletteMeta}>
                    {group.dominantRole === 'subcategory'
                        ? 'sub-boards'
                        : 'filter'}{' '}
                    · on {onCount} of {categories.length}
                </span>
                {group.roleDrift && (
                    <span className={styles.driftBadge}>
                        roles differ by category
                    </span>
                )}
                {pendingCount > 0 && (
                    <span className={styles.pendingBadge}>
                        {pendingCount} pending
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className={styles.scroller}>
                        <table className={styles.grid}>
                            <thead>
                                <tr>
                                    <th />
                                    {categories.map((c) => (
                                        <th key={c.id}>{c.display}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {group.buckets.map((bucket) => (
                                    <tr key={bucket.key}>
                                        <th className={styles.bucketName}>
                                            {bucket.label}
                                        </th>
                                        {categories.map((c) => {
                                            const on = cellOn(c.id, bucket.key);
                                            const isDefault =
                                                group.byCategory.get(c.id)
                                                    ?.defaultBucket ===
                                                bucket.key;
                                            return (
                                                <td key={c.id}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.cell} ${
                                                            on
                                                                ? styles.cellOn
                                                                : styles.cellOff
                                                        }`}
                                                        disabled={busy}
                                                        aria-pressed={on}
                                                        aria-label={`${bucket.label} on ${c.display}`}
                                                        title={
                                                            isDefault
                                                                ? 'Default bucket for this category'
                                                                : undefined
                                                        }
                                                        onClick={() =>
                                                            onToggle(
                                                                c.id,
                                                                bucket.key,
                                                                !on,
                                                            )
                                                        }
                                                    >
                                                        {on
                                                            ? isDefault
                                                                ? '◉'
                                                                : '●'
                                                            : '○'}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                                <tr className={styles.roleRow}>
                                    <th className={styles.bucketName}>role</th>
                                    {categories.map((c) => {
                                        const state = group.byCategory.get(
                                            c.id,
                                        );
                                        return (
                                            <td key={c.id}>
                                                <span
                                                    className={
                                                        state &&
                                                        state.role !==
                                                            group.dominantRole
                                                            ? styles.roleDrift
                                                            : styles.roleQuiet
                                                    }
                                                >
                                                    {state
                                                        ? state.role ===
                                                          'subcategory'
                                                            ? 'sub'
                                                            : 'filter'
                                                        : '—'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* The consequence, shown where it is caused. */}
                    <p className={styles.consequence}>
                        {categories
                            .filter((c) => group.byCategory.has(c.id))
                            .map((c) => {
                                const n = subBoardCount(c.id, variables);
                                return `${c.display} → ${n} ${
                                    n === 1 ? 'board' : 'sub-boards'
                                }`;
                            })
                            .join(' · ') || 'Not on any category yet.'}
                    </p>

                    {pendingCount > 0 && (
                        <div className={styles.pendingBar}>
                            <span>
                                {pendingCount}{' '}
                                {pendingCount === 1 ? 'category' : 'categories'}{' '}
                                changed, not applied yet
                            </span>
                            <span className={styles.pendingSpacer} />
                            <button
                                type="button"
                                className={styles.pendingBtn}
                                disabled={busy}
                                onClick={onDiscard}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className={styles.pendingBtn}
                                disabled={busy}
                                onClick={onApply}
                            >
                                Preview &amp; apply
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * One honest summary for the whole staged set, instead of N confirmations.
 * Reuses describeConsequences so the wording matches the per-variable editor.
 */
function ConsequenceDialog({
    name,
    preview,
    busy,
    onCancel,
    onConfirm,
}: {
    name: string;
    preview: VariablePreview;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const copy = describeConsequences(preview, {
        variableName: name,
        action: 'save',
    });

    return (
        // Backdrop dismissal is a convenience; Cancel is the keyboard path.
        <div className={styles.dialogBackdrop} onClick={onCancel}>
            <div
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-label={`Apply changes to ${name}`}
                onClick={(e) => e.stopPropagation()}
            >
                <p className={styles.dialogTitle}>{copy.headline}</p>
                {copy.detail && (
                    <p className={styles.dialogNote}>{copy.detail}</p>
                )}

                {preview.categories.length > 0 && (
                    <ul className={styles.dialogList}>
                        {preview.categories.map((c) => (
                            <li key={c.categoryId}>
                                {c.display} — {c.moved}{' '}
                                {c.moved === 1 ? 'run' : 'runs'} move
                            </li>
                        ))}
                    </ul>
                )}

                <div className={styles.dialogActions}>
                    <button
                        type="button"
                        className={styles.pendingBtn}
                        disabled={busy}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={styles.pendingBtn}
                        disabled={busy}
                        onClick={onConfirm}
                    >
                        {busy ? 'Applying…' : 'Apply'}
                    </button>
                </div>
            </div>
        </div>
    );
}
