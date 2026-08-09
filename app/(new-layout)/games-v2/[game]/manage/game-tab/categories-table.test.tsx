// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManageCategoryRow } from '~src/lib/category-mgmt';

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
vi.mock('./actions/reorder-categories.action', () => ({
    reorderCategoriesAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

import { CategoriesTable } from './categories-table';

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
        ...patch,
    } as ManageCategoryRow;
}

function renderTable(rows: ManageCategoryRow[]) {
    return render(
        <CategoriesTable
            game={GAME}
            rows={rows}
            config={[]}
            groups={[]}
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
});

describe('CategoriesTable — featured suggestions', () => {
    it('offers the busiest categories while the board features nothing', () => {
        // The public band lists Featured categories only, so a board with none
        // renders empty. The wizard pre-ticks its picks; this screen writes on
        // click, so it offers them instead of deciding.
        renderTable(BUSY);

        expect(screen.getByText(/board shows no categories/)).toBeTruthy();
        expect(screen.getByText('Any%, 120 Star')).toBeTruthy();
    });

    it('goes quiet as soon as one category is featured', () => {
        // A moderator's own curation beats the heuristic — one pick means they
        // are done being helped.
        renderTable([row({ id: 1, isMain: true }), ...BUSY.slice(1)]);
        expect(screen.queryByText(/board shows no categories/)).toBeNull();
    });

    it('features every suggestion in one click', () => {
        renderTable(BUSY);
        fireEvent.click(screen.getByRole('button', { name: 'Feature these' }));

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
