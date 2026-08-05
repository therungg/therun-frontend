'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'react-toastify';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import type { VariableChangeInput } from '~src/lib/leaderboard-variables';
import type { BoardBucket } from '~src/lib/setup/variable-view';
import {
    categoriesNeedingCombinations,
    categoriesToConvert,
    driftSides,
    groupVariables,
    type PendingToggle,
    partitionGroups,
    rebuildValues,
    resolveToggles,
    subBoardCount,
    type VariableGroup,
} from '~src/lib/setup/variable-view';
import type { VariablePreview } from '~src/lib/variables/consequences';
import { describeConsequences } from '~src/lib/variables/consequences';
import {
    BUILT_IN_FILTERS,
    conversionLabel,
    conversionNote,
    driftNotice,
    SECTION,
    type VariableRoleId,
} from '~src/lib/variables/language';
import type { ResolvedCategory } from '../../../../../../../types/leaderboards.types';
import {
    applyVariableChangesAction,
    previewVariableChangesAction,
} from '../../actions/apply-variable-changes.action';
import type { WizardData } from '../../types';
import { CombinationsBlock } from './combinations-block';
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
 * a category x option grid, and every edit fans out as per-category writes.
 *
 * That grid runs CATEGORIES DOWN THE ROWS, matching the matrix above it. It
 * used to be transposed — the same eight categories were rows in zone 1 and
 * columns in zone 2 — which meant reading this screen top to bottom involved
 * rotating it ninety degrees halfway down. Options are the columns instead,
 * and a subcategory group's default lands in a column of its own beside them.
 *
 * `role` is not a field here. It is split into two SECTIONS — Subcategories
 * and Filters — because those are two concepts for a moderator and only one
 * column in the database. Which section you are standing in decides the role;
 * moving between them is a named conversion with a consequence preview, never
 * a dropdown. See docs/plans/2026-08-05-splits-vs-filters-design.md.
 *
 * The two sections deliberately write differently:
 *
 * - **Subcategories** stage. Their edits relocate existing runs, so the whole
 *   set is previewed once and confirmed once.
 * - **Filters** write immediately, like the scalar matrix above. They are
 *   additive and touch no standings; staging them made adding a Route option
 *   feel as dangerous as re-slicing the board.
 *
 * Staging is client-side only — this never writes an unpublished row, because
 * `published` is supersede history here, not a draft flag.
 */
export function VariablesGrid({ data }: { data: WizardData }) {
    const router = useRouter();
    const [pending, setPending] = useState<Map<string, PendingToggle[]>>(
        new Map(),
    );
    const [preview, setPreview] = useState<{
        name: string;
        groupKey: string;
        preview: VariablePreview;
        changes: VariableChangeInput[];
        slugs: string[];
    } | null>(null);
    const [busyGroup, setBusyGroup] = useState<string | null>(null);
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
    const { splits, details } = useMemo(
        () => partitionGroups(groups),
        [groups],
    );

    /** Names already taken, so a new one collides before it is typed. */
    const takenNames = useMemo(
        () =>
            new Set([
                ...groups.map((g) => g.nameNormalized),
                ...BUILT_IN_FILTERS.map(normalizeName),
                ...RESERVED_NAMES,
            ]),
        [groups],
    );

    const buildChanges = (
        group: VariableGroup,
        toggles: PendingToggle[],
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const resolved = resolveToggles(group, toggles);
        const bucketFor = new Map(group.buckets.map((b) => [b.key, b]));
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
            // Carries the board-level aliases across, so ticking a category
            // on gives it the same accepted spellings as everyone else rather
            // than a bare canonical value.
            const values = r.buckets.map((k) => {
                const b = bucketFor.get(k);
                return b ? [b.label, ...b.aliases] : [k];
            });
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

    /**
     * A conversion rewrites the role on every category that disagrees, keeping
     * each one's own buckets and aliases untouched — the point is to change
     * what the variable *does*, not what it contains.
     */
    const buildRoleChanges = (
        group: VariableGroup,
        to: VariableRoleId,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = categoriesToConvert(group, to).map(
            (categoryId): VariableChangeInput => {
                const cat = mains.find((c) => c.id === categoryId);
                if (cat) slugs.push(cat.name);
                const state = group.byCategory.get(categoryId);
                const row = state?.row;
                return {
                    categoryId,
                    input: {
                        name: row?.name ?? group.name,
                        role: to,
                        values: row?.values ?? [],
                        defaultValueIndex:
                            to === 'subcategory'
                                ? (row?.defaultValueIndex ?? 0)
                                : null,
                        sortOrder: row?.sortOrder ?? 0,
                        description: row?.description ?? null,
                    },
                };
            },
        );
        return { changes, slugs };
    };

    /**
     * The write behind an edit to what an option *is* — its name, its accepted
     * spellings, its position, or its existence. Fans out to every category
     * that carries it; `rebuildValues` returns only the ones that actually
     * change.
     */
    const buildBucketChanges = (
        group: VariableGroup,
        boardBuckets: BoardBucket[],
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = rebuildValues(group, boardBuckets).map(
            (r): VariableChangeInput => {
                const cat = mains.find((c) => c.id === r.categoryId);
                if (cat) slugs.push(cat.name);
                const existing = group.byCategory.get(r.categoryId);

                if (r.values.length === 0) {
                    return {
                        categoryId: r.categoryId,
                        input: null,
                        nameNormalized: group.nameNormalized,
                    };
                }
                return {
                    categoryId: r.categoryId,
                    input: {
                        name: group.name,
                        role: existing?.role ?? group.dominantRole,
                        values: r.values,
                        defaultValueIndex: r.defaultIndex,
                        sortOrder: existing?.row.sortOrder ?? 0,
                        description: existing?.row.description ?? null,
                    },
                };
            },
        );
        return { changes, slugs };
    };

    /**
     * Where unmatched runs land, set once for the whole group.
     *
     * It CAN differ per category, and when it does the grid gives it a column.
     * But it almost never does — a board that splits by Platform wants runs
     * with no platform on the same platform everywhere — and rendering the
     * same answer eight times down a column, as eight separate dropdowns, is
     * the repetition this screen keeps having to remove. So the common case is
     * one control, and the column only appears once the categories disagree.
     */
    const buildDefaultChangeAll = (
        group: VariableGroup,
        bucketKey: string,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const built = [...group.byCategory.keys()].map((id) =>
            buildDefaultChange(group, id, bucketKey),
        );
        return {
            changes: built.flatMap((b) => b.changes),
            slugs: built.flatMap((b) => b.slugs),
        };
    };

    /** Where one category's unmatched runs land. */
    const buildDefaultChange = (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const state = group.byCategory.get(categoryId);
        if (!state) return { changes: [], slugs: [] };
        const index = state.row.values.findIndex(
            (v) => bucketKey === (v[0] ?? '').trim().toLowerCase(),
        );
        if (index < 0 || index === state.row.defaultValueIndex) {
            return { changes: [], slugs: [] };
        }
        const cat = mains.find((c) => c.id === categoryId);
        return {
            slugs: cat ? [cat.name] : [],
            changes: [
                {
                    categoryId,
                    input: {
                        name: state.row.name,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: index,
                        sortOrder: state.row.sortOrder,
                        description: state.row.description,
                    },
                },
            ],
        };
    };

    /**
     * A brand-new option, onto every category that carries the group.
     *
     * This cannot ride `buildBucketChanges`. `rebuildValues` reconciles the
     * board's bucket list against what each category already has — `kept =
     * boardBuckets.filter(b => state.buckets.has(b.key))` — which is right for
     * renaming and reordering and silently drops a bucket no category carries
     * yet. Adding through that path produced zero changes and looked like a
     * successful no-op.
     *
     * Board-wide is the right default: you add Wii to Platform because the
     * board has Wii runs, then untick the categories it does not belong on.
     */
    const buildAddOptionChanges = (
        group: VariableGroup,
        bucket: BoardBucket,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = [...group.byCategory.values()]
            .filter((state) => !state.buckets.has(bucket.key))
            .map((state): VariableChangeInput => {
                const cat = mains.find((c) => c.id === state.categoryId);
                if (cat) slugs.push(cat.name);
                return {
                    categoryId: state.categoryId,
                    input: {
                        name: group.name,
                        role: state.role,
                        values: [
                            ...state.row.values,
                            [bucket.label, ...bucket.aliases],
                        ],
                        // Appended at the end, so nothing that came before it
                        // shifts and the existing default still points at the
                        // option it always did.
                        defaultValueIndex: state.row.defaultValueIndex,
                        sortOrder: state.row.sortOrder,
                        description: state.row.description,
                    },
                };
            });
        return { changes, slugs };
    };

    /**
     * Renaming the group, on every category that carries it.
     *
     * A name can only be board-level: letting it drift per category is how a
     * board ends up with "Platform" and "System" that are the same thing.
     */
    const buildRenameChanges = (
        group: VariableGroup,
        nextName: string,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = [...group.byCategory.values()].map(
            (state): VariableChangeInput => {
                const cat = mains.find((c) => c.id === state.categoryId);
                if (cat) slugs.push(cat.name);
                return {
                    categoryId: state.categoryId,
                    input: {
                        name: nextName,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: state.row.defaultValueIndex,
                        sortOrder: state.row.sortOrder,
                        description: state.row.description,
                    },
                };
            },
        );
        return { changes, slugs };
    };

    /**
     * Removing the group from the board — one null write per category that
     * carries it, which is the same removal an emptied grid produces.
     *
     * The only way to do this used to be unticking every option on every
     * category one cell at a time.
     */
    const buildDeleteChanges = (
        group: VariableGroup,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = [...group.byCategory.keys()].map(
            (categoryId): VariableChangeInput => {
                const cat = mains.find((c) => c.id === categoryId);
                if (cat) slugs.push(cat.name);
                return {
                    categoryId,
                    input: null,
                    nameNormalized: group.nameNormalized,
                };
            },
        );
        return { changes, slugs };
    };

    /** New variable on every featured category, role fixed by its section. */
    const buildCreateChanges = (
        name: string,
        role: VariableRoleId,
        options: string[],
        defaultIndex: number,
    ): { changes: VariableChangeInput[]; slugs: string[] } => ({
        slugs: mains.map((c) => c.name),
        changes: mains.map((c) => ({
            categoryId: c.id,
            input: {
                name,
                role,
                values: options.map((o) => [o]),
                defaultValueIndex: role === 'subcategory' ? defaultIndex : null,
                sortOrder: 0,
                description: null,
            },
        })),
    });

    const openPreview = (
        key: string,
        name: string,
        built: { changes: VariableChangeInput[]; slugs: string[] },
    ) => {
        if (built.changes.length === 0) return;
        setBusyGroup(key);
        startBusy(async () => {
            const res = await previewVariableChangesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                changes: built.changes,
            });
            setBusyGroup(null);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setPreview({
                name,
                groupKey: key,
                preview: res.preview,
                changes: built.changes,
                slugs: built.slugs,
            });
        });
    };

    /**
     * Run details skip the preview entirely — nothing moves between boards,
     * so a confirmation would be theatre.
     */
    const applyNow = (
        key: string,
        name: string,
        built: { changes: VariableChangeInput[]; slugs: string[] },
        onFailure?: () => void,
    ) => {
        if (built.changes.length === 0) return;
        setBusyGroup(key);
        startBusy(async () => {
            const res = await applyVariableChangesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                changes: built.changes,
                touchedCategorySlugs: built.slugs,
            });
            setBusyGroup(null);
            if ('error' in res) {
                toast.error(res.error);
                onFailure?.();
                return;
            }
            toast.success(`${name} updated.`);
            router.refresh();
        });
    };

    const toggleCell = (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
        on: boolean,
    ) => {
        const before = pending.get(group.nameNormalized) ?? [];
        const next = [...before, { categoryId, bucketKey, on }];
        setPending((prev) => {
            const map = new Map(prev);
            map.set(group.nameNormalized, next);
            return map;
        });

        // Run details write on the click. The staged toggle stays as the
        // optimistic state until router.refresh() brings the real row back —
        // dropping it here would flash the cell back to its old value.
        if (group.dominantRole === 'filter') {
            applyNow(
                group.nameNormalized,
                group.name,
                buildChanges(group, next),
                () =>
                    setPending((prev) => {
                        const map = new Map(prev);
                        map.set(group.nameNormalized, before);
                        return map;
                    }),
            );
        }
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

    const confirmApply = () => {
        if (!preview) return;
        const { name, groupKey, changes, slugs } = preview;
        setBusyGroup(groupKey);
        startBusy(async () => {
            const res = await applyVariableChangesAction({
                gameSlug: data.game.name,
                gameId: data.game.id,
                changes,
                touchedCategorySlugs: slugs,
            });
            setBusyGroup(null);
            if ('error' in res) {
                toast.error(res.error);
                return;
            }
            setPreview(null);
            setPending((prev) => {
                const next = new Map(prev);
                next.delete(groupKey);
                return next;
            });
            toast.success(`${name} updated.`);
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

    const sectionProps = (role: VariableRoleId) => ({
        role,
        game: data.game,
        categories: mains,
        variables: data.variables,
        busyGroup,
        busy: isBusy,
        takenNames,
        cellOn,
        onToggle: toggleCell,
        pendingCount,
        onDiscard: discard,
        onStage: (group: VariableGroup) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildChanges(group, pending.get(group.nameNormalized) ?? []),
            ),
        onConvert: (group: VariableGroup, to: VariableRoleId) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildRoleChanges(group, to),
            ),
        onBuckets: (group: VariableGroup, boardBuckets: BoardBucket[]) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildBucketChanges(group, boardBuckets),
            ),
        onDefault: (
            group: VariableGroup,
            categoryId: number,
            bucketKey: string,
        ) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildDefaultChange(group, categoryId, bucketKey),
            ),
        onDefaultAll: (group: VariableGroup, bucketKey: string) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildDefaultChangeAll(group, bucketKey),
            ),
        onAddOption: (group: VariableGroup, bucket: BoardBucket) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildAddOptionChanges(group, bucket),
            ),
        onRename: (group: VariableGroup, nextName: string) => {
            const built = buildRenameChanges(group, nextName);
            // A subcategory's name is part of its leaderboard's identity, so
            // renaming relocates runs and gets the same preview an edit does.
            // A filter's name is only a label on the filter bar.
            if (role === 'subcategory') {
                openPreview(group.nameNormalized, nextName, built);
            } else {
                applyNow(group.nameNormalized, nextName, built);
            }
        },
        // Always previewed, whichever section it is in: this is the one action
        // here that destroys rather than edits.
        onDelete: (group: VariableGroup) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildDeleteChanges(group),
            ),
        onCreate: (name: string, options: string[], defaultIndex: number) => {
            const built = buildCreateChanges(name, role, options, defaultIndex);
            // Creating a split adds boards to every featured category, so it
            // gets the same preview an edit does. Creating a detail does not.
            if (role === 'subcategory') openPreview(NEW_KEY, name, built);
            else applyNow(NEW_KEY, name, built);
        },
    });

    return (
        <>
            <VariableSection {...sectionProps('subcategory')} groups={splits} />
            <VariableSection {...sectionProps('filter')} groups={details} />

            {preview && (
                <ConsequenceDialog
                    name={preview.name}
                    preview={preview.preview}
                    busy={isBusy}
                    onCancel={() => setPreview(null)}
                    onConfirm={confirmApply}
                />
            )}
        </>
    );
}

/** Key used for the not-yet-existing variable an add form is building. */
const NEW_KEY = '__new__';

/**
 * Reserved query params that cannot become variable names. Kept alongside the
 * built-in filter labels so the collision is caught in the form rather than by
 * a 400 on save.
 */
const RESERVED_NAMES = [
    'combined',
    'verified',
    'country',
    'year',
    'page',
    'pagesize',
    'timing',
    'view',
];

function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[\s=|]/g, '');
}

interface SectionProps {
    role: VariableRoleId;
    game: WizardData['game'];
    groups: VariableGroup[];
    categories: ResolvedCategory[];
    variables: WizardData['variables'];
    busyGroup: string | null;
    busy: boolean;
    takenNames: Set<string>;
    cellOn: (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
    ) => boolean;
    onToggle: (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
        on: boolean,
    ) => void;
    pendingCount: (group: VariableGroup) => number;
    onDiscard: (group: VariableGroup) => void;
    onStage: (group: VariableGroup) => void;
    onConvert: (group: VariableGroup, to: VariableRoleId) => void;
    onBuckets: (group: VariableGroup, boardBuckets: BoardBucket[]) => void;
    onDefault: (
        group: VariableGroup,
        categoryId: number,
        bucketKey: string,
    ) => void;
    onDefaultAll: (group: VariableGroup, bucketKey: string) => void;
    onAddOption: (group: VariableGroup, bucket: BoardBucket) => void;
    onRename: (group: VariableGroup, nextName: string) => void;
    onDelete: (group: VariableGroup) => void;
    onCreate: (name: string, options: string[], defaultIndex: number) => void;
}

function VariableSection({
    role,
    game,
    groups,
    categories,
    variables,
    busyGroup,
    busy,
    takenNames,
    cellOn,
    onToggle,
    pendingCount,
    onDiscard,
    onStage,
    onConvert,
    onBuckets,
    onDefault,
    onDefaultAll,
    onAddOption,
    onRename,
    onDelete,
    onCreate,
}: SectionProps) {
    const [adding, setAdding] = useState(false);
    const copy = SECTION[role];

    // Categories where a combination cannot be expressed by removing an
    // option — the only ones the valid-combinations list has anything to say
    // about. See categoriesNeedingCombinations.
    const multiGroup = categories.filter((c) =>
        categoriesNeedingCombinations(
            categories.map((x) => x.id),
            variables,
        ).includes(c.id),
    );

    // Total boards across the featured categories — the number this section
    // exists to control, and the one that quietly gets out of hand.
    const boardTotal = categories.reduce(
        (total, c) => total + subBoardCount(c.id, variables),
        0,
    );

    return (
        <section className={styles.zone}>
            <div className={styles.zoneHead}>
                <span className={styles.zoneTitle}>{copy.title}</span>
                <span className={styles.zoneCount}>
                    {role === 'subcategory'
                        ? `${boardTotal} ${boardTotal === 1 ? 'leaderboard' : 'leaderboards'}`
                        : `${groups.length} added`}
                </span>
            </div>
            <p className={styles.zoneBlurb}>{copy.blurb}</p>

            {role === 'filter' && (
                <div className={styles.builtIns}>
                    <span className={styles.builtInsLabel}>
                        Always available
                    </span>
                    {BUILT_IN_FILTERS.map((name) => (
                        <span key={name} className={styles.builtInChip}>
                            {name}
                        </span>
                    ))}
                    <span className={styles.builtInsNote}>
                        built in — nothing to configure
                    </span>
                </div>
            )}

            {groups.length === 0 ? (
                <div className={styles.empty}>
                    <p className={styles.emptyTitle}>
                        {role === 'subcategory'
                            ? 'No subcategories'
                            : 'Only the built-in filters'}
                    </p>
                    <p className={styles.emptyNote}>
                        {role === 'subcategory'
                            ? 'Every featured category is a single leaderboard. Add a subcategory group when a category is really several leaderboards — Platform, Region, Glitches — each with its own record.'
                            : 'Add a filter when runners should be able to narrow a leaderboard by something the run carries, without it becoming a subcategory.'}
                    </p>
                </div>
            ) : (
                groups.map((group) => (
                    <VariablePalette
                        key={group.nameNormalized}
                        group={group}
                        role={role}
                        categories={categories}
                        busy={busy}
                        isTarget={busyGroup === group.nameNormalized}
                        pendingCount={pendingCount(group)}
                        cellOn={(categoryId, bucketKey) =>
                            cellOn(group, categoryId, bucketKey)
                        }
                        onToggle={(categoryId, bucketKey, on) =>
                            onToggle(group, categoryId, bucketKey, on)
                        }
                        onApply={() => onStage(group)}
                        onDiscard={() => onDiscard(group)}
                        onConvert={(to) => onConvert(group, to)}
                        onBuckets={(next) => onBuckets(group, next)}
                        onDefault={(categoryId, bucketKey) =>
                            onDefault(group, categoryId, bucketKey)
                        }
                        onDefaultAll={(bucketKey) =>
                            onDefaultAll(group, bucketKey)
                        }
                        onAddOption={(bucket) => onAddOption(group, bucket)}
                        onRename={(next) => onRename(group, next)}
                        onDelete={() => onDelete(group)}
                        takenNames={takenNames}
                    />
                ))
            )}

            {role === 'subcategory' && (
                <CombinationsBlock
                    gameSlug={game.name}
                    gameId={game.id}
                    categories={multiGroup}
                    variables={variables}
                />
            )}

            {adding ? (
                <AddVariableForm
                    role={role}
                    busy={busy}
                    takenNames={takenNames}
                    categoryCount={categories.length}
                    onCancel={() => setAdding(false)}
                    onCreate={(name, options, defaultIndex) => {
                        setAdding(false);
                        onCreate(name, options, defaultIndex);
                    }}
                />
            ) : (
                <button
                    type="button"
                    className={styles.addAction}
                    disabled={busy}
                    onClick={() => setAdding(true)}
                >
                    + {copy.add}
                </button>
            )}
        </section>
    );
}

function VariablePalette({
    group,
    role,
    categories,
    busy,
    isTarget,
    pendingCount,
    cellOn,
    onToggle,
    onApply,
    onDiscard,
    onConvert,
    onBuckets,
    onDefault,
    onDefaultAll,
    onAddOption,
    onRename,
    onDelete,
    takenNames,
}: {
    group: VariableGroup;
    role: VariableRoleId;
    categories: ResolvedCategory[];
    busy: boolean;
    isTarget: boolean;
    pendingCount: number;
    cellOn: (categoryId: number, bucketKey: string) => boolean;
    onToggle: (categoryId: number, bucketKey: string, on: boolean) => void;
    onApply: () => void;
    onDiscard: () => void;
    onConvert: (to: VariableRoleId) => void;
    onBuckets: (boardBuckets: BoardBucket[]) => void;
    onDefault: (categoryId: number, bucketKey: string) => void;
    onDefaultAll: (bucketKey: string) => void;
    onAddOption: (bucket: BoardBucket) => void;
    onRename: (nextName: string) => void;
    onDelete: () => void;
    takenNames: Set<string>;
}) {
    const [open, setOpen] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [renaming, setRenaming] = useState(false);
    // A new option is edited by the same editor that edits an existing one —
    // it is the same three questions (name, spellings, where in the order).
    const [addingOption, setAddingOption] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const onCount = categories.filter((c) => group.byCategory.has(c.id)).length;
    const displayOf = (id: number) =>
        categories.find((c) => c.id === id)?.display ?? `#${id}`;
    const sides = driftSides(group);
    const editingBucket = group.buckets.find((b) => b.key === editing) ?? null;

    /**
     * The default every category agrees on, or null when they disagree.
     *
     * A board that splits by Platform almost always wants a run with no
     * platform on the same platform everywhere, so the column rendered the
     * same answer eight times as eight separate dropdowns. When they agree it
     * becomes one control above the grid; the column only comes back once
     * there is a disagreement for it to show.
     */
    const carriers = categories.filter((c) => group.byCategory.has(c.id));
    const sharedDefault =
        role === 'subcategory' &&
        carriers.length > 0 &&
        carriers.every(
            (c) =>
                group.byCategory.get(c.id)?.defaultBucket ===
                group.byCategory.get(carriers[0].id)?.defaultBucket,
        )
            ? (group.byCategory.get(carriers[0].id)?.defaultBucket ?? null)
            : null;

    const showsDefaultColumn = role === 'subcategory' && sharedDefault === null;
    // Category + one per option + the add-an-option column + the default
    // column, when there is one.
    const columnCount = 2 + group.buckets.length + (showsDefaultColumn ? 1 : 0);

    return (
        <div className={styles.palette}>
            {/* The head is a row of separate controls, not one big button. It
                used to be a single collapse button wrapping everything, which
                is why the name could never become editable — a button cannot
                live inside a button, and the group's own name was the one
                thing on this panel with no way to change it. */}
            <div className={styles.paletteHead}>
                {renaming ? (
                    <RenameGroup
                        role={role}
                        current={group.name}
                        busy={busy}
                        takenNames={takenNames}
                        onCancel={() => setRenaming(false)}
                        onRename={(next) => {
                            setRenaming(false);
                            onRename(next);
                        }}
                    />
                ) : (
                    <>
                        {/* Click the thing to edit the thing — the same rule
                            the option column headers follow. */}
                        <button
                            type="button"
                            className={styles.paletteName}
                            disabled={busy}
                            title={`Rename ${group.name}`}
                            onClick={() => setRenaming(true)}
                        >
                            {group.name}
                        </button>
                        <span className={styles.paletteMeta}>
                            on {onCount} of {categories.length} ·{' '}
                            {group.buckets.length}{' '}
                            {SECTION[role].options.toLowerCase()}
                        </span>
                        {pendingCount > 0 && (
                            <span className={styles.pendingBadge}>
                                {pendingCount} pending
                            </span>
                        )}
                        <button
                            type="button"
                            className={styles.collapse}
                            aria-expanded={open}
                            aria-label={`${open ? 'Collapse' : 'Expand'} ${group.name}`}
                            onClick={() => setOpen((v) => !v)}
                        />
                    </>
                )}
            </div>

            {/* A role disagreement means this makes subcategories on part of
                the board and only filters the rest. Stated, with both ways
                out — it used to be a badge reading "roles differ". */}
            {group.roleDrift && (
                <div className={styles.drift}>
                    <p className={styles.driftText}>
                        {driftNotice({
                            name: group.name,
                            splitOn: sides.subcategory.map(displayOf),
                            filterOn: sides.filter.map(displayOf),
                        })}
                    </p>
                    <div className={styles.driftActions}>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy}
                            onClick={() => onConvert('subcategory')}
                        >
                            Subcategories everywhere
                        </button>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy}
                            onClick={() => onConvert('filter')}
                        >
                            Filter everywhere
                        </button>
                    </div>
                </div>
            )}

            {open && (
                <>
                    {/* The whole of what used to be a column and a footnote:
                        one sentence with the control inside it, stating both
                        that runs arrive without a Platform and where those go.
                        The column comes back below the moment two categories
                        want different answers. */}
                    {sharedDefault !== null && (
                        <p className={styles.groupSetting}>
                            A run that doesn&rsquo;t say which {group.name} it
                            used goes to{' '}
                            <select
                                className={styles.defaultSelect}
                                value={sharedDefault}
                                disabled={busy}
                                aria-label={`Where a run with no ${group.name} goes, on all ${carriers.length} categories`}
                                onChange={(e) => onDefaultAll(e.target.value)}
                            >
                                {group.buckets.map((b) => (
                                    <option key={b.key} value={b.key}>
                                        {b.label}
                                    </option>
                                ))}
                            </select>
                            .
                        </p>
                    )}

                    <div className={styles.scroller}>
                        <table className={styles.grid}>
                            <thead>
                                <tr>
                                    <th className={styles.corner}>Category</th>
                                    {/* The option's own column header is how
                                        you edit the option. Same rule as the
                                        category matrix: click the thing to
                                        edit the thing, and never leave the
                                        grid to do it. */}
                                    {group.buckets.map((bucket) => (
                                        <th key={bucket.key}>
                                            <button
                                                type="button"
                                                className={styles.optionButton}
                                                aria-expanded={
                                                    editing === bucket.key
                                                }
                                                onClick={() =>
                                                    setEditing(
                                                        editing === bucket.key
                                                            ? null
                                                            : bucket.key,
                                                    )
                                                }
                                            >
                                                {bucket.label}
                                                {bucket.aliases.length > 0 && (
                                                    <span
                                                        className={
                                                            styles.aliasCount
                                                        }
                                                        title={`${bucket.aliases.length} other ${
                                                            bucket.aliases
                                                                .length === 1
                                                                ? 'spelling'
                                                                : 'spellings'
                                                        } resolve here: ${bucket.aliases.join(', ')}`}
                                                    >
                                                        +{bucket.aliases.length}
                                                    </span>
                                                )}
                                            </button>
                                        </th>
                                    ))}

                                    {/* A new option is a new column, so the
                                        control that makes one sits where the
                                        column will appear. There was no way to
                                        add an option at all once the group
                                        existed — you could rename, reorder and
                                        remove them, but never add. */}
                                    <th className={styles.addOptionHead}>
                                        <button
                                            type="button"
                                            className={styles.addOption}
                                            disabled={busy}
                                            aria-expanded={addingOption}
                                            onClick={() => {
                                                setEditing(null);
                                                setAddingOption((v) => !v);
                                            }}
                                        >
                                            + Option
                                        </button>
                                    </th>

                                    {/* Where unmatched runs land — per
                                        category by nature, so a column beside
                                        the options rather than a value shared
                                        across the board.

                                        Named with the group's own word. "Runs
                                        that don't say" left the reader to
                                        supply the missing half of the sentence
                                        — don't say WHAT — and the only place
                                        that ever answered it was a tooltip on
                                        a marker that no longer exists. */}
                                    {showsDefaultColumn && (
                                        <th
                                            className={styles.defaultHead}
                                            title={`A run submitted without a ${group.name} goes to the subcategory picked here.`}
                                        >
                                            No {group.name} given
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {editingBucket && (
                                    <tr className={styles.editorRow}>
                                        <td colSpan={columnCount}>
                                            <OptionEditor
                                                bucket={editingBucket}
                                                index={group.buckets.indexOf(
                                                    editingBucket,
                                                )}
                                                total={group.buckets.length}
                                                role={role}
                                                busy={busy}
                                                onCancel={() =>
                                                    setEditing(null)
                                                }
                                                onApply={(next) => {
                                                    setEditing(null);
                                                    onBuckets(next);
                                                }}
                                                buckets={group.buckets}
                                            />
                                        </td>
                                    </tr>
                                )}

                                {addingOption && (
                                    <tr className={styles.editorRow}>
                                        <td colSpan={columnCount}>
                                            <OptionEditor
                                                bucket={NEW_BUCKET}
                                                index={group.buckets.length}
                                                total={group.buckets.length + 1}
                                                role={role}
                                                busy={busy}
                                                isNew
                                                onCancel={() =>
                                                    setAddingOption(false)
                                                }
                                                onApply={(next) => {
                                                    setAddingOption(false);
                                                    // The editor hands back
                                                    // the whole list; the new
                                                    // one is the one it added.
                                                    onAddOption(
                                                        next[next.length - 1],
                                                    );
                                                }}
                                                buckets={group.buckets}
                                            />
                                        </td>
                                    </tr>
                                )}

                                {categories.map((c) => {
                                    const state = group.byCategory.get(c.id);
                                    return (
                                        <tr key={c.id}>
                                            <th
                                                scope="row"
                                                className={styles.rowName}
                                            >
                                                {c.display}
                                            </th>

                                            {group.buckets.map((bucket) => {
                                                const on = cellOn(
                                                    c.id,
                                                    bucket.key,
                                                );
                                                // Staged, not yet written:
                                                // drawn provisional so a grid
                                                // mid-edit never looks
                                                // already-applied.
                                                const isPending =
                                                    on !==
                                                    (state?.buckets.has(
                                                        bucket.key,
                                                    ) ?? false);
                                                return (
                                                    <td key={bucket.key}>
                                                        {/* A checkbox, because
                                                            a checkbox needs no
                                                            key. These were a
                                                            filled dot and an
                                                            empty one, which
                                                            needed a line of
                                                            prose under the
                                                            grid to say which
                                                            was which — and a
                                                            grid that has to be
                                                            annotated to be
                                                            read is a grid that
                                                            does not read. */}
                                                        <input
                                                            type="checkbox"
                                                            className={`${styles.cell} ${
                                                                isPending
                                                                    ? styles.cellPending
                                                                    : ''
                                                            }`}
                                                            disabled={busy}
                                                            checked={on}
                                                            aria-label={`${bucket.label} on ${c.display}`}
                                                            onChange={(e) =>
                                                                onToggle(
                                                                    c.id,
                                                                    bucket.key,
                                                                    e.target
                                                                        .checked,
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                );
                                            })}

                                            {/* Under the "+ Option" head. */}
                                            <td />

                                            {showsDefaultColumn && (
                                                <td
                                                    className={
                                                        styles.defaultCell
                                                    }
                                                >
                                                    {state ? (
                                                        <select
                                                            className={
                                                                styles.defaultSelect
                                                            }
                                                            value={
                                                                state.defaultBucket ??
                                                                ''
                                                            }
                                                            disabled={busy}
                                                            aria-label={`On ${c.display}, a run with no ${group.name} goes to`}
                                                            onChange={(e) =>
                                                                onDefault(
                                                                    c.id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            {group.buckets
                                                                .filter((b) =>
                                                                    state.buckets.has(
                                                                        b.key,
                                                                    ),
                                                                )
                                                                .map((b) => (
                                                                    <option
                                                                        key={
                                                                            b.key
                                                                        }
                                                                        value={
                                                                            b.key
                                                                        }
                                                                    >
                                                                        {
                                                                            b.label
                                                                        }
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className={
                                                                styles.defaultNone
                                                            }
                                                        >
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Removing the group. The only way to do this used to be
                        unticking every option on every category, one cell at a
                        time, which is not a way to do it. Two steps, because
                        it deletes leaderboards and the records they hold. */}
                    <div className={styles.paletteFoot}>
                        {confirmDelete ? (
                            <>
                                <span className={styles.deleteWarning}>
                                    Delete {group.name} from all {onCount}{' '}
                                    {onCount === 1 ? 'category' : 'categories'}?
                                    {role === 'subcategory' &&
                                        ' Their subcategories collapse back into one leaderboard each.'}
                                </span>
                                <button
                                    type="button"
                                    className={styles.pendingBtn}
                                    disabled={busy}
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    Keep it
                                </button>
                                <button
                                    type="button"
                                    className={styles.deleteConfirm}
                                    disabled={busy}
                                    onClick={() => {
                                        setConfirmDelete(false);
                                        onDelete();
                                    }}
                                >
                                    Delete
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className={styles.deleteAction}
                                disabled={busy}
                                onClick={() => setConfirmDelete(true)}
                            >
                                Delete this {SECTION[role].noun}
                            </button>
                        )}
                    </div>

                    {/* Only when the categories disagree, because only then is
                        there a column to explain. When they agree the sentence
                        above the grid carries this and the column is gone. */}
                    {showsDefaultColumn && (
                        <p className={styles.gridNote}>
                            These categories want different answers for a run
                            that doesn&rsquo;t say which {group.name} it used,
                            so each one names its own.
                        </p>
                    )}

                    {/* Conversion runs one way only, and only from here.
                        Promoting a filter is additive — the board gains
                        leaderboards it did not have. The reverse deletes them,
                        along with every record they held, and it sat at the
                        foot of every subcategory group as a chip you could
                        reach by accident. A demotion that destructive is not a
                        routine action; the only place it stays offered is the
                        drift strip above, where it repairs a contradiction
                        rather than creating one. */}
                    {role === 'filter' && (
                        <div className={styles.paletteFoot}>
                            <button
                                type="button"
                                className={styles.convertAction}
                                disabled={busy}
                                onClick={() => onConvert('subcategory')}
                            >
                                {conversionLabel('subcategory')}
                            </button>
                            {/* The label names the destination; this names what
                                it does to the board. */}
                            <span className={styles.convertNote}>
                                {conversionNote('subcategory')}
                            </span>
                            {isTarget && (
                                <span className={styles.savingNote}>
                                    Saving…
                                </span>
                            )}
                        </div>
                    )}

                    {/* Only splits stage. Details have already been written by
                        the time this would render. */}
                    {role === 'subcategory' && pendingCount > 0 && (
                        <div className={styles.pendingBar}>
                            <span className={styles.pendingLabel}>
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
                                className={styles.pendingApply}
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

/** The blank an "+ Option" editor starts from. */
const NEW_BUCKET: BoardBucket = { key: '', label: '', aliases: [] };

/**
 * Renaming the group, in the head, where its name is.
 *
 * Board-level by necessity: a name that drifted per category is how a board
 * ends up with "Platform" on half of it and "System" on the rest, which reads
 * as two groups and is one.
 */
function RenameGroup({
    role,
    current,
    busy,
    takenNames,
    onCancel,
    onRename,
}: {
    role: VariableRoleId;
    current: string;
    busy: boolean;
    takenNames: Set<string>;
    onCancel: () => void;
    onRename: (next: string) => void;
}) {
    const [name, setName] = useState(current);
    const trimmed = name.trim();
    const normalized = normalizeName(trimmed);
    // Its own current name is not a collision with itself.
    const collision =
        trimmed.length > 0 &&
        normalized !== normalizeName(current) &&
        takenNames.has(normalized)
            ? `${trimmed} already exists on this board.`
            : null;
    const ready =
        trimmed.length > 0 && trimmed !== current && collision === null;

    return (
        <div className={styles.renameRow}>
            <label className={styles.renameField}>
                <span className="visually-hidden">
                    {role === 'subcategory'
                        ? 'Subcategory group name'
                        : 'Filter name'}
                </span>
                <input
                    className={styles.renameInput}
                    value={name}
                    disabled={busy}
                    aria-label={`Rename ${current}`}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && ready) onRename(trimmed);
                        if (e.key === 'Escape') onCancel();
                    }}
                />
            </label>
            {collision && <span className={styles.addError}>{collision}</span>}
            <span className={styles.pendingSpacer} />
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
                className={styles.pendingApply}
                disabled={busy || !ready}
                onClick={() => onRename(trimmed)}
            >
                Rename
            </button>
        </div>
    );
}

/**
 * What an option *is*, edited in place under its own row.
 *
 * Everything here is board-level and fans out to every category carrying the
 * option: a rename means the same rename everywhere, and letting a name drift
 * per category is how a board ends up with two options that are the same
 * option. Which categories carry it stays the grid's job, one row up.
 *
 * Nothing writes on keystroke — a rename relocates runs, so the whole edit is
 * one previewed change.
 *
 * The same editor creates one (`isNew`): a new option asks the same three
 * questions an existing one does, so it gets the same form rather than a
 * second one that drifts from it. Reordering and removing are hidden there,
 * because there is nothing yet to move or remove.
 */
function OptionEditor({
    bucket,
    index,
    total,
    role,
    busy,
    buckets,
    isNew = false,
    onCancel,
    onApply,
}: {
    bucket: BoardBucket;
    index: number;
    total: number;
    role: VariableRoleId;
    busy: boolean;
    buckets: BoardBucket[];
    isNew?: boolean;
    onCancel: () => void;
    onApply: (next: BoardBucket[]) => void;
}) {
    const [label, setLabel] = useState(bucket.label);
    const [aliasText, setAliasText] = useState(bucket.aliases.join(', '));

    const aliases = aliasText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

    const trimmed = label.trim();

    const replaced = (): BoardBucket[] =>
        isNew
            ? [
                  ...buckets,
                  { key: trimmed.toLowerCase(), label: trimmed, aliases },
              ]
            : buckets.map((b) =>
                  b.key === bucket.key ? { ...b, label: trimmed, aliases } : b,
              );

    // A second option spelled the same as an existing one would silently merge
    // into it on the next read, so it is caught here instead.
    const duplicate =
        isNew &&
        trimmed.length > 0 &&
        buckets.some((b) => b.key === trimmed.toLowerCase());

    const move = (delta: number) => {
        const next = [...buckets];
        const [moved] = next.splice(index, 1);
        next.splice(index + delta, 0, moved);
        onApply(next);
    };

    const dirty =
        label.trim() !== bucket.label ||
        aliases.join(' ') !== bucket.aliases.join(' ');

    return (
        <div className={styles.optionEditor}>
            <label className={styles.optionField}>
                <span className={styles.addLabel}>Name</span>
                <input
                    className={styles.addInput}
                    value={label}
                    disabled={busy}
                    onChange={(e) => setLabel(e.target.value)}
                />
            </label>

            <label className={styles.optionField}>
                <span className={styles.addLabel}>
                    Also accepted, comma separated
                </span>
                <input
                    className={styles.addInput}
                    value={aliasText}
                    disabled={busy}
                    placeholder="n64, nin64"
                    onChange={(e) => setAliasText(e.target.value)}
                />
            </label>

            {duplicate && (
                <p className={styles.addError}>
                    {trimmed} is already an option here.
                </p>
            )}

            <div className={styles.optionActions}>
                {!isNew && (
                    <>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy || index === 0}
                            onClick={() => move(-1)}
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className={styles.pendingBtn}
                            disabled={busy || index === total - 1}
                            onClick={() => move(1)}
                        >
                            ↓
                        </button>
                        <button
                            type="button"
                            className={styles.optionRemove}
                            disabled={busy}
                            onClick={() =>
                                onApply(
                                    buckets.filter((b) => b.key !== bucket.key),
                                )
                            }
                        >
                            Remove from every category
                        </button>
                    </>
                )}
                <span className={styles.pendingSpacer} />
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
                    className={styles.pendingApply}
                    disabled={
                        busy || !dirty || duplicate || trimmed.length === 0
                    }
                    onClick={() => onApply(replaced())}
                >
                    {isNew ? 'Preview & add' : 'Preview & apply'}
                </button>
            </div>

            <p className={styles.optionNote}>
                {role === 'subcategory'
                    ? 'Renaming moves every run in this subcategory. Order is the order runners see.'
                    : 'Spellings runners have used are matched against this list, so old runs keep resolving.'}
            </p>
        </div>
    );
}

/**
 * Creating one, without ever asking for a role: the section already answered
 * that question, so the form only collects a name and the options.
 */
function AddVariableForm({
    role,
    busy,
    takenNames,
    categoryCount,
    onCancel,
    onCreate,
}: {
    role: VariableRoleId;
    busy: boolean;
    takenNames: Set<string>;
    categoryCount: number;
    onCancel: () => void;
    onCreate: (name: string, options: string[], defaultIndex: number) => void;
}) {
    const [name, setName] = useState('');
    const [raw, setRaw] = useState('');
    const [defaultOption, setDefaultOption] = useState('');

    const options = raw
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);

    // Where unmatched runs land was silently the first option typed, stated in
    // the note under the form and choosable nowhere. It falls back to the first
    // if the chosen one is edited away, which is the same rule the grid uses.
    const defaultIndex = Math.max(0, options.indexOf(defaultOption));

    const normalized = normalizeName(name);
    const collision =
        normalized.length > 0 && takenNames.has(normalized)
            ? BUILT_IN_FILTERS.some((f) => normalizeName(f) === normalized) ||
              RESERVED_NAMES.includes(normalized)
                ? `${name.trim()} is already a built-in filter.`
                : `${name.trim()} already exists on this board.`
            : null;

    const ready =
        name.trim().length > 0 && options.length > 0 && collision === null;

    return (
        <div className={styles.addForm}>
            <label className={styles.addField}>
                <span className={styles.addLabel}>
                    {role === 'subcategory'
                        ? 'Subcategory group name'
                        : 'Filter name'}
                </span>
                <input
                    className={styles.addInput}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                        role === 'subcategory' ? 'Platform' : 'Controller'
                    }
                />
            </label>

            <label className={styles.addField}>
                <span className={styles.addLabel}>
                    {SECTION[role].options}, one per line
                </span>
                <textarea
                    className={styles.addTextarea}
                    rows={4}
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder={
                        role === 'subcategory'
                            ? 'N64\nVirtual Console\nEmulator'
                            : 'Keyboard\nController'
                    }
                />
            </label>

            {/* Asked, not assumed. This was silently the first option typed —
                stated in the note underneath and choosable nowhere, so getting
                it wrong meant creating the group and then fixing it. */}
            {role === 'subcategory' && options.length > 1 && (
                <label className={styles.addField}>
                    <span className={styles.addLabel}>
                        A run that doesn&rsquo;t say which{' '}
                        {name.trim() || 'option'} it used goes to
                    </span>
                    <select
                        className={styles.addInput}
                        value={options[defaultIndex]}
                        disabled={busy}
                        onChange={(e) => setDefaultOption(e.target.value)}
                    >
                        {options.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            {collision && <p className={styles.addError}>{collision}</p>}

            <p className={styles.addNote}>
                {role === 'subcategory'
                    ? options.length > 1
                        ? `Every featured category is multiplied by ${options.length}. Each one splits into ${options.length} subcategories with their own records.`
                        : 'A subcategory group needs at least two options to split anything.'
                    : `Added to all ${categoryCount} featured ${
                          categoryCount === 1 ? 'category' : 'categories'
                      }. No subcategories, no effect on records.`}
            </p>

            <div className={styles.addActions}>
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
                    className={styles.pendingApply}
                    disabled={busy || !ready}
                    onClick={() => onCreate(name.trim(), options, defaultIndex)}
                >
                    {role === 'subcategory' ? 'Preview & add' : 'Add'}
                </button>
            </div>
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
                <div className={styles.dialogHeader}>
                    <p className={styles.dialogTitle}>{copy.headline}</p>
                </div>

                <div className={styles.dialogBody}>
                    {copy.detail && (
                        <p className={styles.dialogNote}>{copy.detail}</p>
                    )}

                    {preview.categories.length > 0 && (
                        <ul className={styles.dialogList}>
                            {preview.categories.map((c) => (
                                <li key={c.categoryId}>
                                    {c.display} —{' '}
                                    <span className={styles.dialogMoved}>
                                        {c.moved}
                                    </span>{' '}
                                    {c.moved === 1 ? 'run' : 'runs'} move
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.dialogFooter}>
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
                        className={styles.pendingApply}
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
