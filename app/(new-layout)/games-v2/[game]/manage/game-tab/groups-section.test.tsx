// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
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

import type { ManageGroup } from '~src/lib/category-mgmt';
import { GroupsSection } from './groups-section';

const GAME = { id: 1, name: 'example-game', display: 'Example Game' } as never;

const onGroupsChangeSpy = vi.fn();

// Collapsed is now optimistic through onGroupsChange (like displayMode),
// not a local set, so the harness needs to actually feed updated groups
// back in for the checkbox to reflect the new state.
function StatefulSection({ hiddenByDefault }: { hiddenByDefault: boolean }) {
    const [groups, setGroups] = useState<ManageGroup[]>([
        {
            id: 5,
            name: 'Main',
            sortOrder: 1,
            hiddenByDefault,
            displayMode: null,
            kind: 'normal',
            rules: null,
        },
    ]);
    return (
        <GroupsSection
            game={GAME}
            groups={groups}
            rows={[]}
            onGroupsChange={(next) => {
                onGroupsChangeSpy(next);
                setGroups(next);
            }}
            onRowGroupChange={vi.fn()}
        />
    );
}

function renderSection(hiddenByDefault: boolean) {
    return render(<StatefulSection hiddenByDefault={hiddenByDefault} />);
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('GroupsSection — collapsed by default', () => {
    it('reads the flag straight off the group', () => {
        renderSection(true);
        const box = screen.getByLabelText(
            'Collapsed by default',
        ) as HTMLInputElement;
        expect(box.checked).toBe(true);
    });

    it('writes the flag optimistically through onGroupsChange', () => {
        renderSection(false);
        fireEvent.click(screen.getByLabelText('Collapsed by default'));

        expect(onGroupsChangeSpy).toHaveBeenCalledWith([
            expect.objectContaining({ id: 5, hiddenByDefault: true }),
        ]);
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
