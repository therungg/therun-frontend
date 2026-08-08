// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { BoardPolicyRow } from '../../../../../../types/moderation.types';
import { BoardControls } from './board-controls';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted — see board-curation.test.tsx
// for the same pattern.
const mocks = vi.hoisted(() => ({
    createPolicyAction: vi.fn(),
    updatePolicyAction: vi.fn(),
    deletePolicyAction: vi.fn(),
    updateVariableAction: vi.fn(),
    updateCategorySettingsAction: vi.fn(),
    updateTimingSettingsAction: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    routerRefresh: vi.fn(),
}));

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
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: mocks.routerRefresh }),
}));

const CATEGORY: ResolvedCategory = {
    id: 10,
    name: 'any-percent',
    display: 'Any%',
    primaryTiming: 'rt',
    archived: false,
    isMain: true,
    sortOrder: 1,
};

function baseProps(
    overrides: Partial<Parameters<typeof BoardControls>[0]> = {},
) {
    return {
        gameSlug: 'some-game',
        gameId: 1,
        category: CATEGORY,
        timing: 'rt' as const,
        policies: [] as BoardPolicyRow[],
        subcatVars: [] as VariableRow[],
        selectedValues: {} as Record<string, string>,
        reorderMode: false,
        onToggleReorderMode: vi.fn(),
        reload: vi.fn(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe('BoardControls — Minimum', () => {
    it('writes only minGameTimeMs for a gt-primary category, never minTimeMs', async () => {
        mocks.createPolicyAction.mockResolvedValue({
            ok: true,
            policy: {} as BoardPolicyRow,
        });

        render(<BoardControls {...baseProps({ timing: 'gt' })} />);

        fireEvent.click(screen.getByRole('button', { name: /Minimum/ }));
        fireEvent.change(
            screen.getByPlaceholderText('e.g. 0:30 (empty = no minimum)'),
            { target: { value: '0:30' } },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await vi.waitFor(() =>
            expect(mocks.createPolicyAction).toHaveBeenCalledTimes(1),
        );
        const [, input] = mocks.createPolicyAction.mock.calls[0];
        expect(input).toEqual({
            policyType: 'min_time',
            value: { minGameTimeMs: 30_000 },
            categoryId: CATEGORY.id,
        });
        expect(input.value).not.toHaveProperty('minTimeMs');
    });

    it('clears only a category-scoped policy, never the game-wide one', async () => {
        const categoryScoped: BoardPolicyRow = {
            id: 5,
            gameId: 1,
            categoryId: CATEGORY.id,
            subcategoryKey: null,
            policyType: 'min_time',
            value: { minTimeMs: 10_000 },
            createdBy: 1,
            reason: 'test',
            createdAt: '2026-01-01T00:00:00.000Z',
        };
        const gameWide: BoardPolicyRow = {
            id: 9,
            gameId: 1,
            categoryId: null,
            subcategoryKey: null,
            policyType: 'min_time',
            value: { minTimeMs: 5_000 },
            createdBy: 1,
            reason: 'test',
            createdAt: '2026-01-01T00:00:00.000Z',
        };
        mocks.deletePolicyAction.mockResolvedValue({ ok: true });

        render(
            <BoardControls
                {...baseProps({ policies: [categoryScoped, gameWide] })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Minimum/ }));
        const input = screen.getByPlaceholderText(
            'e.g. 0:30 (empty = no minimum)',
        ) as HTMLInputElement;
        expect(input.value).toBe('00:10');
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await vi.waitFor(() =>
            expect(mocks.deletePolicyAction).toHaveBeenCalledTimes(1),
        );
        expect(mocks.deletePolicyAction).toHaveBeenCalledWith(
            'some-game',
            categoryScoped.id,
        );
        expect(mocks.createPolicyAction).not.toHaveBeenCalled();
        expect(mocks.updatePolicyAction).not.toHaveBeenCalled();
    });
});

describe('BoardControls — Set as default view', () => {
    it('writes the right defaultValueIndex per variable', async () => {
        const varA: VariableRow = {
            id: 100,
            gameId: 1,
            categoryId: CATEGORY.id,
            name: 'Console',
            nameNormalized: 'console',
            role: 'subcategory',
            values: [['A'], ['B']],
            defaultValueIndex: 0,
            sortOrder: 1,
            description: null,
            version: 1,
            published: true,
        };
        const varB: VariableRow = {
            id: 101,
            gameId: 1,
            categoryId: CATEGORY.id,
            name: 'Version',
            nameNormalized: 'version',
            role: 'subcategory',
            values: [['X'], ['Y'], ['Z']],
            defaultValueIndex: 0,
            sortOrder: 2,
            description: null,
            version: 1,
            published: true,
        };
        mocks.updateVariableAction.mockResolvedValue({
            result: {} as never,
        });

        render(
            <BoardControls
                {...baseProps({
                    subcatVars: [varA, varB],
                    selectedValues: { console: 'B', version: 'Z' },
                })}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Set as default view' }),
        );

        await vi.waitFor(() =>
            expect(mocks.updateVariableAction).toHaveBeenCalledTimes(2),
        );
        expect(mocks.updateVariableAction).toHaveBeenNthCalledWith(1, {
            gameSlug: 'some-game',
            gameId: 1,
            body: {
                categoryId: CATEGORY.id,
                name: 'Console',
                role: 'subcategory',
                values: [['A'], ['B']],
                defaultValueIndex: 1,
                sortOrder: 1,
                description: null,
                showValueOnBoard: false,
            },
        });
        expect(mocks.updateVariableAction).toHaveBeenNthCalledWith(2, {
            gameSlug: 'some-game',
            gameId: 1,
            body: {
                categoryId: CATEGORY.id,
                name: 'Version',
                role: 'subcategory',
                values: [['X'], ['Y'], ['Z']],
                defaultValueIndex: 2,
                sortOrder: 2,
                description: null,
                showValueOnBoard: false,
            },
        });
        await vi.waitFor(() =>
            expect(mocks.toastSuccess).toHaveBeenCalledWith(
                'New default: B · Z',
            ),
        );
    });
});

describe('BoardControls — Display, secondary clock only', () => {
    it('offers no checkbox for the primary clock and writes only the secondary hide flag', async () => {
        mocks.updateTimingSettingsAction.mockResolvedValue({ ok: true });
        render(<BoardControls {...baseProps()} />);

        fireEvent.click(screen.getByRole('button', { name: /Display/ }));

        // Primary is rt — always shown, so there is nothing to toggle for it.
        expect(screen.queryByLabelText('Show real time')).toBeNull();
        expect(screen.queryByLabelText('Show game time')).toBeNull();

        fireEvent.click(screen.getByLabelText('Also show game time'));
        await vi.waitFor(() =>
            expect(mocks.updateTimingSettingsAction).toHaveBeenCalledWith(
                expect.objectContaining({ hideGameTime: true }),
            ),
        );
        expect(mocks.updateTimingSettingsAction).not.toHaveBeenCalledWith(
            expect.objectContaining({ hideRealTime: expect.anything() }),
        );
    });

    it('offers the real-time checkbox when the primary is game time', () => {
        render(<BoardControls {...baseProps({ timing: 'gt' })} />);
        fireEvent.click(screen.getByRole('button', { name: /Display/ }));
        expect(screen.getByLabelText('Also show real time')).toBeTruthy();
    });
});
