// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    LevelOverview,
    LevelTemplate,
} from '../../../../../../types/levels.types';

const mocks = vi.hoisted(() => ({
    levelOverviewAction: vi.fn(),
    levelOpAction: vi.fn(async () => ({ result: {} })),
    createLevelAction: vi.fn(async () => ({ result: { id: 9, created: 3 } })),
    updateLevelAction: vi.fn(async () => ({ result: undefined })),
}));

vi.mock('~src/actions/levels/level-overview.action', () => ({
    levelOverviewAction: mocks.levelOverviewAction,
}));
vi.mock('~src/actions/levels/level-op.action', () => ({
    levelOpAction: mocks.levelOpAction,
}));
vi.mock('~src/actions/levels/create-level.action', () => ({
    createLevelAction: mocks.createLevelAction,
}));
vi.mock('~src/actions/levels/update-level.action', () => ({
    updateLevelAction: mocks.updateLevelAction,
}));

import { LevelsPane } from './levels-pane';

const GAME = { gameId: 7, gameSlug: 'example-game' };

const OVERVIEW: LevelOverview = {
    levels: [
        {
            id: 1,
            name: 'Green Hill',
            rules: 'Start on the title screen.',
            sortOrder: 0,
            instances: [
                {
                    categoryId: 101,
                    templateId: 10,
                    state: 'synced',
                    display: 'Any%',
                },
                {
                    categoryId: 102,
                    templateId: 11,
                    state: 'overridden',
                    display: '100%',
                },
            ],
        },
        {
            id: 2,
            name: 'Marble Zone',
            rules: null,
            sortOrder: 1,
            instances: [
                {
                    categoryId: 201,
                    templateId: 10,
                    state: 'excluded',
                    display: 'Any%',
                },
                {
                    categoryId: 202,
                    templateId: null,
                    state: 'level-only',
                    display: 'Bonus stage',
                },
            ],
        },
    ],
    templates: [
        {
            id: 10,
            display: 'Any%',
            isMain: true,
            synced: 1,
            overridden: 0,
            excluded: 1,
            total: 2,
        },
        {
            id: 11,
            display: '100%',
            isMain: false,
            synced: 0,
            overridden: 1,
            excluded: 0,
            total: 1,
        },
    ],
};

function renderPane(templates: LevelTemplate[] = []) {
    return render(
        <LevelsPane
            gameId={GAME.gameId}
            gameSlug={GAME.gameSlug}
            templates={templates}
        />,
    );
}

const TEMPLATE: LevelTemplate = {
    id: 10,
    display: 'Any%',
    rules: null,
    isMain: true,
    sortOrder: 0,
    imageUrl: null,
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LevelsPane', () => {
    it('renders one row per level, with each level board and its state', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        await screen.findByDisplayValue('Green Hill');
        expect(screen.getByDisplayValue('Marble Zone')).toBeTruthy();
        // The level-only board is called out as belonging to this level only.
        expect(screen.getByText('Bonus stage')).toBeTruthy();
        expect(
            screen.getAllByText(/only on this level/i).length,
        ).toBeGreaterThan(0);
        expect(mocks.levelOverviewAction).toHaveBeenCalledWith(GAME);
    });

    it('excludes a template from a level when its checkbox is ticked off', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        const toggle = await screen.findByLabelText('Any% on Green Hill');
        expect(toggle.getAttribute('aria-checked')).toBe('true');
        fireEvent.click(toggle);

        await waitFor(() => {
            expect(mocks.levelOpAction).toHaveBeenCalledWith({
                ...GAME,
                op: {
                    op: 'level-exclusion',
                    groupId: 1,
                    templateId: 10,
                    excluded: true,
                },
            });
        });
    });

    it('creates a level from the form and reloads the overview', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();
        await screen.findByDisplayValue('Green Hill');
        expect(mocks.levelOverviewAction).toHaveBeenCalledTimes(1);

        fireEvent.change(screen.getByLabelText('New level name'), {
            target: { value: 'Spring Yard' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Add level' }));

        await waitFor(() => {
            expect(mocks.createLevelAction).toHaveBeenCalledWith({
                ...GAME,
                name: 'Spring Yard',
            });
        });
        await waitFor(() => {
            expect(mocks.levelOverviewAction).toHaveBeenCalledTimes(2);
        });
    });

    it('offers to restore an overridden board to its template', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        const resync = await screen.findByRole('button', {
            name: 'Restore 100% on Green Hill to the template',
        });
        fireEvent.click(resync);

        await waitFor(() => {
            expect(mocks.levelOpAction).toHaveBeenCalledWith({
                ...GAME,
                op: { op: 'level-resync', categoryId: 102 },
            });
        });
    });

    it('offers to materialise missing boards when a template is short of levels', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        // Template 11 has total 1 across 2 levels — a board is missing.
        const button = await screen.findByRole('button', {
            name: 'Materialise missing boards',
        });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mocks.levelOpAction).toHaveBeenCalledWith({
                ...GAME,
                op: { op: 'level-materialise' },
            });
        });
    });

    it('hides the materialise button when every template covers every level', async () => {
        mocks.levelOverviewAction.mockResolvedValue({
            result: {
                ...OVERVIEW,
                templates: OVERVIEW.templates.map((t) => ({ ...t, total: 2 })),
            },
        });
        renderPane();

        await screen.findByDisplayValue('Green Hill');
        expect(
            screen.queryByRole('button', {
                name: 'Materialise missing boards',
            }),
        ).toBeNull();
    });

    it('saves a renamed level on blur', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        const input = await screen.findByDisplayValue('Green Hill');
        fireEvent.change(input, { target: { value: 'Green Hill Zone' } });
        fireEvent.blur(input);

        await waitFor(() => {
            expect(mocks.updateLevelAction).toHaveBeenCalledWith({
                ...GAME,
                groupId: 1,
                name: 'Green Hill Zone',
            });
        });
    });

    it('tells a board with no levels but existing categories what happens next', async () => {
        mocks.levelOverviewAction.mockResolvedValue({
            result: { levels: [], templates: [] },
        });
        renderPane([TEMPLATE]);

        expect(
            await screen.findByText(/every level category gets a board on it/i),
        ).toBeTruthy();
    });

    it('tells a board with neither levels nor categories to start with a level', async () => {
        mocks.levelOverviewAction.mockResolvedValue({
            result: { levels: [], templates: [] },
        });
        renderPane();

        expect(
            await screen.findByText(/then define the level categories/i),
        ).toBeTruthy();
    });

    it('shows the load error instead of an empty state', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ error: 'Nope.' });
        renderPane();

        await screen.findByRole('alert');
        expect(screen.queryByText(/No levels yet/)).toBeNull();
    });

    it('surfaces a failed load', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ error: 'Nope.' });
        renderPane();

        expect(await screen.findByRole('alert')).toHaveTextContent('Nope.');
    });
});
