// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';
import { RunnerDialog, type RunnerDialogProps } from './runner-dialog';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s (which would still be in their TDZ when the factory
// runs) — see row-actions.test.tsx for the same pattern.
const mocks = vi.hoisted(() => ({
    siteBanRunnerAction: vi.fn(),
    liftSiteBanAction: vi.fn(),
    excludeAction: vi.fn(),
    previewExcludeAction: vi.fn(),
    fireUndoToast: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('../moderation/shared/actions/anonymize.action', () => ({
    siteBanRunnerAction: mocks.siteBanRunnerAction,
    liftSiteBanAction: mocks.liftSiteBanAction,
}));
vi.mock('../moderation/shared/actions/exclude.action', () => ({
    excludeAction: mocks.excludeAction,
    previewExcludeAction: mocks.previewExcludeAction,
}));
vi.mock('../moderation/shared/undo-toast', () => ({
    fireUndoToast: mocks.fireUndoToast,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, error: mocks.toastError },
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

function rosterRow(
    overrides: Partial<LeaderboardRosterRow>,
): LeaderboardRosterRow {
    return {
        runId: 1,
        userId: 5,
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

function renderRunnerDialog(overrides: Partial<RunnerDialogProps> = {}) {
    const onClose = vi.fn();
    const onMutated = vi.fn();
    const props: RunnerDialogProps = {
        open: true,
        onClose,
        row: rosterRow({}),
        category: CATEGORY,
        variables: [],
        gameSlug: 'some-game',
        subcategoryKey: '',
        canSiteBan: false,
        onMutated,
        ...overrides,
    };
    const view = render(<RunnerDialog {...props} />);
    return { onClose, onMutated, ...view };
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.previewExcludeAction.mockResolvedValue({
        ok: true,
        preview: { affectedRunCount: 3, affectedLeaderboards: [] },
    });
});

afterEach(() => {
    cleanup();
});

describe('RunnerDialog', () => {
    it('board scope previews a category-scoped rule on open', async () => {
        renderRunnerDialog();

        expect(mocks.previewExcludeAction).toHaveBeenCalledWith('some-game', {
            rule: { type: 'user', targetId: 5, categoryId: 10 },
        });
        await screen.findByText(/3 runs? affected/);
    });

    it('switching to Whole game re-previews without categoryId', async () => {
        renderRunnerDialog();
        await screen.findByText(/3 runs? affected/);

        fireEvent.click(screen.getByRole('radio', { name: 'Whole game' }));

        await waitFor(() =>
            expect(mocks.previewExcludeAction).toHaveBeenCalledTimes(2),
        );
        const secondCall = mocks.previewExcludeAction.mock.calls[1];
        expect(secondCall[0]).toBe('some-game');
        expect(secondCall[1]).toEqual(
            expect.objectContaining({
                rule: expect.objectContaining({
                    type: 'user',
                    targetId: 5,
                }),
            }),
        );
        expect(secondCall[1].rule.categoryId).not.toBe(10);
        expect(secondCall[1].rule.categoryId).toBeUndefined();
    });

    it('Entire site hidden without canSiteBan', () => {
        renderRunnerDialog({ canSiteBan: false });
        expect(screen.queryByRole('radio', { name: 'Entire site' })).toBeNull();
    });

    it('subcategory note shows only for subcategoried category at board scope', () => {
        const { rerender, onClose, onMutated } = renderRunnerDialog({
            variables: [NG_PLUS_VAR],
        });
        expect(
            screen.getByText(
                'Covers every subcategory board of Any% — exact single-board scope is coming later.',
            ),
        ).toBeTruthy();

        rerender(
            <RunnerDialog
                open
                onClose={onClose}
                row={rosterRow({})}
                category={CATEGORY}
                variables={[]}
                gameSlug="some-game"
                subcategoryKey=""
                canSiteBan={false}
                onMutated={onMutated}
            />,
        );
        expect(
            screen.queryByText(
                'Covers every subcategory board of Any% — exact single-board scope is coming later.',
            ),
        ).toBeNull();
    });

    it('confirm disabled until reason', async () => {
        renderRunnerDialog();
        const confirm = screen.getByRole('button', {
            name: 'Confirm removal',
        }) as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);

        await screen.findByText(/3 runs? affected/);
        expect(confirm.disabled).toBe(true);

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'spam' },
        });
        expect(confirm.disabled).toBe(false);
    });

    it('confirm disabled while preview is unresolved', async () => {
        // Hold the preview pending — Confirm must stay disabled even once
        // a reason is entered, since board/game scope removal without a
        // landed preview is exactly the plan defect this gate closes. The
        // promise is resolved before the test ends (rather than left
        // hanging forever) so its transition settles cleanly instead of
        // leaving a pending scheduler task behind for later tests.
        let resolvePreview: (value: unknown) => void = () => undefined;
        mocks.previewExcludeAction.mockReturnValue(
            new Promise((resolve) => {
                resolvePreview = resolve;
            }),
        );
        renderRunnerDialog();

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'spam' },
        });

        expect(
            screen.getByRole('button', { name: 'Confirm removal' }),
        ).toHaveProperty('disabled', true);

        resolvePreview({
            ok: true,
            preview: { affectedRunCount: 0, affectedLeaderboards: [] },
        });
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'Confirm removal' }),
            ).toHaveProperty('disabled', false),
        );
    });

    it('scope buttons expose selected state', async () => {
        renderRunnerDialog();
        await screen.findByText(/3 runs? affected/);

        const boardBtn = screen.getByRole('radio', { name: 'This board' });
        const gameBtn = screen.getByRole('radio', { name: 'Whole game' });
        expect(boardBtn.getAttribute('aria-checked')).toBe('true');
        expect(gameBtn.getAttribute('aria-checked')).toBe('false');

        fireEvent.click(gameBtn);

        expect(gameBtn.getAttribute('aria-checked')).toBe('true');
        expect(boardBtn.getAttribute('aria-checked')).toBe('false');

        // Let the re-triggered preview settle before the test ends.
        await waitFor(() =>
            expect(mocks.previewExcludeAction).toHaveBeenCalledTimes(2),
        );
    });

    it('board confirm files the scoped rule', async () => {
        mocks.excludeAction.mockResolvedValue({
            ok: true,
            result: { ruleId: 1, alreadyExists: false },
        });
        const { onMutated } = renderRunnerDialog();
        await screen.findByText(/3 runs? affected/);

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'spam' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm removal' }),
        );

        await waitFor(() =>
            expect(mocks.excludeAction).toHaveBeenCalledWith('some-game', {
                rule: { type: 'user', targetId: 5, categoryId: 10 },
                reason: 'spam',
            }),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalled());
        expect(mocks.toastSuccess).toHaveBeenCalledWith(
            'runner removed from boards.',
        );
    });

    it('site confirm bans with the chosen treatment', async () => {
        mocks.siteBanRunnerAction.mockResolvedValue({ ok: true, banId: 77 });
        mocks.liftSiteBanAction.mockResolvedValue({ ok: true });
        const { onMutated } = renderRunnerDialog({ canSiteBan: true });

        fireEvent.click(screen.getByRole('radio', { name: 'Entire site' }));
        fireEvent.click(screen.getByRole('radio', { name: 'Hide name' }));
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'tos' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm site ban' }),
        );

        await waitFor(() =>
            expect(mocks.siteBanRunnerAction).toHaveBeenCalledWith(
                'some-game',
                {
                    username: 'runner',
                    reason: 'tos',
                    treatment: 'anonymize',
                    board: { categoryId: 10, subcategoryKey: '' },
                },
            ),
        );
        await waitFor(() => expect(onMutated).toHaveBeenCalled());
        expect(mocks.fireUndoToast).toHaveBeenCalledWith(
            'runner banned site-wide.',
            expect.any(Function),
            onMutated,
        );

        const undo = mocks.fireUndoToast.mock.calls[0][1];
        await undo();
        expect(mocks.liftSiteBanAction).toHaveBeenCalledWith(77, 'some-game', {
            categoryId: 10,
            subcategoryKey: '',
        });
    });

    it('treatment labels map correctly', async () => {
        mocks.siteBanRunnerAction.mockResolvedValue({ ok: true, banId: 1 });
        const { unmount } = renderRunnerDialog({ canSiteBan: true });

        fireEvent.click(screen.getByRole('radio', { name: 'Entire site' }));
        fireEvent.click(
            screen.getByRole('radio', { name: 'Remove from boards' }),
        );
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'tos' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm site ban' }),
        );

        await waitFor(() =>
            expect(mocks.siteBanRunnerAction).toHaveBeenCalledWith(
                'some-game',
                expect.objectContaining({ treatment: 'exclude' }),
            ),
        );
        unmount();
        mocks.siteBanRunnerAction.mockClear();
        mocks.siteBanRunnerAction.mockResolvedValue({ ok: true, banId: 2 });

        renderRunnerDialog({ canSiteBan: true });
        fireEvent.click(screen.getByRole('radio', { name: 'Entire site' }));
        fireEvent.click(screen.getByRole('radio', { name: 'Keep as-is' }));
        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'tos' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm site ban' }),
        );

        await waitFor(() =>
            expect(mocks.siteBanRunnerAction).toHaveBeenCalledWith(
                'some-game',
                expect.objectContaining({ treatment: 'keep' }),
            ),
        );
    });

    it('error keeps the dialog open', async () => {
        mocks.excludeAction.mockResolvedValue({ error: 'nope' });
        renderRunnerDialog();
        await screen.findByText(/3 runs? affected/);

        fireEvent.change(screen.getByLabelText('Reason — required'), {
            target: { value: 'spam' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Confirm removal' }),
        );

        await waitFor(() =>
            expect(mocks.toastError).toHaveBeenCalledWith('nope'),
        );
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'Confirm removal' }),
            ).toBeTruthy(),
        );
    });
});
