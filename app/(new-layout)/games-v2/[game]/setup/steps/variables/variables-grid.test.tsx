// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
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
vi.mock(
    '../../../manage/variables/actions/load-variable-suggestions.action',
    () => ({
        loadVariableSuggestionsAction: vi.fn(async () => ({ result: [] })),
    }),
);
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('react-toastify', () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import {
    applyVariableChangesAction,
    previewVariableChangesAction,
} from '../../actions/apply-variable-changes.action';
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

    it('collapses the default to one control when every category agrees', () => {
        // Both categories send unmatched runs to Nintendo 64, which is the
        // normal case — so the column was eight identical dropdowns stating
        // one fact. It is a sentence with a control in it instead.
        renderGrid();
        expect(
            screen.queryByRole('columnheader', { name: 'No Platform given' }),
        ).toBeNull();
        expect(
            screen.getByLabelText(
                'Where a run with no Platform goes, on all 2 categories',
            ),
        ).toBeTruthy();
        expect(
            screen.getByText(/doesn’t say which Platform it used goes to/),
        ).toBeTruthy();
        expect(screen.queryByText('◉')).toBeNull();
    });

    it('brings the column back the moment two categories disagree', () => {
        const data = makeData();
        // 120 Star sends unmatched runs to its second option instead.
        data.variables[1].values = [['Nintendo 64', 'n64'], ['Emulator']];
        data.variables[1].defaultValueIndex = 1;
        render(<VariablesGrid data={data} />);

        expect(
            screen.getByRole('columnheader', { name: 'No Platform given' }),
        ).toBeTruthy();
        expect(
            screen.getByLabelText('On Any%, a run with no Platform goes to'),
        ).toBeTruthy();
        expect(
            screen.getByText(/These categories want different answers/),
        ).toBeTruthy();
    });

    it('uses a checkbox, so nothing has to explain what the mark means', () => {
        renderGrid();
        // Emulator is on Any% only.
        const on = screen.getByLabelText(
            'Emulator on Any%',
        ) as HTMLInputElement;
        const off = screen.getByLabelText(
            'Emulator on 120 Star',
        ) as HTMLInputElement;
        expect(on.type).toBe('checkbox');
        expect(on.checked).toBe(true);
        expect(off.checked).toBe(false);

        // No legend: a grid that needs annotating to be read does not read.
        expect(screen.queryByText(/on this category/)).toBeNull();
        expect(screen.queryByText('●')).toBeNull();
        expect(screen.queryByText('○')).toBeNull();
    });

    it('does not offer to demote a subcategory group to a filter', () => {
        renderGrid();
        // The demotion deletes every leaderboard the group created and every
        // record they held. It was a chip at the foot of each group, one
        // stray click from the grid. Repairing role drift still offers it;
        // creating drift-free destruction does not.
        expect(
            screen.queryByRole('button', { name: 'Make this a filter' }),
        ).toBeNull();
        expect(
            screen.queryByText(/Collapses its subcategories back into one/),
        ).toBeNull();
    });

    it('drops the mono provenance list the grid already showed', () => {
        renderGrid();
        expect(screen.queryByText(/→ 2 subcategories/)).toBeNull();
    });

    // The four things a group could not do. Every one of them was already
    // supported by the write layer — `input: null` deletes, `input.name`
    // renames, `values` is an arbitrary array — so all four were missing
    // buttons rather than missing features.

    it('moves an option left and right, the axis options actually sit on', () => {
        renderGrid();
        fireEvent.click(screen.getByRole('button', { name: /Nintendo 64/ }));
        // Options became columns when the grid was transposed; these said up
        // and down, pointing at an axis they no longer sit on.
        expect(
            screen.getByRole('button', { name: 'Move Nintendo 64 right' }),
        ).toBeTruthy();
        expect(screen.queryByRole('button', { name: '↑' })).toBeNull();
    });

    it('puts exactly one control in the bar, so nothing competes with the triangle', () => {
        const data = makeData();
        data.variables.push({
            ...data.variables[0],
            id: 3,
            categoryId: 10,
            name: 'Amiibo',
            nameNormalized: 'amiibo',
            values: [['Yes'], ['No']],
            sortOrder: 1,
        } as WizardData['variables'][number]);
        render(<VariablesGrid data={data} />);

        // The bar held a reorder pair and a collapse chevron, and the head
        // still drew a leftover chevron of its own from when it was one big
        // button — three marks pointing down, one of which did not even
        // rotate. Board order is named in words in the footer now.
        const bar = screen
            .getByRole('button', { name: 'Platform' })
            .closest('div') as HTMLElement;
        const controls = within(bar).getAllByRole('button');
        expect(controls.map((b) => b.getAttribute('aria-label'))).toEqual([
            null, // the title, which renames
            'Collapse Platform',
        ]);
        expect(within(bar).queryByRole('button', { name: /Move/ })).toBeNull();
    });

    it('collapses from anywhere on the bar, not only from the triangle', () => {
        renderGrid();
        expect(screen.getByLabelText('Emulator on Any%')).toBeTruthy();

        // The meta text is not a control — hitting it should still collapse,
        // the way an accordion head does. Splitting the head into separate
        // controls briefly left only the triangle live.
        fireEvent.click(screen.getByText(/on 2 of 2/));
        expect(screen.queryByLabelText('Emulator on Any%')).toBeNull();
    });

    it('does not collapse when a control inside the bar is used', () => {
        renderGrid();
        // Renaming happens in the bar; the click must not reach it.
        fireEvent.click(screen.getByRole('button', { name: 'Platform' }));
        expect(screen.getByLabelText('Rename Platform')).toBeTruthy();
        expect(screen.getByLabelText('Emulator on Any%')).toBeTruthy();
    });

    it('orders the groups on the board, not on their names', () => {
        const data = makeData();
        // A second group, alphabetically first, so name order and board order
        // disagree and only board order can be honoured.
        data.variables.push({
            ...data.variables[0],
            id: 3,
            categoryId: 10,
            name: 'Amiibo',
            nameNormalized: 'amiibo',
            values: [['Yes'], ['No']],
            sortOrder: 1,
        } as WizardData['variables'][number]);
        render(<VariablesGrid data={data} />);

        const titles = screen
            .getAllByRole('button', { name: /^(Platform|Amiibo)$/ })
            .map((b) => b.textContent);
        // Platform is sortOrder 0, Amiibo is 1 — alphabetical would invert it.
        expect(titles).toEqual(['Platform', 'Amiibo']);

        // Named actions in the footer, not arrows in the head: the head has
        // exactly one mark that points anywhere, and it is the disclosure
        // triangle.
        const amiiboFoot = screen
            .getAllByRole('button', { name: 'Move up' })
            .at(-1) as HTMLElement;
        fireEvent.click(amiiboFoot);
        // Order is display only — the backend builds a subcategory key from
        // names sorted alphabetically — so it writes straight through.
        expect(applyVariableChangesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        input: expect.objectContaining({
                            name: 'Amiibo',
                            sortOrder: 0,
                        }),
                    }),
                ]),
            }),
        );
    });

    it('renames the group from its own title', () => {
        renderGrid();
        fireEvent.click(screen.getByRole('button', { name: 'Platform' }));
        const field = screen.getByLabelText('Rename Platform');
        fireEvent.change(field, { target: { value: 'System' } });
        fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
        // Rename changes ONLY the display name; the key stays 'platform' so the
        // URL and stored runs don't move.
        expect(previewVariableChangesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        input: expect.objectContaining({
                            name: 'System',
                            nameNormalized: 'platform',
                        }),
                    }),
                ]),
            }),
        );
    });

    it('deletes the group, behind a confirmation naming what goes', () => {
        renderGrid();
        fireEvent.click(
            screen.getByRole('button', {
                name: 'Delete this subcategory group',
            }),
        );
        // Says what it costs before it does it.
        expect(
            screen.getByText(/collapse back into one leaderboard each/),
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        // One null write per carrying category — the same removal an emptied
        // grid produces, which was previously the only way to do this.
        expect(previewVariableChangesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                changes: [
                    expect.objectContaining({ categoryId: 10, input: null }),
                    expect.objectContaining({ categoryId: 20, input: null }),
                ],
            }),
        );
    });

    it('adds an option, in the column where it will appear', () => {
        renderGrid();
        fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
        fireEvent.change(screen.getByLabelText('Name'), {
            target: { value: 'Wii' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Preview & add' }));
        expect(previewVariableChangesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        input: expect.objectContaining({
                            values: expect.arrayContaining([['Wii']]),
                        }),
                    }),
                ]),
            }),
        );
    });

    it('refuses an option that already exists rather than silently merging it', () => {
        renderGrid();
        fireEvent.click(screen.getByRole('button', { name: '+ Option' }));
        fireEvent.change(screen.getByLabelText('Name'), {
            target: { value: 'emulator' },
        });
        expect(screen.getByText(/already an option here/)).toBeTruthy();
        expect(
            screen
                .getByRole('button', { name: 'Preview & add' })
                .hasAttribute('disabled'),
        ).toBe(true);
    });

    it('asks where unmatched runs go when creating, instead of taking the first', () => {
        renderGrid();
        fireEvent.click(
            screen.getByRole('button', { name: '+ Add a subcategory group' }),
        );
        fireEvent.change(screen.getByLabelText('Subcategory display name'), {
            target: { value: 'Region' },
        });
        fireEvent.change(
            screen.getByLabelText(/Subcategory options, one per line/),
            // Aliases come with the option now, after a comma — a group used
            // to be created bare and then reopened option by option.
            { target: { value: 'NTSC, ntsc-u\nPAL, pal-e' } },
        );

        const picker = screen.getByLabelText(
            /A run that doesn’t say which Region it used goes to/,
        ) as HTMLSelectElement;
        // It used to be options[0], stated in a note and choosable nowhere.
        fireEvent.change(picker, { target: { value: 'PAL' } });
        fireEvent.click(screen.getByRole('button', { name: 'Preview & add' }));

        expect(previewVariableChangesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        input: expect.objectContaining({
                            name: 'Region',
                            // Key follows the display name when untouched.
                            nameNormalized: 'region',
                            defaultValueIndex: 1,
                            values: [
                                ['NTSC', 'ntsc-u'],
                                ['PAL', 'pal-e'],
                            ],
                        }),
                    }),
                ]),
            }),
        );
    });

    it('lets the display name and the LiveSplit variable be set apart on create', () => {
        renderGrid();
        fireEvent.click(
            screen.getByRole('button', { name: '+ Add a subcategory group' }),
        );
        fireEvent.change(screen.getByLabelText('Subcategory display name'), {
            target: { value: 'Solo or Co-op?' },
        });
        // The runners' LiveSplit variable is just "coop" — set it apart from
        // the friendly display name so runs still match.
        fireEvent.change(screen.getByLabelText('Variable name in LiveSplit'), {
            target: { value: 'coop' },
        });
        fireEvent.change(
            screen.getByLabelText(/Subcategory options, one per line/),
            { target: { value: 'Solo\nCo-op' } },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Preview & add' }));

        expect(previewVariableChangesAction).toHaveBeenCalledWith(
            expect.objectContaining({
                changes: expect.arrayContaining([
                    expect.objectContaining({
                        input: expect.objectContaining({
                            name: 'Solo or Co-op?',
                            nameNormalized: 'coop',
                        }),
                    }),
                ]),
            }),
        );
    });
});
