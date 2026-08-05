// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WizardData } from '../../types';

vi.mock('../../actions/apply-variable-changes.action', () => ({
    applyVariableChangesAction: vi.fn(async () => ({ ok: true })),
    previewVariableChangesAction: vi.fn(async () => ({
        preview: { categories: [], totalMoved: 0 },
    })),
}));
vi.mock('../../actions/set-valid-combinations.action', () => ({
    setValidCombinationsAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { VariablesGrid } from './variables-grid';

function makeData(): WizardData {
    const categories = [
        { id: 10, name: 'any', display: 'Any%', sortOrder: 1 },
        { id: 20, name: '120-star', display: '120 Star', sortOrder: 2 },
    ].map((c) => ({
        ...c,
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        rules: null,
        sortAscending: true,
        showMilliseconds: true,
    }));

    // Platform on both categories: N64 everywhere, Emulator only on Any%.
    const variables = [
        {
            id: 1,
            gameId: 1,
            categoryId: 10,
            name: 'Platform',
            nameNormalized: 'platform',
            role: 'subcategory',
            values: [['Nintendo 64', 'n64'], ['Emulator']],
            defaultValueIndex: 0,
            sortOrder: 0,
            description: null,
            version: 1,
            published: true,
        },
        {
            id: 2,
            gameId: 1,
            categoryId: 20,
            name: 'Platform',
            nameNormalized: 'platform',
            role: 'subcategory',
            values: [['Nintendo 64', 'n64']],
            defaultValueIndex: 0,
            sortOrder: 0,
            description: null,
            version: 1,
            published: true,
        },
    ];

    return {
        game: { id: 1, name: 'example-game', display: 'Example Game' },
        categories,
        groups: [],
        variables,
        policies: [],
        metadata: {},
    } as unknown as WizardData;
}

function renderGrid() {
    return render(<VariablesGrid data={makeData()} />);
}

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('VariablesGrid', () => {
    it('runs categories down the rows, like the matrix above it', () => {
        // The axis contract for the whole screen. This grid used to be
        // transposed against the category matrix — the same eight categories
        // were rows above and columns below, so reading the page meant
        // mentally rotating it halfway down.
        renderGrid();
        expect(screen.getByRole('rowheader', { name: 'Any%' })).toBeTruthy();
        expect(
            screen.getByRole('rowheader', { name: '120 Star' }),
        ).toBeTruthy();
        expect(screen.queryByRole('columnheader', { name: 'Any%' })).toBeNull();
    });

    it('makes each option a column, and its header the way to edit it', () => {
        renderGrid();
        const header = screen.getByRole('columnheader', {
            name: /Nintendo 64/,
        });
        // The alias count is the only hint a bucket is more than its name, so
        // it says what it counts rather than leaving "+1" unexplained.
        expect(within(header).getByTitle(/1 other spelling/)).toBeTruthy();
        expect(
            within(header).getByRole('button', { name: /Nintendo 64/ }),
        ).toBeTruthy();
    });

    it('states the default in words, in its own column, instead of a third dot', () => {
        renderGrid();
        // The ringed dot meant "runs that do not say land here" and nothing
        // on the screen said so. The column does.
        expect(
            screen.getByRole('columnheader', { name: /Runs that don/ }),
        ).toBeTruthy();
        expect(screen.getByLabelText('Default option for Any%')).toBeTruthy();
        expect(screen.queryByText('◉')).toBeNull();
    });

    it('marks a cell on and off with two named marks', () => {
        renderGrid();
        // Emulator is on Any% only.
        expect(
            screen
                .getByLabelText('Emulator on Any%')
                .getAttribute('aria-pressed'),
        ).toBe('true');
        expect(
            screen
                .getByLabelText('Emulator on 120 Star')
                .getAttribute('aria-pressed'),
        ).toBe('false');
        expect(screen.getByText(/on this category/)).toBeTruthy();
    });

    it('says what the conversion costs, not just where it goes', () => {
        renderGrid();
        expect(
            screen.getByRole('button', { name: 'Make this a filter' }),
        ).toBeTruthy();
        expect(
            screen.getByText(/Collapses its subcategories back into one/),
        ).toBeTruthy();
    });

    it('drops the mono provenance list the grid already showed', () => {
        renderGrid();
        expect(screen.queryByText(/→ 2 subcategories/)).toBeNull();
    });
});
