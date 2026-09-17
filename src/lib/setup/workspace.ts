import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../types/leaderboards.types';
import { compareByBoardOrder } from '../console/category-order';
import { splitLevelBoards } from '../levels/display';

/**
 * Categories and levels are two separate things to a moderator, but a level is
 * a category, so both are edited through the same screens in the same order.
 * This module is the one description of those screens: the wizard's sub-steps,
 * the console's nav items and the screens' own headings all read it.
 */
export type WorkspaceKind = 'categories' | 'levels';

export type WorkspaceSubId = 'list' | 'groups' | 'settings' | 'subcategories';

/** A console pane id: `?pane=<kind>/<sub>`. */
export type WorkspacePaneId =
    | 'categories/list'
    | 'categories/groups'
    | 'categories/settings'
    | 'categories/subcategories'
    | 'levels/list'
    | 'levels/settings'
    | 'levels/subcategories';

export interface WorkspaceScreenMeta {
    id: WorkspaceSubId;
    /** Short label: the rail's sub-item, the tab, the console nav item. */
    label: string;
    title: string;
    lede: string;
}

export const WORKSPACE_KIND_LABEL: Record<WorkspaceKind, string> = {
    categories: 'Categories',
    levels: 'Levels',
};

const SCREENS: Record<WorkspaceKind, WorkspaceScreenMeta[]> = {
    categories: [
        {
            id: 'list',
            label: 'List',
            title: 'Which categories are on the board?',
            lede: 'Add the categories runners already submit to, or make a new one. Drag a row to set the order the board shows them in.',
        },
        {
            id: 'groups',
            label: 'Groups',
            title: 'Do these categories belong in groups?',
            lede: 'Groups split the category rail into labelled sections, like Main, Miscellaneous or Category Extensions.',
        },
        {
            id: 'settings',
            label: 'Settings',
            title: 'Category settings',
            lede: 'Timing, minimum time, rules and milliseconds for every category on the board.',
        },
        {
            id: 'subcategories',
            label: 'Subcategories & filters',
            title: 'Subcategories & filters',
            lede: 'Split a category into several leaderboards, or let runners narrow one down without splitting it.',
        },
    ],
    levels: [
        {
            id: 'list',
            label: 'List',
            title: 'Does this game have individual levels?',
            lede: 'Each level is its own board, picked from the Levels dropdown on the leaderboard. A new level starts with the subcategories and filters of the last level in the list.',
        },
        {
            id: 'settings',
            label: 'Settings',
            title: 'Level settings',
            lede: 'Timing, minimum time, rules and milliseconds for every level.',
        },
        {
            id: 'subcategories',
            label: 'Subcategories & filters',
            title: 'Level subcategories & filters',
            lede: 'Split a level into several leaderboards, or let runners narrow one down without splitting it.',
        },
    ],
};

export function workspaceScreens(kind: WorkspaceKind): WorkspaceScreenMeta[] {
    return SCREENS[kind];
}

export function workspaceScreen(
    kind: WorkspaceKind,
    sub: string | null | undefined,
): WorkspaceScreenMeta | null {
    return SCREENS[kind].find((s) => s.id === sub) ?? null;
}

export function isWorkspaceSub(
    kind: WorkspaceKind,
    raw: string | null | undefined,
): raw is WorkspaceSubId {
    return workspaceScreen(kind, raw) !== null;
}

export function workspacePaneId(
    kind: WorkspaceKind,
    sub: WorkspaceSubId,
): WorkspacePaneId {
    return `${kind}/${sub}` as WorkspacePaneId;
}

/** Reads a `?pane=` value back into its screen, or null for any other pane. */
export function workspacePaneOf(
    id: string | null | undefined,
): { kind: WorkspaceKind; sub: WorkspaceSubId } | null {
    if (!id) return null;
    const [kind, sub] = id.split('/');
    if (kind !== 'categories' && kind !== 'levels') return null;
    return isWorkspaceSub(kind, sub) ? { kind, sub } : null;
}

export function levelGroupIds(
    groups: ReadonlyArray<{ id: number; kind: string }>,
): Set<number> {
    return new Set(groups.filter((g) => g.kind === 'level').map((g) => g.id));
}

/** Every category of this kind, archived and off-board ones included. */
export function categoriesOfKind<T extends { groupId?: number | null }>(
    categories: T[],
    groups: ReadonlyArray<{ id: number; kind: string }>,
    kind: WorkspaceKind,
): T[] {
    const { fullGame, levelBoards } = splitLevelBoards(categories, groups);
    return kind === 'levels' ? levelBoards : fullGame;
}

/**
 * What is on the board for this kind, in board order.
 *
 * A category is on the board when it is featured and not archived. A level is
 * on the board when it is not archived: levels are created featured, and the
 * only way a level leaves is archiving, so a level that somehow lost its
 * featured flag must still show up here to be fixed.
 */
export function boardsOfKind(
    categories: ResolvedCategory[],
    groups: ReadonlyArray<{ id: number; kind: string }>,
    kind: WorkspaceKind,
): ResolvedCategory[] {
    return categoriesOfKind(categories, groups, kind)
        .filter(
            (c) => !c.archived && (kind === 'levels' || (c.isMain ?? false)),
        )
        .sort(compareByBoardOrder);
}

/**
 * The From runs panel: full-game categories that are not on the board and not
 * archived. Runner-backed categories come first, busiest first (one prolific
 * runner can inflate a run count on their own, so runners rank ahead of
 * runs); zero-runner categories follow, alphabetically, so a removed
 * category always has a way back onto the board.
 */
export function fromRunsPool(
    categories: ResolvedCategory[],
    groups: ReadonlyArray<{ id: number; kind: string }>,
): ResolvedCategory[] {
    return categoriesOfKind(categories, groups, 'categories')
        .filter((c) => !c.archived && !(c.isMain ?? false))
        .sort((a, b) => {
            const aRunners = a.uniqueRunners ?? 0;
            const bRunners = b.uniqueRunners ?? 0;
            const aHasRunners = aRunners > 0;
            const bHasRunners = bRunners > 0;
            if (aHasRunners !== bHasRunners) return aHasRunners ? -1 : 1;
            if (!aHasRunners) return a.display.localeCompare(b.display);
            return (
                bRunners - aRunners ||
                (b.totalFinishedAttemptCount ?? 0) -
                    (a.totalFinishedAttemptCount ?? 0)
            );
        });
}

export function kindOfCategory(
    categoryId: number,
    categories: ReadonlyArray<{ id: number; groupId?: number | null }>,
    groups: ReadonlyArray<{ id: number; kind: string }>,
): WorkspaceKind | null {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return null;
    return category.groupId != null &&
        levelGroupIds(groups).has(category.groupId)
        ? 'levels'
        : 'categories';
}

// Re-exported so screens import one module for "which rows are mine".
export type { ResolvedGroup };
