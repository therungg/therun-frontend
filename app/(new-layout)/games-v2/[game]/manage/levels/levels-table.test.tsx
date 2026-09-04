// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LevelOverview } from '../../../../../../types/levels.types';

vi.mock('~src/actions/levels/create-level.action', () => ({
    createLevelAction: vi.fn(async () => ({ result: { id: 99, created: 1 } })),
}));
vi.mock('~src/actions/levels/update-level.action', () => ({
    updateLevelAction: vi.fn(async () => ({ result: undefined })),
}));
vi.mock('~src/actions/category-group/delete-group.action', () => ({
    deleteGroupAction: vi.fn(async () => ({ result: { deleted: true } })),
}));
vi.mock('~src/actions/levels/level-op.action', () => ({
    levelOpAction: vi.fn(async () => ({ result: {} })),
}));

import { deleteGroupAction } from '~src/actions/category-group/delete-group.action';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { levelOpAction } from '~src/actions/levels/level-op.action';
import { updateLevelAction } from '~src/actions/levels/update-level.action';
import {
    LevelsTable,
    levelBoardSummary,
    needsMaterialise,
} from './levels-table';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const templates: LevelOverview['templates'] = [
    {
        id: 1,
        display: 'Any%',
        isMain: true,
        synced: 1,
        overridden: 0,
        excluded: 0,
        total: 1,
    },
    {
        id: 2,
        display: '100%',
        isMain: true,
        synced: 1,
        overridden: 0,
        excluded: 0,
        total: 1,
    },
];

const levels: LevelOverview['levels'] = [
    {
        id: 10,
        name: 'E1M1',
        rules: null,
        sortOrder: 0,
        instances: [
            {
                categoryId: 100,
                templateId: 1,
                state: 'synced',
                display: 'E1M1 — Any%',
            },
            {
                categoryId: 101,
                templateId: 2,
                state: 'synced',
                display: 'E1M1 — 100%',
            },
        ],
    },
    {
        id: 11,
        name: 'E1M2',
        rules: 'No save states.',
        sortOrder: 1,
        instances: [
            {
                categoryId: 102,
                templateId: 1,
                state: 'synced',
                display: 'E1M2 — Any%',
            },
        ],
    },
];

function noop() {
    return Promise.resolve();
}

describe('levelBoardSummary', () => {
    it('counts how many of the templates this level has', () => {
        expect(levelBoardSummary(levels[0], templates)).toEqual({
            have: 2,
            total: 2,
        });
        expect(levelBoardSummary(levels[1], templates)).toEqual({
            have: 1,
            total: 2,
        });
    });

    it('ignores boards that belong to no template', () => {
        const withLevelOnly = {
            ...levels[0],
            instances: [
                ...levels[0].instances,
                {
                    categoryId: 103,
                    templateId: null,
                    state: 'level-only' as const,
                    display: 'E1M1 — bonus',
                },
            ],
        };
        // Not "3 of 2": a level-only board matches no column.
        expect(levelBoardSummary(withLevelOnly, templates)).toEqual({
            have: 2,
            total: 2,
        });
    });
});

describe('needsMaterialise', () => {
    it('is true when some level is missing some template', () => {
        expect(needsMaterialise(levels, templates)).toBe(true);
    });
    it('is false once every level has every template', () => {
        expect(needsMaterialise([levels[0]], templates)).toBe(false);
    });
    it('is false with no templates at all', () => {
        expect(needsMaterialise(levels, [])).toBe(false);
    });
});

describe('LevelsTable', () => {
    it('lists levels with their board coverage', () => {
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        expect(screen.getByDisplayValue('E1M1')).toBeTruthy();
        expect(screen.getByDisplayValue('E1M2')).toBeTruthy();
        expect(screen.getByText('2 of 2')).toBeTruthy();
        expect(screen.getByText('1 of 2')).toBeTruthy();
    });

    it('adds a level and reports the change', async () => {
        const onChanged = vi.fn(noop);
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={[]}
                templates={[]}
                onChanged={onChanged}
            />,
        );
        expect(screen.getByText(/No levels yet/)).toBeTruthy();
        fireEvent.change(screen.getByPlaceholderText('E1M1'), {
            target: { value: 'E1M3' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add level' }));

        await waitFor(() =>
            expect(createLevelAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                name: 'E1M3',
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('renames a level on blur', async () => {
        const onChanged = vi.fn(noop);
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        const input = screen.getByDisplayValue('E1M1');
        fireEvent.change(input, { target: { value: 'E1M1 renamed' } });
        fireEvent.blur(input);

        await waitFor(() =>
            expect(updateLevelAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                groupId: 10,
                name: 'E1M1 renamed',
            }),
        );
    });

    it('does not save a rename to an empty name, and puts the name back', () => {
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        const input = screen.getByDisplayValue('E1M1') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.blur(input);
        expect(updateLevelAction).not.toHaveBeenCalled();
        expect(input.value).toBe('E1M1');
    });

    it('surfaces an action error instead of reloading', async () => {
        const onChanged = vi.fn(noop);
        vi.mocked(updateLevelAction).mockResolvedValueOnce({
            error: 'Not authorized to manage category groups.',
        });
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        const input = screen.getByDisplayValue('E1M1');
        fireEvent.change(input, { target: { value: 'E1M1 renamed' } });
        fireEvent.blur(input);

        expect(
            await screen.findByText(
                'Not authorized to manage category groups.',
            ),
        ).toBeTruthy();
        expect(onChanged).not.toHaveBeenCalled();
    });

    it('surfaces an error from the create-missing-boards action', async () => {
        const onChanged = vi.fn(noop);
        vi.mocked(levelOpAction).mockResolvedValueOnce({ error: 'no dice' });
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Create missing boards' }),
        );
        expect(await screen.findByText('no dice')).toBeTruthy();
        expect(onChanged).not.toHaveBeenCalled();
    });

    it('surfaces an error from adding a level', async () => {
        const onChanged = vi.fn(noop);
        vi.mocked(createLevelAction).mockResolvedValueOnce({ error: 'nope' });
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={[]}
                templates={[]}
                onChanged={onChanged}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText('E1M1'), {
            target: { value: 'E1M3' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add level' }));
        expect(await screen.findByText('nope')).toBeTruthy();
        expect(onChanged).not.toHaveBeenCalled();
    });

    it('keeps the rules editor open when the save fails', async () => {
        vi.mocked(updateLevelAction).mockResolvedValueOnce({ error: 'nope' });
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Add rules' }));
        fireEvent.change(screen.getByLabelText('Rules for E1M1'), {
            target: { value: 'No skips.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));

        expect(await screen.findByText('nope')).toBeTruthy();
        // Still open, so the draft the user typed isn't lost.
        expect(screen.getByLabelText('Rules for E1M1')).toBeTruthy();
    });

    it('discards the draft when the rules editor is cancelled', async () => {
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Add rules' }));
        fireEvent.change(screen.getByLabelText('Rules for E1M1'), {
            target: { value: 'Typed then abandoned.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        // Reopen and save without retyping: the abandoned draft must not
        // come back, so this saves the level's stored rules (null -> '').
        fireEvent.click(screen.getByRole('button', { name: 'Add rules' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));

        await waitFor(() =>
            expect(updateLevelAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                groupId: 10,
                rules: '',
            }),
        );
    });

    it('opens, edits and saves rules for a level', async () => {
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Add rules' }));
        const textarea = screen.getByLabelText('Rules for E1M1');
        fireEvent.change(textarea, { target: { value: 'No skips.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));

        await waitFor(() =>
            expect(updateLevelAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                groupId: 10,
                rules: 'No skips.',
            }),
        );
    });

    it('removes a level after confirming', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const onChanged = vi.fn(noop);
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Remove E1M1' }));

        await waitFor(() =>
            expect(deleteGroupAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                groupId: 10,
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('does not remove a level when the confirm is declined', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={noop}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Remove E1M1' }));
        expect(deleteGroupAction).not.toHaveBeenCalled();
    });

    it('offers to create missing boards when a level is short one', async () => {
        const onChanged = vi.fn(noop);
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={levels}
                templates={templates}
                onChanged={onChanged}
            />,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Create missing boards' }),
        );
        await waitFor(() =>
            expect(levelOpAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                op: { op: 'level-materialise' },
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('does not show the missing-boards banner once every level is covered', () => {
        render(
            <LevelsTable
                gameId={1}
                gameSlug="g"
                levels={[levels[0]]}
                templates={templates}
                onChanged={noop}
            />,
        );
        expect(
            screen.queryByRole('button', { name: 'Create missing boards' }),
        ).toBeNull();
    });
});
