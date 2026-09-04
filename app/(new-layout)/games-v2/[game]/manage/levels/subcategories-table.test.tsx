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

vi.mock('~src/actions/levels/create-level-template.action', () => ({
    createLevelTemplateAction: vi.fn(async () => ({
        result: { id: 5, created: 1 },
    })),
}));
vi.mock('../visibility/actions/update-visibility.action', () => ({
    updateVisibilityAction: vi.fn(async () => ({ result: { updated: true } })),
}));

import { createLevelTemplateAction } from '~src/actions/levels/create-level-template.action';
import { updateVisibilityAction } from '../visibility/actions/update-visibility.action';
import { SubcategoriesTable, templateCoverage } from './subcategories-table';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function noop() {
    return Promise.resolve();
}

describe('templateCoverage', () => {
    it('lists only the non-zero parts', () => {
        expect(
            templateCoverage({
                id: 1,
                display: 'Any%',
                isMain: true,
                synced: 3,
                overridden: 1,
                excluded: 0,
                total: 4,
            }),
        ).toBe('3 synced, 1 overridden');
    });
    it('reads as fully excluded when only excluded is non-zero', () => {
        expect(
            templateCoverage({
                id: 1,
                display: 'Any%',
                isMain: true,
                synced: 0,
                overridden: 0,
                excluded: 2,
                total: 2,
            }),
        ).toBe('2 excluded');
    });
    it('falls back when there are no boards yet', () => {
        expect(
            templateCoverage({
                id: 1,
                display: 'Any%',
                isMain: true,
                synced: 0,
                overridden: 0,
                excluded: 0,
                total: 0,
            }),
        ).toBe('No boards yet');
    });
});

describe('SubcategoriesTable', () => {
    const templates: LevelOverview['templates'] = [
        {
            id: 1,
            display: 'Any%',
            isMain: true,
            synced: 2,
            overridden: 0,
            excluded: 0,
            total: 2,
        },
    ];

    it('lists subcategories with their coverage', () => {
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={templates}
                onChanged={noop}
            />,
        );
        expect(screen.getByText('Any%')).toBeTruthy();
        expect(screen.getByText('2 synced')).toBeTruthy();
    });

    it('shows the empty state with no templates', () => {
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={[]}
                onChanged={noop}
            />,
        );
        expect(screen.getByText(/No subcategories yet/)).toBeTruthy();
    });

    it('adds a subcategory', async () => {
        const onChanged = vi.fn(noop);
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={[]}
                onChanged={onChanged}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText('Any%'), {
            target: { value: '100%' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Add subcategory' }),
        );

        await waitFor(() =>
            expect(createLevelTemplateAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                display: '100%',
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('archives a subcategory after confirming', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const onChanged = vi.fn(noop);
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={templates}
                onChanged={onChanged}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Remove Any%' }));

        await waitFor(() =>
            expect(updateVisibilityAction).toHaveBeenCalledWith({
                gameSlug: 'g',
                gameId: 1,
                categoryId: 1,
                active: false,
            }),
        );
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('does not archive when the confirm is declined', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={templates}
                onChanged={noop}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Remove Any%' }));
        expect(updateVisibilityAction).not.toHaveBeenCalled();
    });

    it('surfaces an error returned by the add action', async () => {
        const onChanged = vi.fn(noop);
        vi.mocked(createLevelTemplateAction).mockResolvedValueOnce({
            error: 'Not authorized to manage category groups.',
        });
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={[]}
                onChanged={onChanged}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText('Any%'), {
            target: { value: '100%' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Add subcategory' }),
        );

        expect(
            await screen.findByText(
                'Not authorized to manage category groups.',
            ),
        ).toBeTruthy();
        expect(onChanged).not.toHaveBeenCalled();
    });

    it('reports a thrown failure rather than rejecting silently', async () => {
        vi.mocked(createLevelTemplateAction).mockRejectedValueOnce(
            new Error('network down'),
        );
        render(
            <SubcategoriesTable
                gameId={1}
                gameSlug="g"
                templates={[]}
                onChanged={noop}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText('Any%'), {
            target: { value: '100%' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Add subcategory' }),
        );

        expect(
            await screen.findByText('Something went wrong. Try again.'),
        ).toBeTruthy();
    });
});
