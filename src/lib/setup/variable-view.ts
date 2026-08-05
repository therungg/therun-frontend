// Board-level view over category-scoped variables.
//
// The game-wide variable SCOPE was removed deliberately: buckets, roles and
// default indexes genuinely differ per category (100% allows Emulator, Any%
// does not), so no single shared row can describe a real board. What a
// moderator *thinks* of as shared is a variable's identity and shape — its
// name, its role, its bucket names.
//
// So sharing comes back as a VIEW and never as a scope. Rows are grouped by
// `nameNormalized`, presented as one board-level object, and every edit fans
// back out as per-category writes. Nothing here is stored shared; there is no
// second tier to resolve through.
import type { VariableRow } from '../../../types/leaderboards.types';

/** The canonical label of a bucket — index 0 is the display form. */
export function bucketLabel(bucket: string[]): string {
    return bucket[0] ?? '';
}

/** Stable identity for a bucket across categories: its canonical label, cased down. */
export function bucketKey(bucket: string[]): string {
    return bucketLabel(bucket).trim().toLowerCase();
}

export interface VariableCategoryState {
    categoryId: number;
    row: VariableRow;
    /** bucketKey set this category carries. */
    buckets: Set<string>;
    role: VariableRow['role'];
    /** bucketKey of the default bucket, or null. */
    defaultBucket: string | null;
}

export interface VariableGroup {
    nameNormalized: string;
    /** Display name; the most common spelling across categories. */
    name: string;
    /**
     * Union of every bucket seen on any category, in first-seen order.
     *
     * `aliases` is the union of the other accepted spellings across
     * categories, canonical excluded. Aliases are part of a bucket's identity
     * rather than its placement — "n64" means the same thing on every
     * category — so they are held board-level and fan back out on write.
     */
    buckets: { key: string; label: string; aliases: string[] }[];
    /** Per-category state, keyed by categoryId. */
    byCategory: Map<number, VariableCategoryState>;
    /** The role most categories use — what "apply this shape" would stamp. */
    dominantRole: VariableRow['role'];
    /** True when categories disagree about the role. */
    roleDrift: boolean;
}

/**
 * Groups a board's category-scoped variable rows into board-level variables.
 *
 * Categories that do not carry a variable simply have no entry in
 * `byCategory` — which is what lets an empty column in the grid mean "not on
 * this category", and ticking any cell in it mean "add it here".
 */
export function groupVariables(rows: VariableRow[]): VariableGroup[] {
    const groups = new Map<string, VariableGroup>();
    // name spelling -> count, so the display name is the majority spelling
    // rather than whichever category happened to sort first.
    const nameCounts = new Map<string, Map<string, number>>();
    const roleCounts = new Map<string, Map<string, number>>();

    for (const row of rows) {
        let group = groups.get(row.nameNormalized);
        if (!group) {
            group = {
                nameNormalized: row.nameNormalized,
                name: row.name,
                buckets: [],
                byCategory: new Map(),
                dominantRole: row.role,
                roleDrift: false,
            };
            groups.set(row.nameNormalized, group);
            nameCounts.set(row.nameNormalized, new Map());
            roleCounts.set(row.nameNormalized, new Map());
        }

        const names = nameCounts.get(row.nameNormalized) as Map<string, number>;
        names.set(row.name, (names.get(row.name) ?? 0) + 1);
        const roles = roleCounts.get(row.nameNormalized) as Map<string, number>;
        roles.set(row.role, (roles.get(row.role) ?? 0) + 1);

        const byKey = new Map(group.buckets.map((b) => [b.key, b]));
        const buckets = new Set<string>();
        for (const bucket of row.values) {
            const key = bucketKey(bucket);
            if (!key) continue;
            buckets.add(key);
            let entry = byKey.get(key);
            if (!entry) {
                entry = { key, label: bucketLabel(bucket), aliases: [] };
                byKey.set(key, entry);
                group.buckets.push(entry);
            }
            for (const alias of bucket.slice(1)) {
                if (!entry.aliases.includes(alias)) entry.aliases.push(alias);
            }
        }

        const defaultBucket =
            row.defaultValueIndex !== null &&
            row.values[row.defaultValueIndex] !== undefined
                ? bucketKey(row.values[row.defaultValueIndex])
                : null;

        group.byCategory.set(row.categoryId, {
            categoryId: row.categoryId,
            row,
            buckets,
            role: row.role,
            defaultBucket,
        });
    }

    for (const group of groups.values()) {
        const names = nameCounts.get(group.nameNormalized);
        if (names) group.name = pickTop(names) ?? group.name;
        const roles = roleCounts.get(group.nameNormalized);
        if (roles) {
            group.roleDrift = roles.size > 1;
            group.dominantRole = (pickTop(roles) ??
                group.dominantRole) as VariableRow['role'];
        }
    }

    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Splits the board's variables into the two things a moderator actually deals
 * with: the ones that create leaderboards and the ones that only filter one.
 *
 * A drifting group (subcategory on some categories, filter on others) is
 * placed by its dominant role and carries its own notice there, rather than
 * being rendered twice. Two grids for one variable reads as two variables,
 * which is the confusion this whole split exists to remove — so the drift is
 * surfaced as an error on the single row instead.
 */
export function partitionGroups(groups: VariableGroup[]): {
    splits: VariableGroup[];
    details: VariableGroup[];
} {
    const splits: VariableGroup[] = [];
    const details: VariableGroup[] = [];
    for (const group of groups) {
        (group.dominantRole === 'subcategory' ? splits : details).push(group);
    }
    return { splits, details };
}

/** Category ids on each side of a role disagreement. */
export function driftSides(group: VariableGroup): {
    subcategory: number[];
    filter: number[];
} {
    const subcategory: number[] = [];
    const filter: number[] = [];
    for (const state of group.byCategory.values()) {
        (state.role === 'subcategory' ? subcategory : filter).push(
            state.categoryId,
        );
    }
    return { subcategory, filter };
}

/**
 * The categories a role conversion would actually rewrite — those carrying the
 * variable under a different role. Categories already on the target role are
 * left out so a conversion never republishes an unchanged row (each write
 * bumps `version` and triggers a rebuild).
 */
export function categoriesToConvert(
    group: VariableGroup,
    to: VariableRow['role'],
): number[] {
    const out: number[] = [];
    for (const state of group.byCategory.values()) {
        if (state.role !== to) out.push(state.categoryId);
    }
    return out;
}

function pickTop(counts: Map<string, number>): string | undefined {
    let best: string | undefined;
    let bestCount = -1;
    for (const [value, count] of counts) {
        if (count > bestCount) {
            best = value;
            bestCount = count;
        }
    }
    return best;
}

/**
 * How many sub-boards a category ends up with: the product of its subcategory
 * variables' bucket counts. Filter variables do not split the board.
 *
 * This is the number the grid shows under itself, so the consequence of
 * ticking a cell is visible where it is caused.
 */
export function subBoardCount(categoryId: number, rows: VariableRow[]): number {
    const subs = rows.filter(
        (r) => r.categoryId === categoryId && r.role === 'subcategory',
    );
    if (subs.length === 0) return 1;
    return subs.reduce((total, r) => total * Math.max(r.values.length, 1), 1);
}

export interface BoardBucket {
    key: string;
    label: string;
    aliases: string[];
}

/**
 * Recomputes every category's `values` from a board-level option list.
 *
 * This is the write path for the edits that are about what an option *is*
 * rather than where it applies — renaming it, changing which spellings it
 * accepts, reordering the list, removing it from the board entirely. Those are
 * identity, and identity is shared: a moderator who renames "VC" to "Virtual
 * Console" means it everywhere, and letting the name drift per category is how
 * a board ends up with two options that are the same option.
 *
 * Placement is NOT touched. A category keeps exactly the options it already
 * carried, minus any dropped from the board list — that stays the grid's job.
 *
 * Only categories whose stored values actually change come back, so a rename
 * of one option does not republish (and rebuild) every category on the board.
 * A category whose aliases have drifted from the board-level union does count
 * as changed and converges on the next edit — deliberately: that is how two
 * spellings of the same option stop existing.
 * A category left with nothing yields `values: []`, which the caller turns
 * into a removal — an empty variable is not a legal shape.
 */
export function rebuildValues(
    group: VariableGroup,
    boardBuckets: BoardBucket[],
): { categoryId: number; values: string[][]; defaultIndex: number | null }[] {
    const out: {
        categoryId: number;
        values: string[][];
        defaultIndex: number | null;
    }[] = [];

    for (const state of group.byCategory.values()) {
        const kept = boardBuckets.filter((b) => state.buckets.has(b.key));
        const values = kept.map((b) => [b.label, ...b.aliases]);

        if (sameValues(state.row.values, values)) continue;

        const at = kept.findIndex((b) => b.key === state.defaultBucket);
        out.push({
            categoryId: state.categoryId,
            values,
            // Only a subcategory needs a default; an emptied variable has
            // nowhere to point one at.
            defaultIndex:
                state.role === 'subcategory' && values.length > 0
                    ? at >= 0
                        ? at
                        : 0
                    : null,
        });
    }

    return out;
}

function sameValues(a: string[][], b: string[][]): boolean {
    if (a.length !== b.length) return false;
    return a.every((bucket, i) => {
        const other = b[i];
        return (
            bucket.length === other.length &&
            bucket.every((v, j) => v === other[j])
        );
    });
}

/** One staged cell toggle, before it is applied. */
export interface PendingToggle {
    categoryId: number;
    bucketKey: string;
    /** true = the bucket should be on this category after apply. */
    on: boolean;
}

/**
 * Resolves a group plus staged toggles into the bucket list each affected
 * category should end up with, ready to become write payloads.
 *
 * Returns one entry per category whose bucket set actually changes. A category
 * left with no buckets at all yields `buckets: []`, which the caller turns
 * into a removal rather than an empty variable — an empty variable is not a
 * legal shape (the backend requires a non-empty values array).
 */
export function resolveToggles(
    group: VariableGroup,
    toggles: PendingToggle[],
): { categoryId: number; buckets: string[] }[] {
    if (toggles.length === 0) return [];

    const touched = new Set(toggles.map((t) => t.categoryId));
    const out: { categoryId: number; buckets: string[] }[] = [];

    for (const categoryId of touched) {
        const current = new Set(
            group.byCategory.get(categoryId)?.buckets ?? [],
        );
        for (const toggle of toggles) {
            if (toggle.categoryId !== categoryId) continue;
            if (toggle.on) current.add(toggle.bucketKey);
            else current.delete(toggle.bucketKey);
        }

        const before = group.byCategory.get(categoryId)?.buckets ?? new Set();
        if (sameSet(before, current)) continue;

        // Emitted in the group's bucket order so a category's values keep the
        // board's ordering rather than the order cells happened to be clicked.
        out.push({
            categoryId,
            buckets: group.buckets
                .map((b) => b.key)
                .filter((k) => current.has(k)),
        });
    }

    return out;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
}
