// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LevelOverview } from '../../../../../../types/levels.types';

vi.mock('~src/actions/levels/level-overview.action', () => ({
    levelOverviewAction: vi.fn(),
}));

import { levelOverviewAction } from '~src/actions/levels/level-overview.action';
import { LevelsPane } from './levels-pane';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const overview: LevelOverview = {
    levels: [
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
            ],
        },
    ],
    templates: [
        {
            id: 1,
            display: 'Any%',
            isMain: true,
            synced: 1,
            overridden: 0,
            excluded: 0,
            total: 1,
        },
    ],
};

describe('LevelsPane', () => {
    it('loads the overview and renders both tables plus the matrix', async () => {
        vi.mocked(levelOverviewAction).mockResolvedValue({ result: overview });
        render(<LevelsPane gameId={1} gameSlug="g" />);

        expect(screen.getByText('Loading levels…')).toBeTruthy();
        await waitFor(() =>
            expect(screen.getByDisplayValue('E1M1')).toBeTruthy(),
        );
        // Once as the subcategories-table row, once as the exclusion
        // matrix's column header.
        expect(screen.getAllByText('Any%')).toHaveLength(2);
        expect(screen.getByLabelText('Any% for E1M1')).toBeTruthy();
        expect(
            screen.getByText('Which levels carry which subcategory'),
        ).toBeTruthy();
    });

    it('shows the load error inline', async () => {
        vi.mocked(levelOverviewAction).mockResolvedValue({ error: 'nope' });
        render(<LevelsPane gameId={1} gameSlug="g" />);
        expect(await screen.findByText('nope')).toBeTruthy();
    });

    it('renders no exclusion matrix with nothing to cross-reference', async () => {
        vi.mocked(levelOverviewAction).mockResolvedValue({
            result: { levels: [], templates: [] },
        });
        render(<LevelsPane gameId={1} gameSlug="g" />);
        await waitFor(() =>
            expect(screen.getByText(/No levels yet/)).toBeTruthy(),
        );
        expect(screen.queryByRole('table')).toBeNull();
        // No empty titled card left behind either.
        expect(
            screen.queryByText('Which levels carry which subcategory'),
        ).toBeNull();
    });
});
