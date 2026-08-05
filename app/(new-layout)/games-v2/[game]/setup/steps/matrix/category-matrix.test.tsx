// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { boardDefaults } from '~src/lib/setup/board-defaults';
import type { WizardData } from '../../types';

vi.mock('../../actions/bulk-update-categories.action', () => ({
    bulkUpdateCategoriesAction: vi.fn(async () => ({
        result: { updated: 1 },
    })),
}));
vi.mock('../../actions/set-category-minimum.action', () => ({
    setCategoryMinimumAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { bulkUpdateCategoriesAction } from '../../actions/bulk-update-categories.action';
import { CategoryMatrix } from './category-matrix';

const metadata = {
    coverUrl: null,
    platforms: [],
    igdbPlatforms: [],
    releaseYear: null,
    firstReleaseDate: null,
    discordUrl: null,
    summary: null,
    summaryOverride: null,
    seriesDisplay: null,
    genres: [],
    companies: [],
    configured: true,
    links: [],
    igdbUrl: null,
    primaryTiming: 'rt',
    rulesTemplate: 'No major skips.',
    gameRules: null,
    emulatorPolicy: null,
    hideRealTime: false,
    hideGameTime: false,
    sortAscending: true,
    showMilliseconds: true,
} as GameMetadata;

function makeData(): WizardData {
    return {
        game: { id: 1, name: 'example-game', display: 'Example Game' },
        categories: [
            {
                id: 10,
                name: 'any',
                display: 'Any%',
                primaryTiming: 'rt',
                archived: false,
                isMain: true,
                sortOrder: 1,
                rules: 'No major skips.',
                sortAscending: true,
                showMilliseconds: true,
            },
            {
                id: 20,
                name: '16-star',
                display: '16 Star',
                // Deliberately deviating: gametime on an RTA board.
                primaryTiming: 'gt',
                archived: false,
                isMain: true,
                sortOrder: 2,
                rules: null,
                sortAscending: true,
                showMilliseconds: true,
            },
        ],
        groups: [],
        variables: [],
        policies: [],
        metadata,
    } as unknown as WizardData;
}

function renderMatrix() {
    const data = makeData();
    return render(
        <CategoryMatrix
            data={data}
            defaults={boardDefaults(data.metadata, data.policies)}
            onOpenEditor={vi.fn()}
        />,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CategoryMatrix', () => {
    it('labels the board-default option so a matching cell reads as quiet', () => {
        renderMatrix();
        const timing = screen.getByLabelText('Timing for Any%');
        expect(
            within(timing).getByRole('option', { name: 'Default (RTA)' }),
        ).toBeTruthy();
        // The non-default option is named plainly, no "Default" prefix.
        expect(
            within(timing).getByRole('option', { name: 'IGT' }),
        ).toBeTruthy();
    });

    it('shows the board minimum as a placeholder, so an empty cell means "inherits"', () => {
        const data = makeData();
        data.policies = [
            {
                id: 1,
                gameId: 1,
                categoryId: null,
                subcategoryKey: null,
                policyType: 'min_time',
                value: { minTimeMs: 600000 },
                createdBy: 1,
                reason: '',
                createdAt: '2026-08-05',
            },
        ] as WizardData['policies'];
        render(
            <CategoryMatrix
                data={data}
                defaults={boardDefaults(data.metadata, data.policies)}
                onOpenEditor={vi.fn()}
            />,
        );
        const min = screen.getByLabelText(
            'Minimum time for Any%',
        ) as HTMLInputElement;
        expect(min.value).toBe('');
        expect(min.placeholder).toBe('10:00');
    });

    it('marks a category with no rules distinctly from one on the template', () => {
        renderMatrix();
        expect(screen.getByRole('button', { name: 'default' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'none' })).toBeTruthy();
    });

    it('writes a single cell edit straight through', async () => {
        renderMatrix();
        fireEvent.change(screen.getByLabelText('Ranking direction for Any%'), {
            target: { value: 'desc' },
        });
        await waitFor(() =>
            expect(bulkUpdateCategoriesAction).toHaveBeenCalledTimes(1),
        );
        expect(bulkUpdateCategoriesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                categoryIds: [10],
                fields: { sortAscending: false },
            }),
        );
    });

    it('opens the rules editor in place, leaving the matrix rendered', () => {
        renderMatrix();
        fireEvent.click(screen.getByRole('button', { name: 'none' }));
        expect(screen.getByLabelText('Rules for 16 Star')).toBeTruthy();
        // The other category's row is still on screen — the whole point of
        // the inline panel over a screen takeover.
        expect(screen.getByLabelText('Timing for Any%')).toBeTruthy();
    });

    it('previews a bulk apply instead of writing immediately', async () => {
        renderMatrix();
        fireEvent.click(screen.getByLabelText('Select all categories'));
        fireEvent.change(screen.getByLabelText('Apply timing to selected'), {
            target: { value: 'rt' },
        });

        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(bulkUpdateCategoriesAction).not.toHaveBeenCalled();
    });

    it('skips a deliberately deviating category unless it is opted in', async () => {
        renderMatrix();
        fireEvent.click(screen.getByLabelText('Select all categories'));
        fireEvent.change(screen.getByLabelText('Apply timing to selected'), {
            target: { value: 'rt' },
        });

        // Any% already has rt, so only 16 Star would change — and it is a
        // deliberate deviation, so it is excluded by default and the confirm
        // button has nothing left to write.
        const dialog = screen.getByRole('dialog');
        expect(
            within(dialog).getByRole('button', { name: 'Apply to 0' }),
        ).toBeTruthy();

        fireEvent.click(within(dialog).getByRole('checkbox'));
        fireEvent.click(
            within(dialog).getByRole('button', { name: 'Apply to 1' }),
        );

        await waitFor(() =>
            expect(bulkUpdateCategoriesAction).toHaveBeenCalledTimes(1),
        );
        expect(bulkUpdateCategoriesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                categoryIds: [20],
                fields: { primaryTiming: 'realtime' },
            }),
        );
    });
});
