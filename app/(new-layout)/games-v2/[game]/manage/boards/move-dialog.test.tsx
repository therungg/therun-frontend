// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedCategory } from '../../../../../../types/leaderboards.types';
import type { LeaderboardRosterRow } from '../../../../../../types/moderation.types';
import { MoveDialog, type MoveDialogProps } from './move-dialog';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s — see adjust-dialog.test.tsx for the same pattern.
const mocks = vi.hoisted(() => ({
    moveRunAction: vi.fn(),
    fireUndoToast: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
}));

vi.mock('../moderation/shared/actions/board-override.action', () => ({
    moveRunAction: mocks.moveRunAction,
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

const OTHER_CATEGORY: ResolvedCategory = {
    id: 20,
    name: '100-percent',
    display: '100%',
    primaryTiming: 'rt',
    archived: false,
    isMain: true,
    sortOrder: 2,
};

function rosterRow(
    overrides: Partial<LeaderboardRosterRow> = {},
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

function renderDialog(overrides: Partial<MoveDialogProps> = {}) {
    const onClose = vi.fn();
    const onMutated = vi.fn();
    const props: MoveDialogProps = {
        open: true,
        onClose,
        row: rosterRow({}),
        category: CATEGORY,
        categories: [CATEGORY, OTHER_CATEGORY],
        variables: [],
        subcategoryKey: '',
        gameSlug: 'some-game',
        onMutated,
        ...overrides,
    };
    const view = render(<MoveDialog {...props} />);
    return { onClose, onMutated, ...view };
}

function selectOtherCategory() {
    fireEvent.change(screen.getByLabelText('Category'), {
        target: { value: String(OTHER_CATEGORY.id) },
    });
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    cleanup();
});

describe('MoveDialog — moderator path (no new props)', () => {
    it('renders the reason field and requires it before Apply enables', () => {
        renderDialog();
        expect(screen.getByLabelText(/Reason/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Apply' })).toHaveProperty(
            'disabled',
            true,
        );

        selectOtherCategory();
        fireEvent.change(screen.getByLabelText(/Reason/), {
            target: { value: 'a valid reason here' },
        });
        expect(screen.getByRole('button', { name: 'Apply' })).toHaveProperty(
            'disabled',
            false,
        );
    });

    it('does not render the owner notice', () => {
        renderDialog();
        expect(
            screen.queryByText(/will not carry its verified status over/),
        ).toBeNull();
    });

    it('submits via moveRunAction with the trimmed reason and undo wiring', async () => {
        mocks.moveRunAction.mockResolvedValue({ ok: true });
        const { onMutated, onClose } = renderDialog();

        selectOtherCategory();
        fireEvent.change(screen.getByLabelText(/Reason/), {
            target: { value: '  a valid reason here  ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() =>
            expect(mocks.moveRunAction).toHaveBeenCalledWith(
                'some-game',
                1,
                { categoryId: OTHER_CATEGORY.id, subcategoryKey: '' },
                [
                    { categoryId: CATEGORY.id, subcategoryKey: '' },
                    { categoryId: OTHER_CATEGORY.id, subcategoryKey: '' },
                ],
                'a valid reason here',
            ),
        );
        expect(onClose).toHaveBeenCalled();
        expect(onMutated).toHaveBeenCalled();
        expect(mocks.fireUndoToast).toHaveBeenCalledWith(
            'Moved runner.',
            expect.any(Function),
            onMutated,
        );
        expect(mocks.toastSuccess).not.toHaveBeenCalled();
    });
});

describe('MoveDialog — owner mode', () => {
    it('hides the reason field entirely', () => {
        renderDialog({ ownerMode: true, onSubmitOwner: vi.fn() });
        expect(screen.queryByLabelText(/Reason/)).toBeNull();
    });

    it('shows the standing notice about losing verified status', () => {
        renderDialog({ ownerMode: true, onSubmitOwner: vi.fn() });
        expect(
            screen.getByText(
                'Moving your run takes it off this board and submits it for verification on the new one. It will not carry its verified status over.',
            ),
        ).toBeTruthy();
    });

    it('submit is enabled without a reason once a target is picked', () => {
        renderDialog({ ownerMode: true, onSubmitOwner: vi.fn() });
        expect(screen.getByRole('button', { name: 'Apply' })).toHaveProperty(
            'disabled',
            true,
        );
        selectOtherCategory();
        expect(screen.getByRole('button', { name: 'Apply' })).toHaveProperty(
            'disabled',
            false,
        );
    });

    it('calls onSubmitOwner with the target and toasts the reverify variant', async () => {
        const onSubmitOwner = vi
            .fn()
            .mockResolvedValue({ ok: true, reverify: true });
        const { onMutated, onClose } = renderDialog({
            ownerMode: true,
            onSubmitOwner,
        });

        selectOtherCategory();
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() =>
            expect(onSubmitOwner).toHaveBeenCalledWith({
                categoryId: OTHER_CATEGORY.id,
                subcategoryKey: '',
            }),
        );
        expect(mocks.moveRunAction).not.toHaveBeenCalled();
        expect(mocks.fireUndoToast).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(onMutated).toHaveBeenCalled();
        expect(mocks.toastSuccess).toHaveBeenCalledWith(
            'Run moved. It awaits verification on its new board.',
        );
    });

    it('toasts the plain variant when reverify is false', async () => {
        const onSubmitOwner = vi
            .fn()
            .mockResolvedValue({ ok: true, reverify: false });
        renderDialog({ ownerMode: true, onSubmitOwner });

        selectOtherCategory();
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() =>
            expect(mocks.toastSuccess).toHaveBeenCalledWith('Run moved.'),
        );
    });

    it('an inline error keeps the dialog open', async () => {
        const onSubmitOwner = vi.fn().mockResolvedValue({
            error: 'this run was placed by a moderator — appeal instead of moving it',
        });
        const { onClose } = renderDialog({ ownerMode: true, onSubmitOwner });

        selectOtherCategory();
        fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

        await waitFor(() =>
            expect(
                screen.getByText(
                    'this run was placed by a moderator — appeal instead of moving it',
                ),
            ).toBeTruthy(),
        );
        expect(onClose).not.toHaveBeenCalled();
        expect(mocks.toastSuccess).not.toHaveBeenCalled();
    });
});
