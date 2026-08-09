// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    setGroupHiddenAction: vi.fn(async () => ({ ok: true })),
    toastError: vi.fn(),
}));

vi.mock('~src/actions/category-group/set-group-hidden.action', () => ({
    setGroupHiddenAction: mocks.setGroupHiddenAction,
}));
vi.mock('~src/actions/category-group/create-group.action', () => ({
    createGroupAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('~src/actions/category-group/delete-group.action', () => ({
    deleteGroupAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('~src/actions/category-group/rename-group.action', () => ({
    renameGroupAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('~src/actions/category-group/reorder-groups.action', () => ({
    reorderGroupsAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('react-toastify', () => ({
    toast: { error: mocks.toastError, success: vi.fn() },
}));

import { GroupsSection } from './groups-section';

const GAME = { id: 1, name: 'example-game', display: 'Example Game' } as never;

function renderSection(hiddenByDefault: boolean) {
    return render(
        <GroupsSection
            game={GAME}
            groups={[
                {
                    id: 5,
                    name: 'Main',
                    sortOrder: 1,
                    hiddenByDefault,
                    displayMode: null,
                },
            ]}
            rows={[]}
            snapshotGroups={
                [
                    { id: 5, name: 'Main', sortOrder: 1, hiddenByDefault },
                ] as never
            }
            onGroupsChange={vi.fn()}
            onRowGroupChange={vi.fn()}
        />,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('GroupsSection — collapsed by default', () => {
    it('reads the flag from the snapshot, which ManageGroup does not carry', () => {
        renderSection(true);
        const box = screen.getByLabelText(
            'Collapsed by default',
        ) as HTMLInputElement;
        expect(box.checked).toBe(true);
    });

    it('writes the flag — the console could not reach it before', () => {
        renderSection(false);
        fireEvent.click(screen.getByLabelText('Collapsed by default'));

        expect(mocks.setGroupHiddenAction).toHaveBeenCalledWith({
            gameSlug: 'example-game',
            gameId: 1,
            groupId: 5,
            hiddenByDefault: true,
        });
    });

    it('flips the box back when the write fails', async () => {
        mocks.setGroupHiddenAction.mockResolvedValueOnce({
            error: 'nope',
        } as never);
        renderSection(false);

        const box = screen.getByLabelText(
            'Collapsed by default',
        ) as HTMLInputElement;
        fireEvent.click(box);
        await vi.waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
        expect(box.checked).toBe(false);
    });
});
