// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGame,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type {
    BoardPolicyRow,
    LeaderboardRosterRow,
} from '../../../../../../types/moderation.types';
import { BoardCuration } from './board-curation';
import { useBoardData } from './use-board-data';

vi.mock('./use-board-data', () => ({
    useBoardData: vi.fn(),
}));

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted — see row-actions.test.tsx
// for the same pattern. RowActions/AddRunnerRow (rendered per row / at the
// table end) reach these — mocked here purely to keep this suite's
// rendering hermetic (avoids pulling in the real 'use server' action
// modules and their next/headers-touching dependencies), but the bulk
// accept/ban tests below assert on them directly.
const mocks = vi.hoisted(() => ({
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    restoreRunsAction: vi.fn(),
    createManualTimeAction: vi.fn(),
    markRunsAction: vi.fn(),
    moveRunAction: vi.fn(),
    loadUserEligibleRunsAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    createPolicyAction: vi.fn(),
    updatePolicyAction: vi.fn(),
    deletePolicyAction: vi.fn(),
    updateVariableAction: vi.fn(),
    updateCategorySettingsAction: vi.fn(),
    updateTimingSettingsAction: vi.fn(),
    reorderCategoriesAction: vi.fn(),
    reorderGroupsAction: vi.fn(),
    routerRefresh: vi.fn(),
}));

vi.mock('../moderation/shared/actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
    previewExcludeAction: mocks.previewExcludeAction,
}));
vi.mock('../moderation/shared/actions/restore.action', () => ({
    restoreRunsAction: mocks.restoreRunsAction,
}));
vi.mock('../moderation/shared/actions/manual-times.action', () => ({
    createManualTimeAction: mocks.createManualTimeAction,
}));
vi.mock('../moderation/shared/actions/marks.action', () => ({
    markRunsAction: mocks.markRunsAction,
}));
vi.mock('../moderation/shared/actions/board-override.action', () => ({
    moveRunAction: mocks.moveRunAction,
}));
vi.mock('../moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: mocks.loadUserEligibleRunsAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
// BoardControls (Task 12's toolbar) is mounted by BoardCuration whenever
// canConfigure is true — mocked here for the same hermeticity reason as the
// row-action modules above: these are real 'use server' modules.
vi.mock('../moderation/policies/actions/policies-actions.action', () => ({
    createPolicyAction: mocks.createPolicyAction,
    updatePolicyAction: mocks.updatePolicyAction,
    deletePolicyAction: mocks.deletePolicyAction,
}));
vi.mock('../variables/actions/update-variable.action', () => ({
    updateVariableAction: mocks.updateVariableAction,
}));
vi.mock('../category-tab/actions/update-category-settings.action', () => ({
    updateCategorySettingsAction: mocks.updateCategorySettingsAction,
}));
vi.mock('../timing/actions/update-timing-settings.action', () => ({
    updateTimingSettingsAction: mocks.updateTimingSettingsAction,
}));
vi.mock('../game-tab/actions/reorder-categories.action', () => ({
    reorderCategoriesAction: mocks.reorderCategoriesAction,
}));
vi.mock('~src/actions/category-group/reorder-groups.action', () => ({
    reorderGroupsAction: mocks.reorderGroupsAction,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.routerRefresh }),
}));

const mockUseBoardData = vi.mocked(useBoardData);

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
    mockUseBoardData.mockReset();
});

const GAME: ResolvedGame = {
    id: 1,
    name: 'some-game',
    display: 'Some Game',
};

const CATEGORY: ResolvedCategory = {
    id: 10,
    name: 'any-percent',
    display: 'Any%',
    primaryTiming: 'rt',
    archived: false,
    isMain: true,
    sortOrder: 1,
};

const GROUPS: ResolvedGroup[] = [];

const NG_PLUS_VAR: VariableRow = {
    id: 100,
    gameId: 1,
    categoryId: CATEGORY.id,
    name: 'NG+',
    nameNormalized: 'ngplus',
    role: 'subcategory',
    values: [['No'], ['Yes']],
    defaultValueIndex: 0,
    sortOrder: 0,
    description: null,
    version: 1,
    published: true,
};

const MIN_TIME_POLICY: BoardPolicyRow = {
    id: 1,
    gameId: 1,
    categoryId: CATEGORY.id,
    subcategoryKey: null,
    policyType: 'min_time',
    value: { minTimeMs: 10_000 },
    createdBy: 1,
    reason: 'test fixture',
    createdAt: '2026-01-01T00:00:00.000Z',
};

function rosterRow(
    overrides: Partial<LeaderboardRosterRow>,
): LeaderboardRosterRow {
    return {
        runId: 1,
        userId: 1,
        runnerName: 'runner',
        subcategoryKey: '',
        time: 20_000,
        gameTime: null,
        verificationStatus: 'verified',
        vodUrl: null,
        endedAt: '2026-01-01T00:00:00.000Z',
        isLeaderboardEntry: true,
        isLeaderboardEntryGt: false,
        ...overrides,
    };
}

describe('BoardCuration ranking', () => {
    it('ranks rows by time ascending and flags a run under the minimum policy', () => {
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({ runId: 1, runnerName: 'slowrunner', time: 30_000 }),
                rosterRow({ runId: 2, runnerName: 'fastrunner', time: 5_000 }),
            ],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[MIN_TIME_POLICY]}
                canConfigure
                context="wizard"
            />,
        );

        // Drop the header row and the trailing add-runner ghost row.
        const rows = screen.getAllByRole('row').slice(1, -1);
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('fastrunner');
        expect(rows[1].textContent).toContain('slowrunner');

        // fastrunner's 5s run is below the 10s minimum policy; slowrunner's isn't.
        expect(rows[0].textContent).toContain('Below minimum');
        expect(rows[1].textContent).not.toContain('Below minimum');
    });

    it("drops a row that is not the runner's current leaderboard entry", () => {
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({
                    runId: 1,
                    runnerName: 'onboard',
                    time: 10_000,
                    isLeaderboardEntry: true,
                }),
                rosterRow({
                    runId: 2,
                    runnerName: 'offboard',
                    time: 1_000,
                    isLeaderboardEntry: false,
                }),
            ],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        expect(screen.queryByText('onboard')).not.toBeNull();
        expect(screen.queryByText('offboard')).toBeNull();
    });

    it('ranks rows descending (highest time first) for a sortAscending: false category', () => {
        const INVERTED_CATEGORY: ResolvedCategory = {
            ...CATEGORY,
            sortAscending: false,
        };
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({ runId: 1, runnerName: 'lowscore', time: 5_000 }),
                rosterRow({ runId: 2, runnerName: 'highscore', time: 30_000 }),
            ],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[INVERTED_CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        const rows = screen.getAllByRole('row').slice(1, -1);
        expect(rows).toHaveLength(2);
        expect(rows[0].textContent).toContain('highscore');
        expect(rows[1].textContent).toContain('lowscore');
    });

    it('defaults to ascending when sortAscending is unset', () => {
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({ runId: 1, runnerName: 'slow', time: 30_000 }),
                rosterRow({ runId: 2, runnerName: 'fast', time: 5_000 }),
            ],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        const rows = screen.getAllByRole('row').slice(1, -1);
        expect(rows[0].textContent).toContain('fast');
        expect(rows[1].textContent).toContain('slow');
    });
});

describe('BoardCuration — marked-pile filter chip', () => {
    it('shows a count chip, filters to marked rows on toggle, and hides at zero', () => {
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({
                    runId: 1,
                    runnerName: 'plainrunner',
                    time: 10_000,
                    markedForLater: false,
                }),
                rosterRow({
                    runId: 2,
                    runnerName: 'markedrunner',
                    time: 20_000,
                    markedForLater: true,
                }),
            ],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        expect(screen.getByText('plainrunner')).toBeTruthy();
        expect(screen.getByText('markedrunner')).toBeTruthy();

        const chip = screen.getByRole('button', { name: '1 marked' });
        expect(chip.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(chip);

        expect(chip.getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByText('plainrunner')).toBeNull();
        expect(screen.getByText('markedrunner')).toBeTruthy();

        fireEvent.click(chip);
        expect(screen.getByText('plainrunner')).toBeTruthy();
    });

    it('renders no chip when nothing is marked', () => {
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({
                    runId: 1,
                    runnerName: 'plainrunner',
                    time: 10_000,
                    markedForLater: false,
                }),
            ],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        expect(screen.queryByText(/marked$/)).toBeNull();
    });
});

describe('BoardCuration — bulk selection', () => {
    it('prunes a removed run out of the current bulk selection', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { affectedRunCount: 1, affectedLeaderboards: [] },
        });
        const reload = vi.fn();
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({
                    runId: 1,
                    userId: null,
                    runnerName: 'alice',
                    time: 10_000,
                }),
                rosterRow({
                    runId: 2,
                    userId: null,
                    runnerName: 'bob',
                    time: 20_000,
                }),
            ],
            loading: false,
            error: null,
            reload,
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        fireEvent.click(screen.getByLabelText('Select alice'));
        fireEvent.click(screen.getByLabelText('Select bob'));
        expect(screen.getByText('2 selected')).toBeTruthy();

        fireEvent.click(
            within(rowContaining('alice')).getByRole('button', {
                name: 'Remove',
            }),
        );

        await waitFor(() =>
            expect(screen.getByText('1 selected')).toBeTruthy(),
        );
    });
});

function rowContaining(name: string): HTMLElement {
    const rows = screen.getAllByRole('row');
    const found = rows.find((r) => r.textContent?.includes(name));
    if (!found) throw new Error(`No row found containing "${name}"`);
    return found;
}

describe('BoardCuration subcategory bands', () => {
    it('re-keys the roster query when a subcategory value is picked', () => {
        mockUseBoardData.mockReturnValue({
            rows: [],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[NG_PLUS_VAR]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        // The default value's index (0 -> "No") is the initial key.
        expect(mockUseBoardData).toHaveBeenLastCalledWith(
            GAME.name,
            CATEGORY.id,
            'ngplus=no',
        );

        fireEvent.click(screen.getByText('Yes'));

        expect(mockUseBoardData).toHaveBeenLastCalledWith(
            GAME.name,
            CATEGORY.id,
            'ngplus=yes',
        );
    });

    it('renders no bands and an empty key when the category has no subcategory variables', () => {
        mockUseBoardData.mockReturnValue({
            rows: [],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        expect(mockUseBoardData).toHaveBeenLastCalledWith(
            GAME.name,
            CATEGORY.id,
            '',
        );
    });
});

function renderTwoRunners() {
    mockUseBoardData.mockReturnValue({
        rows: [
            rosterRow({
                runId: 1,
                userId: 5,
                runnerName: 'alice',
                time: 10_000,
            }),
            rosterRow({
                runId: 2,
                userId: null,
                runnerName: 'guestbob',
                time: 20_000,
            }),
        ],
        loading: false,
        error: null,
        reload: vi.fn(),
    });
    return render(
        <BoardCuration
            game={GAME}
            categories={[CATEGORY]}
            groups={GROUPS}
            variables={[]}
            policies={[]}
            canConfigure
            context="console"
        />,
    );
}

describe('BoardCuration — multi-select bulk actions', () => {
    it('shows the selection bar, calls markRunsAction(..., false) for Accept, and clears selection', async () => {
        mocks.markRunsAction.mockResolvedValue({ ok: true, updated: 2 });
        renderTwoRunners();

        fireEvent.click(screen.getByLabelText('Select alice'));
        fireEvent.click(screen.getByLabelText('Select guestbob'));
        expect(screen.getByText('2 selected')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Accept' }));

        await waitFor(() =>
            expect(mocks.markRunsAction).toHaveBeenCalledWith(
                'some-game',
                [1, 2],
                false,
            ),
        );
        await waitFor(() =>
            expect(screen.queryByText('2 selected')).toBeNull(),
        );
    });

    it('previews unique userIds, skips guests, and bans sequentially with one shared reason', async () => {
        mocks.previewExcludeAction.mockResolvedValue({
            ok: true,
            preview: {
                affectedRunCount: 2,
                affectedLeaderboards: [],
                sampleRuns: [],
            },
        });
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { ruleId: 1, alreadyExists: false },
        });
        renderTwoRunners();

        fireEvent.click(screen.getByLabelText('Select alice'));
        fireEvent.click(screen.getByLabelText('Select guestbob'));
        fireEvent.click(screen.getByRole('button', { name: 'Ban…' }));

        await waitFor(() =>
            expect(mocks.previewExcludeAction).toHaveBeenCalledWith(
                'some-game',
                { rule: { type: 'user', targetId: 5 } },
            ),
        );
        expect(mocks.previewExcludeAction).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/1 guest/)).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'Mass cheating ring.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm ban' }));

        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                rule: { type: 'user', targetId: 5 },
                reason: 'Mass cheating ring.',
            }),
        );
        expect(mocks.excludeAction).toHaveBeenCalledTimes(1);
    });
});

describe('BoardCuration — moved-here tag', () => {
    it('shows a moved-here tag and clears it via moveRunAction(gameSlug, runId, null)', async () => {
        mocks.moveRunAction.mockResolvedValue({ ok: true });
        const reload = vi.fn();
        mockUseBoardData.mockReturnValue({
            rows: [
                rosterRow({
                    runId: 1,
                    runnerName: 'alice',
                    boardOverride: { categoryId: 10, subcategoryKey: '' },
                }),
            ],
            loading: false,
            error: null,
            reload,
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        expect(screen.getByText('moved here')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Clear move for alice'));

        await waitFor(() =>
            expect(mocks.moveRunAction).toHaveBeenCalledWith(
                'some-game',
                1,
                null,
                [{ categoryId: CATEGORY.id, subcategoryKey: '' }],
            ),
        );
        expect(reload).toHaveBeenCalled();
    });
});

describe('BoardCuration — reorder mode', () => {
    const CAT1: ResolvedCategory = {
        id: 10,
        name: 'any-percent',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 1,
    };
    const CAT2: ResolvedCategory = {
        id: 11,
        name: '100-percent',
        display: '100%',
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 2,
    };

    it('swaps sortOrder values correctly when a category tab is nudged', async () => {
        mocks.reorderCategoriesAction.mockResolvedValue({
            result: { reordered: true },
        });
        mockUseBoardData.mockReturnValue({
            rows: [],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CAT1, CAT2]}
                groups={GROUPS}
                variables={[]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /^Reorder$/ }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Move 100% earlier' }),
        );

        await waitFor(() =>
            expect(mocks.reorderCategoriesAction).toHaveBeenCalledWith({
                gameSlug: 'some-game',
                gameId: 1,
                changes: [
                    { categoryId: CAT2.id, sortOrder: 1 },
                    { categoryId: CAT1.id, sortOrder: 2 },
                ],
            }),
        );
        await waitFor(() => expect(mocks.routerRefresh).toHaveBeenCalled());
    });

    it('sends a reordered values array with all other UpsertVariableInput fields intact when a value is nudged', async () => {
        const VAR: VariableRow = {
            id: 200,
            gameId: 1,
            categoryId: CATEGORY.id,
            name: 'Console',
            nameNormalized: 'console',
            role: 'subcategory',
            values: [['PC'], ['Xbox']],
            defaultValueIndex: 0,
            sortOrder: 1,
            description: 'Platform played on',
            version: 3,
            published: true,
        };
        mocks.updateVariableAction.mockResolvedValue({ result: VAR });
        mockUseBoardData.mockReturnValue({
            rows: [],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[VAR]}
                policies={[]}
                canConfigure
                context="console"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /^Reorder$/ }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Move Xbox earlier' }),
        );

        await waitFor(() =>
            expect(mocks.updateVariableAction).toHaveBeenCalledWith({
                gameSlug: 'some-game',
                gameId: 1,
                body: {
                    categoryId: CATEGORY.id,
                    name: 'Console',
                    role: 'subcategory',
                    values: [['Xbox'], ['PC']],
                    defaultValueIndex: 0,
                    sortOrder: 1,
                    description: 'Platform played on',
                },
            }),
        );
    });
});

describe('BoardCuration subcategory key normalization', () => {
    // Backend stores subcategory_key values through normalizeVariableString
    // (lowercase, whitespace and =| stripped): "Nintendo 64" -> "nintendo64".
    // The pane must request the roster in that normalized space or a
    // display-cased variable (SM64's Platform) silently empties the board.
    const PLATFORM_VAR: VariableRow = {
        id: 200,
        gameId: 1,
        categoryId: null,
        name: 'Platform',
        nameNormalized: 'platform',
        role: 'subcategory',
        values: [
            ['Nintendo 64', 'n64'],
            ['Virtual Console', 'VC'],
            ['Emulator', 'emu'],
        ],
        defaultValueIndex: 0,
        sortOrder: 0,
        description: null,
        version: 2,
        published: true,
    };

    it('requests the roster with the normalized default subcategory key', () => {
        mockUseBoardData.mockReturnValue({
            rows: [],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[PLATFORM_VAR]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        expect(mockUseBoardData).toHaveBeenLastCalledWith(
            GAME.name,
            CATEGORY.id,
            'platform=nintendo64',
        );
    });

    it('keeps display labels on the chips while selecting normalized values', () => {
        mockUseBoardData.mockReturnValue({
            rows: [],
            loading: false,
            error: null,
            reload: vi.fn(),
        });

        render(
            <BoardCuration
                game={GAME}
                categories={[CATEGORY]}
                groups={GROUPS}
                variables={[PLATFORM_VAR]}
                policies={[]}
                canConfigure
                context="wizard"
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Virtual Console' }),
        );
        expect(mockUseBoardData).toHaveBeenLastCalledWith(
            GAME.name,
            CATEGORY.id,
            'platform=virtualconsole',
        );
    });
});
