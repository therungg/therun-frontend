// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { LevelTemplate } from '../../../../../../types/levels.types';

const mocks = vi.hoisted(() => ({
    updateVisibilityAction: vi.fn(async () => ({ ok: true })),
    fireUndoToast: vi.fn(),
}));

vi.mock('../visibility/actions/update-visibility.action', () => ({
    updateVisibilityAction: mocks.updateVisibilityAction,
}));
vi.mock('../moderation/shared/undo-toast', () => ({
    fireUndoToast: mocks.fireUndoToast,
}));
vi.mock('~src/actions/category-group/assign-category-group.action', () => ({
    assignCategoryGroupAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('~src/actions/category-group/create-group.action', () => ({
    createGroupAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../game-tab/actions/reorder-categories.action', () => ({
    reorderCategoriesAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

import { BoardCategoriesTable } from './board-categories-table';

const GAME = { id: 1, name: 'example-game', display: 'Example Game' } as never;

function row(patch: Partial<ManageCategoryRow>): ManageCategoryRow {
    return {
        id: 1,
        display: 'Any%',
        sortOrder: 1,
        primaryTiming: 'rt',
        isMain: false,
        active: true,
        groupId: null,
        groupName: null,
        totalRunTime: 0,
        totalFinishedAttemptCount: 0,
        uniqueRunners: 0,
        levelTemplateId: null,
        levelOverride: false,
        ...patch,
    } as ManageCategoryRow;
}

function renderTable(rows: ManageCategoryRow[], groups: ManageGroup[] = []) {
    return render(
        <BoardCategoriesTable
            game={GAME}
            rows={rows}
            config={[]}
            groups={groups}
            onRowChange={vi.fn()}
            onRowGroupChange={vi.fn()}
            onRowsReorder={vi.fn()}
            onGroupCreated={vi.fn()}
            onEdit={vi.fn()}
        />,
    );
}

const BUSY = [
    row({
        id: 1,
        display: 'Any%',
        totalFinishedAttemptCount: 900,
        uniqueRunners: 40,
    }),
    row({
        id: 2,
        display: '120 Star',
        totalFinishedAttemptCount: 700,
        uniqueRunners: 30,
    }),
    row({
        id: 3,
        display: '1 Key',
        totalFinishedAttemptCount: 2,
        uniqueRunners: 1,
    }),
];

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    window.localStorage.clear();
});

describe('BoardCategoriesTable — the board only', () => {
    it('lists featured categories and leaves the rest to the add dialog', () => {
        // The pool behind the add dialog is hundreds of rows on a big game;
        // this table is the board, so an unfeatured category must not appear
        // in it at all.
        renderTable([
            row({ id: 1, display: 'Any%', isMain: true }),
            row({ id: 2, display: 'Junk split', isMain: false }),
        ]);

        expect(screen.getByText('Any%')).toBeTruthy();
        expect(screen.queryByText('Junk split')).toBeNull();
    });

    it('keeps an archived category off the board with no way to unarchive it here', () => {
        // Archiving happens elsewhere now — this table only ever writes
        // isMain, so an archived category can't surface a Restore control.
        renderTable([
            row({ id: 1, display: 'Any%', isMain: true }),
            row({ id: 2, display: 'Old route', isMain: true, active: false }),
        ]);

        expect(screen.queryByText('Old route')).toBeNull();
        expect(
            screen.queryByRole('button', { name: /archived categor/ }),
        ).toBeNull();
        expect(screen.queryByRole('button', { name: 'Restore' })).toBeNull();
    });

    it('removes a category from the board by writing isMain only', () => {
        renderTable([row({ id: 1, display: 'Any%', isMain: true })]);
        fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

        expect(mocks.updateVisibilityAction).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: 1, isMain: false }),
        );
        expect(mocks.updateVisibilityAction).not.toHaveBeenCalledWith(
            expect.objectContaining({ active: false }),
        );
    });
});

describe('BoardCategoriesTable — empty board', () => {
    it('offers the busiest categories while the board has none', () => {
        // An empty board renders an empty public band. The wizard pre-ticks
        // its picks; this screen writes on click, so it offers them instead.
        renderTable(BUSY);

        expect(
            screen.getByText(/public page shows no categories/),
        ).toBeTruthy();
        expect(screen.getByText('Any%, 120 Star')).toBeTruthy();
    });

    it('goes quiet as soon as one category is on the board', () => {
        renderTable([row({ id: 1, isMain: true }), ...BUSY.slice(1)]);
        expect(
            screen.queryByText(/public page shows no categories/),
        ).toBeNull();
    });

    it('adds every suggestion in one click', () => {
        renderTable(BUSY);
        fireEvent.click(screen.getByRole('button', { name: 'Add them' }));

        expect(mocks.updateVisibilityAction).toHaveBeenCalledTimes(2);
        expect(mocks.updateVisibilityAction).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: 1, isMain: true }),
        );
        expect(mocks.updateVisibilityAction).toHaveBeenCalledWith(
            expect.objectContaining({ categoryId: 2, isMain: true }),
        );
    });

    it('ignores archived categories when picking suggestions', () => {
        // Archived is invisible everywhere; suggesting one would propose
        // featuring a category the board refuses to show.
        renderTable([
            row({
                id: 1,
                display: 'Any%',
                active: false,
                totalFinishedAttemptCount: 900,
                uniqueRunners: 40,
            }),
            row({
                id: 2,
                display: '120 Star',
                totalFinishedAttemptCount: 700,
                uniqueRunners: 30,
            }),
        ]);

        const banner = screen.getByRole('status');
        expect(banner.textContent).toContain('120 Star');
        expect(banner.textContent).not.toContain('Any%');
    });
});

function levelGroup(id: number, name: string): ManageGroup {
    return {
        id,
        name,
        sortOrder: id,
        hiddenByDefault: false,
        displayMode: null,
        kind: 'level',
        rules: null,
    };
}

const LEVEL_GROUPS: ManageGroup[] = [
    levelGroup(10, 'E1M1'),
    levelGroup(11, 'E1M2'),
];

const LEVEL_TEMPLATES: LevelTemplate[] = [
    {
        id: 100,
        display: 'Any%',
        rules: null,
        isMain: true,
        sortOrder: 1,
        imageUrl: null,
    },
    {
        id: 101,
        display: 'UV-Max',
        rules: null,
        isMain: true,
        sortOrder: 2,
        imageUrl: null,
    },
];

/** One full-game board plus 2 levels × 2 level categories = 4 level boards. */
const WITH_LEVELS: ManageCategoryRow[] = [
    row({ id: 1, display: '120 Star', isMain: true }),
    ...LEVEL_GROUPS.flatMap((g) =>
        LEVEL_TEMPLATES.map((t) =>
            row({
                id: g.id * 100 + t.id,
                display: `${g.name} — ${t.display}`,
                isMain: true,
                groupId: g.id,
                groupName: g.name,
                levelTemplateId: t.id,
            }),
        ),
    ),
];

describe('BoardCategoriesTable — level boards', () => {
    it('leaves level boards out of this table entirely — the Levels sidebar owns them', () => {
        // Level boards follow their template, not this table, and are edited
        // from the Levels sidebar now — this table shows nothing about them
        // at all, not even a collapsed summary.
        renderTable(WITH_LEVELS, LEVEL_GROUPS);

        expect(screen.getByText('120 Star')).toBeTruthy();
        expect(screen.queryByText('E1M1 — Any%')).toBeNull();
        expect(screen.queryByText('E1M1')).toBeNull();
        expect(screen.queryByText(/Level boards/)).toBeNull();
        expect(
            screen.queryByRole('button', { name: /level boards/i }),
        ).toBeNull();
    });

    it('keeps an archived or unfeatured level board out of the full-game archived list too', () => {
        renderTable(
            [
                row({ id: 1, display: '120 Star', isMain: true }),
                row({
                    id: 21,
                    display: 'E1M1 — Any%',
                    isMain: true,
                    active: false,
                    groupId: 10,
                    groupName: 'E1M1',
                    levelTemplateId: 100,
                }),
                row({
                    id: 22,
                    display: 'E1M1 — UV-Max',
                    isMain: false,
                    groupId: 10,
                    groupName: 'E1M1',
                    levelTemplateId: 101,
                }),
            ],
            LEVEL_GROUPS,
        );

        expect(
            screen.queryByRole('button', { name: /archived categor/ }),
        ).toBeNull();
        expect(screen.queryByText(/Level boards/)).toBeNull();
    });

    it('leaves level boards out of the full-game reorder scope', () => {
        // Level board order follows the template, not this table — a
        // full-game row's move must not renumber across them.
        renderTable(WITH_LEVELS, LEVEL_GROUPS);

        expect(
            screen.queryByRole('button', { name: /Move E1M1 — Any% up/ }),
        ).toBeNull();
        expect(
            (
                screen.getByRole('button', {
                    name: 'Move 120 Star down',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });
});
