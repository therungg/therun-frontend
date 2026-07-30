// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// RowActions (rendered per row) reaches these — mocked here purely to keep
// this suite's rendering hermetic (avoids pulling in the real 'use server'
// action modules and their next/headers-touching dependencies). Behavior of
// the actions themselves is covered by row-actions.test.tsx.
vi.mock('../moderation/shared/actions/exclude.action', () => ({
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
}));
vi.mock('../moderation/shared/actions/restore.action', () => ({
    restoreRunsAction: vi.fn(),
}));
vi.mock('../moderation/shared/actions/manual-times.action', () => ({
    createManualTimeAction: vi.fn(),
}));
vi.mock('../moderation/shared/actions/marks.action', () => ({
    markRunsAction: vi.fn(),
}));
vi.mock('../moderation/shared/actions/eligible-runs.action', () => ({
    loadUserEligibleRunsAction: vi.fn(),
}));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUseBoardData = vi.mocked(useBoardData);

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

        const rows = screen.getAllByRole('row').slice(1); // drop the header row
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
});

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
            'ngplus=No',
        );

        fireEvent.click(screen.getByText('Yes'));

        expect(mockUseBoardData).toHaveBeenLastCalledWith(
            GAME.name,
            CATEGORY.id,
            'ngplus=Yes',
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
