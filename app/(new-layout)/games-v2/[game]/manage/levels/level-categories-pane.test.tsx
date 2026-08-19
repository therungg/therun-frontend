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

const mocks = vi.hoisted(() => ({
    levelOverviewAction: vi.fn(),
    levelOpAction: vi.fn(async () => ({ result: {} })),
    createLevelTemplateAction: vi.fn(async () => ({
        result: { id: 12, created: 4 },
    })),
    updateVisibilityAction: vi.fn(async () => ({ result: { updated: true } })),
}));

vi.mock('~src/actions/levels/level-overview.action', () => ({
    levelOverviewAction: mocks.levelOverviewAction,
}));
vi.mock('~src/actions/levels/level-op.action', () => ({
    levelOpAction: mocks.levelOpAction,
}));
vi.mock('~src/actions/levels/create-level-template.action', () => ({
    createLevelTemplateAction: mocks.createLevelTemplateAction,
}));
vi.mock('../visibility/actions/update-visibility.action', () => ({
    updateVisibilityAction: mocks.updateVisibilityAction,
}));

import { LevelCategoriesPane } from './level-categories-pane';

const GAME = { gameId: 7, gameSlug: 'example-game' };

const OVERVIEW: LevelOverview = {
    levels: [
        { id: 1, name: 'Green Hill', rules: null, sortOrder: 0, instances: [] },
        {
            id: 2,
            name: 'Marble Zone',
            rules: null,
            sortOrder: 1,
            instances: [],
        },
    ],
    templates: [
        {
            id: 10,
            display: 'Any%',
            isMain: true,
            synced: 14,
            overridden: 0,
            excluded: 1,
            total: 15,
        },
        {
            id: 11,
            display: '100%',
            isMain: false,
            synced: 15,
            overridden: 0,
            excluded: 0,
            total: 15,
        },
    ],
};

function renderPane() {
    return render(
        <LevelCategoriesPane gameId={GAME.gameId} gameSlug={GAME.gameSlug} />,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('LevelCategoriesPane', () => {
    it('renders synced/total per template, naming the exclusions', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        expect(await screen.findByText('Any%')).toBeTruthy();
        expect(screen.getByText('14/15')).toBeTruthy();
        expect(screen.getByText('1 excluded')).toBeTruthy();
        expect(screen.getByText('15/15')).toBeTruthy();
    });

    it('pushes a template to every level board', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Push Any% now' }),
        );

        await waitFor(() => {
            expect(mocks.levelOpAction).toHaveBeenCalledWith({
                ...GAME,
                op: { op: 'level-push', templateId: 10 },
            });
        });
    });

    it('archives a template through the category visibility action', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Archive Any%' }),
        );

        await waitFor(() => {
            expect(mocks.updateVisibilityAction).toHaveBeenCalledWith({
                ...GAME,
                categoryId: 10,
                active: false,
            });
        });
    });

    it('creates a featured level category from the form', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ result: OVERVIEW });
        renderPane();

        await screen.findByText('Any%');
        fireEvent.change(screen.getByLabelText('New level category'), {
            target: { value: 'Low%' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Add level category' }),
        );

        await waitFor(() => {
            expect(mocks.createLevelTemplateAction).toHaveBeenCalledWith({
                ...GAME,
                display: 'Low%',
                primaryTiming: 'realtime',
                isMain: true,
            });
        });
        await waitFor(() => {
            expect(mocks.levelOverviewAction).toHaveBeenCalledTimes(2);
        });
    });

    it('surfaces a failed load', async () => {
        mocks.levelOverviewAction.mockResolvedValue({ error: 'Nope.' });
        renderPane();

        expect(await screen.findByRole('alert')).toHaveTextContent('Nope.');
    });
});
