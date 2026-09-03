'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Collection, Diagram3, Funnel, Plus } from 'react-bootstrap-icons';
import { toast } from 'react-toastify';
import { compareByBoardOrder } from '~src/lib/console/category-order';
import type {
    CategoryVariableSuggestion,
    VariableChangeInput,
} from '~src/lib/leaderboard-variables';
import type { BoardBucket } from '~src/lib/setup/variable-view';
import {
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
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../../types/leaderboards.types';
import { loadVariableSuggestionsAction } from '../../../manage/variables/actions/load-variable-suggestions.action';
import {
    applyVariableChangesAction,
    previewVariableChangesAction,
} from '../../actions/apply-variable-changes.action';
import { AddVariableForm } from './add-variable-form';
import { ConsequenceDialog } from './consequence-dialog';
import { TriCheckbox } from './tri-checkbox';
import { normalizeName, RESERVED_NAMES } from './variable-keys';
import { VariablePalette } from './variable-palette';
import { VariableSuggestions } from './variable-suggestions';
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
export interface VariablesGridProps {
    game: ResolvedGame;
    /** Every category on the game; the grid narrows to the featured ones. */
    categories: ResolvedCategory[];
    variables: VariableRow[];
    /** The game's groups, used to exclude level subcategories/filters — those
     * are managed in the Levels menu instead. */
    groups: ResolvedGroup[];
}

export function VariablesGrid({
    game,
    categories,
    variables,
    groups,
}: VariablesGridProps) {
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
            categories
                .filter((c) => !c.archived && (c.isMain ?? false))
                .sort(compareByBoardOrder),
        [categories],
    );
    // Level subcategories/filters are managed in the Levels menu, so this grid
    // narrows to variables whose category is NOT in a level-kind group.
    const levelCategoryIds = useMemo(() => {
        const levelGroupIds = new Set(
            groups.filter((g) => g.kind === 'level').map((g) => g.id),
        );
        return new Set(
            categories
                .filter(
                    (c) => c.groupId != null && levelGroupIds.has(c.groupId),
                )
                .map((c) => c.id),
        );
    }, [groups, categories]);
    const fullGameVariables = useMemo(
        () => variables.filter((v) => !levelCategoryIds.has(v.categoryId)),
        [variables, levelCategoryIds],
    );

    const variableGroups = useMemo(
        () => groupVariables(fullGameVariables),
        [fullGameVariables],
    );
    const { splits, details } = useMemo(
        () => partitionGroups(variableGroups),
        [variableGroups],
    );

    /** Names already taken, so a new one collides before it is typed. */
    const takenNames = useMemo(
        () =>
            new Set([
                ...variableGroups.map((g) => g.nameNormalized),
                ...BUILT_IN_FILTERS.map(normalizeName),
                ...RESERVED_NAMES,
            ]),
        [variableGroups],
    );

    // Suggestions are loaded once here, on entry, rather than inside the
    // suggestion list — the manual add form also needs them, to warn when a
    // moderator adds a variable barely anyone submits. `mainIdsKey` is a stable
    // primitive so the effect doesn't refire on every render of `mains`.
    const [suggestions, setSuggestions] = useState<
        CategoryVariableSuggestion[]
    >([]);
    const [suggestionsError, setSuggestionsError] = useState<string | null>(
        null,
    );
    const [suggestionsLoading, startSuggestionsLoad] = useTransition();
    const mainIdsKey = mains.map((c) => c.id).join(',');
    useEffect(() => {
        const ids = mainIdsKey ? mainIdsKey.split(',').map(Number) : [];
        if (ids.length === 0) {
            setSuggestions([]);
            return;
        }
        startSuggestionsLoad(async () => {
            const res = await loadVariableSuggestionsAction({
                gameSlug: game.name,
                gameId: game.id,
                categoryIds: ids,
            });
            if ('error' in res) {
                setSuggestionsError(res.error);
                setSuggestions([]);
            } else {
                setSuggestionsError(null);
                setSuggestions(res.result);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainIdsKey, game.name, game.id]);

    // Normalized names of every suggested variable — the manual add form warns
    // when a typed name isn't among them (few runners set it anywhere).
    const suggestedNames = useMemo(
        () => new Set(suggestions.map((s) => normalizeName(s.variable))),
        [suggestions],
    );

    // A pre-filled add form the suggestion list opens (the mod picked "add as
    // subcategory/filter" on a suggestion). Owned here so the reused
    // AddVariableForm renders next to the list without the list importing it.
    const [pendingAdd, setPendingAdd] = useState<{
        role: VariableRoleId;
        name: string;
        raw: string;
        selectedIds: number[];
    } | null>(null);

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
                    // Identify the row by its stable key, never re-derived from
                    // the (editable) display name — otherwise a group with a
                    // custom key drifts to a new key on every edit.
                    nameNormalized: group.nameNormalized,
                    role,
                    values,
                    defaultValueIndex:
                        role === 'subcategory' ? keptDefault : null,
                    sortOrder: existing?.row.sortOrder ?? 0,
                    description: existing?.row.description ?? null,
                    // Carried on every write — a full-replace upsert would
                    // otherwise reset this filter's board column to off.
                    showValueOnBoard: existing?.row.showValueOnBoard ?? false,
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
                        nameNormalized: group.nameNormalized,
                        role: to,
                        values: row?.values ?? [],
                        defaultValueIndex:
                            to === 'subcategory'
                                ? (row?.defaultValueIndex ?? 0)
                                : null,
                        sortOrder: row?.sortOrder ?? 0,
                        description: row?.description ?? null,
                        showValueOnBoard: row?.showValueOnBoard ?? false,
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
                        nameNormalized: group.nameNormalized,
                        role: existing?.role ?? group.dominantRole,
                        values: r.values,
                        defaultValueIndex: r.defaultIndex,
                        sortOrder: existing?.row.sortOrder ?? 0,
                        description: existing?.row.description ?? null,
                        showValueOnBoard:
                            existing?.row.showValueOnBoard ?? false,
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
                        nameNormalized: group.nameNormalized,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: index,
                        sortOrder: state.row.sortOrder,
                        description: state.row.description,
                        showValueOnBoard: state.row.showValueOnBoard ?? false,
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
                        nameNormalized: group.nameNormalized,
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
                        showValueOnBoard: state.row.showValueOnBoard ?? false,
                    },
                };
            });
        return { changes, slugs };
    };

    /**
     * Moving a group up or down the section.
     *
     * Display order only: the backend composes a subcategory key from
     * `nameNormalized` sorted alphabetically (resolve-run-variables.ts), so
     * `sortOrder` never participates and no run can change leaderboard because
     * of this. That is why it writes straight through instead of asking.
     *
     * The whole section is renumbered rather than swapping two values, because
     * every group starts life at 0 and swapping zeros moves nothing.
     */
    const buildReorderChanges = (
        section: VariableGroup[],
        group: VariableGroup,
        delta: number,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const from = section.findIndex(
            (g) => g.nameNormalized === group.nameNormalized,
        );
        const to = from + delta;
        if (from < 0 || to < 0 || to >= section.length) {
            return { changes: [], slugs: [] };
        }
        const ordered = [...section];
        const [moved] = ordered.splice(from, 1);
        ordered.splice(to, 0, moved);

        const slugs: string[] = [];
        const changes: VariableChangeInput[] = [];
        ordered.forEach((g, index) => {
            for (const state of g.byCategory.values()) {
                if (state.row.sortOrder === index) continue;
                const cat = mains.find((c) => c.id === state.categoryId);
                if (cat) slugs.push(cat.name);
                changes.push({
                    categoryId: state.categoryId,
                    input: {
                        name: g.name,
                        nameNormalized: g.nameNormalized,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: state.row.defaultValueIndex,
                        sortOrder: index,
                        description: state.row.description,
                        showValueOnBoard: state.row.showValueOnBoard ?? false,
                    },
                });
            }
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
                    // Rename touches ONLY the display name — the key stays the
                    // group's existing identity so the URL and stored runs
                    // don't move.
                    input: {
                        name: nextName,
                        nameNormalized: group.nameNormalized,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: state.row.defaultValueIndex,
                        sortOrder: state.row.sortOrder,
                        description: state.row.description,
                        showValueOnBoard: state.row.showValueOnBoard ?? false,
                    },
                };
            },
        );
        return { changes, slugs };
    };

    /**
     * The group's mod-facing note, on every category that carries it.
     *
     * Board-level for the same reason the name is: a note that drifts per
     * category is a note nobody trusts. Every other field rides through
     * unchanged, because the upsert is a full replace.
     */
    const buildNoteChanges = (
        group: VariableGroup,
        note: string | null,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = [...group.byCategory.values()].map(
            (state): VariableChangeInput => {
                const cat = mains.find((c) => c.id === state.categoryId);
                if (cat) slugs.push(cat.name);
                return {
                    categoryId: state.categoryId,
                    input: {
                        name: state.row.name,
                        nameNormalized: group.nameNormalized,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: state.row.defaultValueIndex,
                        sortOrder: state.row.sortOrder,
                        description: note,
                        showValueOnBoard: state.row.showValueOnBoard ?? false,
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
        // The key (nameNormalized) — the LiveSplit variable runs match on,
        // derived from the display name at creation and then held stable.
        key: string,
        role: VariableRoleId,
        // Each option is its canonical label followed by the other spellings
        // that resolve to it — the same [label, ...aliases] shape a stored row
        // uses, so a group can be created complete instead of created bare and
        // then opened option by option to add spellings.
        options: string[][],
        defaultIndex: number,
        // Filters only: create it already showing its value as a board column.
        showValueOnBoard: boolean,
        // Which featured categories to create it in. Undefined = all of them
        // (the manual-add default); a suggestion narrows it to the categories
        // the moderator picked.
        categoryIds?: number[],
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const targets = categoryIds
            ? mains.filter((c) => categoryIds.includes(c.id))
            : mains;
        return {
            slugs: targets.map((c) => c.name),
            changes: targets.map((c) => ({
                categoryId: c.id,
                input: {
                    name,
                    nameNormalized: key,
                    role,
                    values: options,
                    defaultValueIndex:
                        role === 'subcategory' ? defaultIndex : null,
                    sortOrder: 0,
                    description: null,
                    showValueOnBoard,
                },
            })),
        };
    };

    // One create path for both the manual add form and the suggestion list.
    // A subcategory create relocates runs, so it is previewed; a filter create
    // is additive and applies straight away.
    const createVariable = (
        name: string,
        key: string,
        role: VariableRoleId,
        options: string[][],
        defaultIndex: number,
        showValueOnBoard: boolean,
        categoryIds?: number[],
    ) => {
        const built = buildCreateChanges(
            name,
            key,
            role,
            options,
            defaultIndex,
            showValueOnBoard,
            categoryIds,
        );
        if (role === 'subcategory') openPreview(NEW_KEY, name, built);
        else applyNow(NEW_KEY, name, built);
    };

    /**
     * Turn a filter's board-value column on or off, on every category that
     * carries it. Additive and touches no standings, so it writes straight
     * through like any other filter edit — no preview.
     */
    const buildShowValueChanges = (
        group: VariableGroup,
        show: boolean,
    ): { changes: VariableChangeInput[]; slugs: string[] } => {
        const slugs: string[] = [];
        const changes = [...group.byCategory.values()]
            .filter((state) => (state.row.showValueOnBoard ?? false) !== show)
            .map((state): VariableChangeInput => {
                const cat = mains.find((c) => c.id === state.categoryId);
                if (cat) slugs.push(cat.name);
                return {
                    categoryId: state.categoryId,
                    input: {
                        name: state.row.name,
                        nameNormalized: group.nameNormalized,
                        role: state.role,
                        values: state.row.values,
                        defaultValueIndex: state.row.defaultValueIndex,
                        sortOrder: state.row.sortOrder,
                        description: state.row.description,
                        showValueOnBoard: show,
                    },
                };
            });
        return { changes, slugs };
    };

    const openPreview = (
        key: string,
        name: string,
        built: { changes: VariableChangeInput[]; slugs: string[] },
    ) => {
        if (built.changes.length === 0) return;
        setBusyGroup(key);
        startBusy(async () => {
            const res = await previewVariableChangesAction({
                gameSlug: game.name,
                gameId: game.id,
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
                gameSlug: game.name,
                gameId: game.id,
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

    /**
     * Remove a whole category from the group in one gesture — stages every one
     * of its currently-on options off. An emptied row is a removal
     * (`buildChanges` writes `input: null`), so this is the discoverable
     * equivalent of unticking the row cell by cell.
     */
    const removeCategory = (group: VariableGroup, categoryId: number) => {
        const before = pending.get(group.nameNormalized) ?? [];
        const offs = group.buckets
            .filter((b) => cellOn(group, categoryId, b.key))
            .map((b) => ({ categoryId, bucketKey: b.key, on: false }));
        if (offs.length === 0) return;
        const next = [...before, ...offs];
        setPending((prev) => {
            const map = new Map(prev);
            map.set(group.nameNormalized, next);
            return map;
        });

        // Filters apply on the click, like a cell toggle; subcategories stage
        // and are previewed before they relocate any runs.
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

    /**
     * Stage a batch of cell toggles as one gesture — a column select-all, a
     * whole-grid select-all. Same path as a single toggle: filters apply on
     * the click, subcategories stage for preview. Applying one batch (not one
     * call per cell) avoids the stale-`pending` bug of looping single toggles.
     */
    const toggleCells = (group: VariableGroup, additions: PendingToggle[]) => {
        if (additions.length === 0) return;
        const before = pending.get(group.nameNormalized) ?? [];
        const next = [...before, ...additions];
        setPending((prev) => {
            const map = new Map(prev);
            map.set(group.nameNormalized, next);
            return map;
        });
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
                gameSlug: game.name,
                gameId: game.id,
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

    // Subcategories and filters are configured per featured category, so with
    // nothing featured there is nothing to structure. The note lives here
    // rather than in the wizard step so the console pane gets it too.
    if (mains.length === 0) {
        return (
            <div className={styles.empty}>
                <Collection
                    size={24}
                    className={styles.emptyIcon}
                    aria-hidden
                />
                <p className={styles.emptyTitle}>No featured categories yet</p>
                <p className={styles.emptyNote}>
                    Feature at least one category first. Subcategories and
                    filters are configured per featured category.
                </p>
            </div>
        );
    }

    const sectionProps = (role: VariableRoleId) => ({
        role,
        game: game,
        categories: mains,
        variables: variables,
        busyGroup,
        busy: isBusy,
        takenNames,
        cellOn,
        onToggle: toggleCell,
        onRemoveCategory: removeCategory,
        // Column select-all: the option on/off across every featured category.
        onToggleColumn: (
            group: VariableGroup,
            bucketKey: string,
            on: boolean,
        ) =>
            toggleCells(
                group,
                mains.map((c) => ({ categoryId: c.id, bucketKey, on })),
            ),
        // Whole-grid select-all: every option × every category at once.
        onToggleAll: (group: VariableGroup, on: boolean) =>
            toggleCells(
                group,
                mains.flatMap((c) =>
                    group.buckets.map((b) => ({
                        categoryId: c.id,
                        bucketKey: b.key,
                        on,
                    })),
                ),
            ),
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
        onMoveGroup: (
            section: VariableGroup[],
            group: VariableGroup,
            delta: number,
        ) =>
            applyNow(
                group.nameNormalized,
                group.name,
                buildReorderChanges(section, group, delta),
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
        // The note touches no standings and moves no runs, so it writes
        // straight through in both sections — there is nothing to preview.
        onNote: (group: VariableGroup, note: string | null) =>
            applyNow(
                group.nameNormalized,
                group.name,
                buildNoteChanges(group, note),
            ),
        // Always previewed, whichever section it is in: this is the one action
        // here that destroys rather than edits.
        onDelete: (group: VariableGroup) =>
            openPreview(
                group.nameNormalized,
                group.name,
                buildDeleteChanges(group),
            ),
        onCreate: (
            name: string,
            key: string,
            options: string[][],
            defaultIndex: number,
            showValueOnBoard: boolean,
            categoryIds?: number[],
        ) =>
            createVariable(
                name,
                key,
                role,
                options,
                defaultIndex,
                showValueOnBoard,
                categoryIds,
            ),
        // Filters only: toggling the board-value column is additive, so it
        // writes straight through with no preview.
        onShowValue: (group: VariableGroup, show: boolean) =>
            applyNow(
                group.nameNormalized,
                group.name,
                buildShowValueChanges(group, show),
            ),
        suggestedNames,
    });

    return (
        <>
            {/* Suggested variables lead the step: what runners actually submit,
                per category, so the decision of what to bucket comes before the
                configuring. Adding one opens the section's add form pre-filled;
                it also drives the manual-add warning below. */}
            <VariableSuggestions
                suggestions={suggestions}
                loading={suggestionsLoading}
                error={suggestionsError}
                categories={mains}
                existingVariables={variables}
                onAdd={(prefill) => setPendingAdd(prefill)}
            />

            {pendingAdd && (
                <AddVariableForm
                    key={`${pendingAdd.role}:${pendingAdd.name}`}
                    role={pendingAdd.role}
                    busy={isBusy}
                    takenNames={takenNames}
                    categories={mains}
                    suggestedNames={suggestedNames}
                    initialName={pendingAdd.name}
                    initialRaw={pendingAdd.raw}
                    initialSelectedIds={pendingAdd.selectedIds}
                    onCancel={() => setPendingAdd(null)}
                    onCreate={(
                        name,
                        key,
                        options,
                        defaultIndex,
                        showValueOnBoard,
                        categoryIds,
                    ) => {
                        setPendingAdd(null);
                        createVariable(
                            name,
                            key,
                            pendingAdd.role,
                            options,
                            defaultIndex,
                            showValueOnBoard,
                            categoryIds,
                        );
                    }}
                />
            )}

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

interface SectionProps {
    role: VariableRoleId;
    game: ResolvedGame;
    groups: VariableGroup[];
    categories: ResolvedCategory[];
    variables: VariableRow[];
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
    onRemoveCategory: (group: VariableGroup, categoryId: number) => void;
    onToggleColumn: (
        group: VariableGroup,
        bucketKey: string,
        on: boolean,
    ) => void;
    onToggleAll: (group: VariableGroup, on: boolean) => void;
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
    onMoveGroup: (
        section: VariableGroup[],
        group: VariableGroup,
        delta: number,
    ) => void;
    onAddOption: (group: VariableGroup, bucket: BoardBucket) => void;
    onRename: (group: VariableGroup, nextName: string) => void;
    onNote: (group: VariableGroup, note: string | null) => void;
    onDelete: (group: VariableGroup) => void;
    onCreate: (
        name: string,
        key: string,
        options: string[][],
        defaultIndex: number,
        showValueOnBoard: boolean,
        categoryIds?: number[],
    ) => void;
    /** Filters only: turn the board-value column on/off for a whole group. */
    onShowValue: (group: VariableGroup, show: boolean) => void;
    /** Normalized names of suggested variables, for the off-list add warning. */
    suggestedNames: Set<string>;
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
    onRemoveCategory,
    onToggleColumn,
    onToggleAll,
    pendingCount,
    onDiscard,
    onStage,
    onConvert,
    onBuckets,
    onDefault,
    onDefaultAll,
    onMoveGroup,
    onAddOption,
    onRename,
    onNote,
    onDelete,
    onCreate,
    onShowValue,
    suggestedNames,
}: SectionProps) {
    const [adding, setAdding] = useState(false);
    const copy = SECTION[role];

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
                        built in (nothing to configure)
                    </span>
                </div>
            )}

            {groups.length === 0 ? (
                <div className={styles.empty}>
                    {role === 'subcategory' ? (
                        <Diagram3
                            size={24}
                            className={styles.emptyIcon}
                            aria-hidden
                        />
                    ) : (
                        <Funnel
                            size={24}
                            className={styles.emptyIcon}
                            aria-hidden
                        />
                    )}
                    <p className={styles.emptyTitle}>
                        {role === 'subcategory'
                            ? 'No subcategories'
                            : 'Only the built-in filters'}
                    </p>
                    <p className={styles.emptyNote}>
                        {role === 'subcategory'
                            ? 'Every featured category is a single leaderboard. Add a subcategory group when a category is really several leaderboards (Platform, Region, Glitches), each with its own record.'
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
                        onRemoveCategory={(categoryId) =>
                            onRemoveCategory(group, categoryId)
                        }
                        onToggleColumn={(bucketKey, on) =>
                            onToggleColumn(group, bucketKey, on)
                        }
                        onToggleAll={(on) => onToggleAll(group, on)}
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
                        onMove={(delta) => onMoveGroup(groups, group, delta)}
                        position={groups.indexOf(group)}
                        total={groups.length}
                        onAddOption={(bucket) => onAddOption(group, bucket)}
                        onRename={(next) => onRename(group, next)}
                        onNote={(next) => onNote(group, next)}
                        onDelete={() => onDelete(group)}
                        showValueOnBoard={group.showValueOnBoard}
                        onShowValue={(show) => onShowValue(group, show)}
                        takenNames={takenNames}
                    />
                ))
            )}

            {adding ? (
                <AddVariableForm
                    role={role}
                    busy={busy}
                    takenNames={takenNames}
                    categories={categories}
                    suggestedNames={suggestedNames}
                    onCancel={() => setAdding(false)}
                    onCreate={(
                        name,
                        key,
                        options,
                        defaultIndex,
                        showValueOnBoard,
                        categoryIds,
                    ) => {
                        setAdding(false);
                        onCreate(
                            name,
                            key,
                            options,
                            defaultIndex,
                            showValueOnBoard,
                            categoryIds,
                        );
                    }}
                />
            ) : (
                <button
                    type="button"
                    className={styles.addAction}
                    disabled={busy}
                    onClick={() => setAdding(true)}
                >
                    <Plus size={16} aria-hidden />
                    {copy.add}
                </button>
            )}
        </section>
    );
}
