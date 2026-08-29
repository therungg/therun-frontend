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
vi.mock('../../actions/update-game-metadata.action', () => ({
    updateGameMetadataAction: vi.fn(async () => ({
        result: { updated: true },
    })),
}));
vi.mock('../../actions/set-board-minimum.action', () => ({
    setBoardMinimumAction: vi.fn(async () => ({ ok: true })),
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
    seriesGames: [],
    genres: [],
    companies: [],
    configured: true,
    links: [],
    igdbUrl: null,
    primaryTiming: 'rt',
    gameTimeLabel: null,
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
        />,
    );
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('CategoryMatrix', () => {
    it('draws an inherited preference as a dot instead of its value', () => {
        renderMatrix();
        // Ranking is Lowest on essentially every board. Row zero says so once;
        // repeating the word down every row is the noise a deviation matrix
        // exists to remove.
        const quiet = screen.getByLabelText('Ranking direction for Any%');
        expect(quiet.parentElement?.className).toMatch(/quietWrap/);
        expect(quiet.parentElement?.textContent).toContain('·');
    });

    it('never hides the timing, because it is the unit and not a preference', () => {
        renderMatrix();
        // 1:34:00 under RTA and 1:34:00 under IGT are not the same quantity,
        // and "what is this ranked by?" gets asked constantly rather than only
        // while auditing exceptions. Any% matches the board and still says RTA.
        const onDefault = screen.getByLabelText('Timing for Any%');
        expect(onDefault.parentElement?.className).not.toMatch(/quietWrap/);
        // Still drawn quiet — muted, just not replaced.
        expect(onDefault.className).toMatch(/cellQuiet/);

        // Same for the minimum: a number you audit is a number you show.
        expect(
            screen.getByLabelText('Minimum time for Any%').parentElement
                ?.className,
        ).not.toMatch(/quietWrap/);
    });

    it('names every option plainly — no "Default (…)" wrapper', () => {
        renderMatrix();
        const timing = screen.getByLabelText('Timing for Any%');
        expect(
            within(timing).getByRole('option', { name: 'RTA' }),
        ).toBeTruthy();
        expect(
            within(timing).getByRole('option', { name: 'IGT' }),
        ).toBeTruthy();
        expect(within(timing).queryByText(/Default \(/)).toBeNull();
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
            />,
        );
        const min = screen.getByLabelText(
            'Minimum time for Any%',
        ) as HTMLInputElement;
        expect(min.value).toBe('');
        expect(min.placeholder).toBe('10:00');
    });

    it('marks a category with its own rules Custom, and the absence as the same em dash every unset cell uses', () => {
        renderMatrix();
        const custom = screen.getByLabelText('Rules for Any% — own text');
        expect(custom.textContent).toBe('Custom');

        const unset = screen.getByLabelText('Rules for 16 Star — not set');
        expect(unset.textContent).toBe('—');
        // Not amber: missing rules is the ordinary state of a board being set
        // up, and spending the exception colour on the majority case is what
        // made a healthy board look broken.
        expect(unset.className).not.toMatch(/rulesCustom/);
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

    it('opens rules in a dialog — the one setting that needs room', () => {
        renderMatrix();
        fireEvent.click(screen.getByLabelText('Rules for 16 Star — not set'));
        const dialog = screen.getByRole('dialog', { name: '16 Star rules' });
        expect(dialog).toBeTruthy();
    });

    it('puts the icon beside the name it belongs to, not in a column of its own', () => {
        renderMatrix();
        // The slot is the control: a file input per row, not a tab.
        const icon = screen.getByLabelText('Icon for Any%');
        expect(screen.getByLabelText('Icon for 16 Star')).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: /More settings/ }),
        ).toBeNull();

        // A column of eight empty boxes held the position right after the
        // name. It is in the name cell now.
        expect(screen.queryByRole('columnheader', { name: 'Icon' })).toBeNull();
        expect(icon.closest('td')?.textContent).toContain('Any%');
    });

    it('offers only the clock the category does not rank by', () => {
        // Any% ranks by RTA, so its decision is about IGT; 16 Star ranks by
        // IGT, so its is about RTA. The ranking clock is never offered —
        // hiding it would sort a board by a column nobody can see.
        renderMatrix();
        expect(screen.getByLabelText('Show IGT for Any%')).toBeTruthy();
        expect(screen.getByLabelText('Show RTA for 16 Star')).toBeTruthy();
    });

    it('writes the hide flag that belongs to the category own clock', async () => {
        renderMatrix();
        fireEvent.change(screen.getByLabelText('Show IGT for Any%'), {
            target: { value: 'off' },
        });
        await waitFor(() =>
            expect(bulkUpdateCategoriesAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    categoryIds: [10],
                    fields: { hideGameTime: true },
                }),
            ),
        );
    });

    it('puts the board defaults in the same columns the cells are measured against', () => {
        renderMatrix();
        // Row zero, not a caption: the default sits in the Timing column, so
        // the comparison with the cells below is vertical.
        const boardTiming = screen.getByLabelText(
            'Board default timing',
        ) as HTMLSelectElement;
        expect(boardTiming.value).toBe('rt');
        expect(
            screen.getByLabelText('Board default ranking direction'),
        ).toBeTruthy();
        expect(
            screen.getByLabelText('Board default minimum time'),
        ).toBeTruthy();
    });

    it('offers to bring the categories along when a board default changes', async () => {
        renderMatrix();
        fireEvent.change(screen.getByLabelText('Board default timing'), {
            target: { value: 'gt' },
        });
        // Any% is still on RTA; 16 Star is already IGT, so exactly one
        // category is behind and the question counts only it.
        expect(
            await screen.findByRole('button', { name: 'Apply to all 1' }),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', { name: 'Don’t change' }),
        ).toBeTruthy();
    });

    it('does not ask when every category already matches the new default', () => {
        renderMatrix();
        // Milliseconds never asks — it is cosmetic, and sweeping it across a
        // board is not what changing the default means.
        fireEvent.change(screen.getByLabelText('Board default milliseconds'), {
            target: { value: 'off' },
        });
        expect(screen.queryByText(/Apply to all/)).toBeNull();
    });
});
