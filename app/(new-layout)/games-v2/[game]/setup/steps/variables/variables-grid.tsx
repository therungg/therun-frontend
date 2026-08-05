'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useMemo, useState, useTransition } from 'react';
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
 * a bucket x category grid, and every edit fans out as per-category writes.
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
     * Where one category's unmatched runs land. Per category by nature — the
     * option that is "normal" on Any% is not the one that is normal on 100% —
     * so this is the one edit in this zone that is not fanned out.
     */
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

    /** New variable on every featured category, role fixed by its section. */
    const buildCreateChanges = (
        name: string,
        role: VariableRoleId,
        options: string[],
    ): { changes: VariableChangeInput[]; slugs: string[] } => ({
        slugs: mains.map((c) => c.name),
        changes: mains.map((c) => ({
            categoryId: c.id,
            input: {
                name,
                role,
                values: options.map((o) => [o]),
                defaultValueIndex: role === 'subcategory' ? 0 : null,
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
        onCreate: (name: string, options: string[]) => {
            const built = buildCreateChanges(name, role, options);
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
    onCreate: (name: string, options: string[]) => void;
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
                        variables={variables}
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
                    onCreate={(name, options) => {
                        setAdding(false);
                        onCreate(name, options);
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
    variables,
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
}: {
    group: VariableGroup;
    role: VariableRoleId;
    categories: ResolvedCategory[];
    variables: WizardData['variables'];
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
}) {
    const [open, setOpen] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const onCount = categories.filter((c) => group.byCategory.has(c.id)).length;
    const displayOf = (id: number) =>
        categories.find((c) => c.id === id)?.display ?? `#${id}`;
    const sides = driftSides(group);

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
                    on {onCount} of {categories.length} · {group.buckets.length}{' '}
                    {SECTION[role].options.toLowerCase()}
                </span>
                {pendingCount > 0 && (
                    <span className={styles.pendingBadge}>
                        {pendingCount} pending
                    </span>
                )}
            </button>

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
                                {group.buckets.map((bucket, bucketIdx) => (
                                    <Fragment key={bucket.key}>
                                        <tr>
                                            <th>
                                                {/* The option's own row header is
                                                how you edit the option. Same
                                                rule as the category matrix:
                                                click the thing to edit the
                                                thing, and never leave the
                                                grid to do it. */}
                                                <button
                                                    type="button"
                                                    className={
                                                        styles.optionButton
                                                    }
                                                    aria-expanded={
                                                        editing === bucket.key
                                                    }
                                                    onClick={() =>
                                                        setEditing(
                                                            editing ===
                                                                bucket.key
                                                                ? null
                                                                : bucket.key,
                                                        )
                                                    }
                                                >
                                                    {bucket.label}
                                                    {bucket.aliases.length >
                                                        0 && (
                                                        <span
                                                            className={
                                                                styles.aliasCount
                                                            }
                                                        >
                                                            +
                                                            {
                                                                bucket.aliases
                                                                    .length
                                                            }
                                                        </span>
                                                    )}
                                                </button>
                                            </th>
                                            {categories.map((c) => {
                                                const on = cellOn(
                                                    c.id,
                                                    bucket.key,
                                                );
                                                // Only a subcategory has somewhere
                                                // for an unmatched run to land, so
                                                // the default marker is meaningless
                                                // in the filters section.
                                                const isDefault =
                                                    role === 'subcategory' &&
                                                    group.byCategory.get(c.id)
                                                        ?.defaultBucket ===
                                                        bucket.key;
                                                // Staged, not yet written: drawn
                                                // provisional so a grid mid-edit
                                                // never looks already-applied.
                                                const isPending =
                                                    on !==
                                                    (group.byCategory
                                                        .get(c.id)
                                                        ?.buckets.has(
                                                            bucket.key,
                                                        ) ?? false);
                                                return (
                                                    <td key={c.id}>
                                                        <button
                                                            type="button"
                                                            className={`${styles.cell} ${
                                                                on
                                                                    ? styles.cellOn
                                                                    : styles.cellOff
                                                            } ${
                                                                isPending
                                                                    ? styles.cellPending
                                                                    : ''
                                                            }`}
                                                            disabled={busy}
                                                            aria-pressed={on}
                                                            aria-label={`${bucket.label} on ${c.display}`}
                                                            title={
                                                                isDefault
                                                                    ? 'Runs that do not say land in this subcategory'
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
                                        {editing === bucket.key && (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        categories.length + 1
                                                    }
                                                >
                                                    <OptionEditor
                                                        bucket={bucket}
                                                        index={bucketIdx}
                                                        total={
                                                            group.buckets.length
                                                        }
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
                                    </Fragment>
                                ))}

                                {/* Where unmatched runs land, per category —
                                    the one thing here that genuinely differs
                                    per category, so it is a row of its own
                                    rather than a board-level value. */}
                                {role === 'subcategory' && (
                                    <tr className={styles.defaultRow}>
                                        <th>Runs that don&rsquo;t say</th>
                                        {categories.map((c) => {
                                            const state = group.byCategory.get(
                                                c.id,
                                            );
                                            if (!state) {
                                                return (
                                                    <td key={c.id}>
                                                        <span
                                                            className={
                                                                styles.defaultNone
                                                            }
                                                        >
                                                            —
                                                        </span>
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td key={c.id}>
                                                    <select
                                                        className={
                                                            styles.defaultSelect
                                                        }
                                                        value={
                                                            state.defaultBucket ??
                                                            ''
                                                        }
                                                        disabled={busy}
                                                        aria-label={`Default option for ${c.display}`}
                                                        onChange={(e) =>
                                                            onDefault(
                                                                c.id,
                                                                e.target.value,
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
                                                                    key={b.key}
                                                                    value={
                                                                        b.key
                                                                    }
                                                                >
                                                                    {b.label}
                                                                </option>
                                                            ))}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* The consequence, shown where it is caused. */}
                    <p className={styles.consequence}>
                        {role === 'subcategory'
                            ? categories
                                  .filter((c) => group.byCategory.has(c.id))
                                  .map((c) => {
                                      const n = subBoardCount(c.id, variables);
                                      return `${c.display} → ${n} ${
                                          n === 1
                                              ? 'leaderboard'
                                              : 'subcategories'
                                      }`;
                                  })
                                  .join(' · ') || 'Not on any category yet.'
                            : 'Narrows the leaderboard. No subcategories, no effect on records.'}
                    </p>

                    <div className={styles.paletteFoot}>
                        <button
                            type="button"
                            className={styles.convertAction}
                            disabled={busy}
                            onClick={() =>
                                onConvert(
                                    role === 'subcategory'
                                        ? 'filter'
                                        : 'subcategory',
                                )
                            }
                        >
                            {conversionLabel(
                                role === 'subcategory'
                                    ? 'filter'
                                    : 'subcategory',
                            )}
                        </button>
                        {role === 'filter' && isTarget && (
                            <span className={styles.savingNote}>Saving…</span>
                        )}
                    </div>

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
 */
function OptionEditor({
    bucket,
    index,
    total,
    role,
    busy,
    buckets,
    onCancel,
    onApply,
}: {
    bucket: BoardBucket;
    index: number;
    total: number;
    role: VariableRoleId;
    busy: boolean;
    buckets: BoardBucket[];
    onCancel: () => void;
    onApply: (next: BoardBucket[]) => void;
}) {
    const [label, setLabel] = useState(bucket.label);
    const [aliasText, setAliasText] = useState(bucket.aliases.join(', '));

    const aliases = aliasText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

    const replaced = (): BoardBucket[] =>
        buckets.map((b) =>
            b.key === bucket.key ? { ...b, label: label.trim(), aliases } : b,
        );

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

            <div className={styles.optionActions}>
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
                        onApply(buckets.filter((b) => b.key !== bucket.key))
                    }
                >
                    Remove from every category
                </button>
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
                    disabled={busy || !dirty || label.trim().length === 0}
                    onClick={() => onApply(replaced())}
                >
                    Preview &amp; apply
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
    onCreate: (name: string, options: string[]) => void;
}) {
    const [name, setName] = useState('');
    const [raw, setRaw] = useState('');

    const options = raw
        .split('\n')
        .map((v) => v.trim())
        .filter(Boolean);

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

            {collision && <p className={styles.addError}>{collision}</p>}

            <p className={styles.addNote}>
                {role === 'subcategory'
                    ? options.length > 1
                        ? `Every featured category is multiplied by ${options.length}. Each one splits into ${options.length} subcategories with their own records; runs that do not say land in ${options[0]}.`
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
                    onClick={() => onCreate(name.trim(), options)}
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
