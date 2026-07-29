import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VariablesSection } from './variables-section';

// vi.mock factories are hoisted above these imports, so the mock fns
// themselves must be created through vi.hoisted rather than referenced as
// plain outer `const`s (which would still be in their TDZ when the factory
// runs).
const mocks = vi.hoisted(() => ({
    previewVariableAction: vi.fn(),
    createVariableAction: vi.fn(),
    updateVariableAction: vi.fn(),
    deleteVariableAction: vi.fn(),
    loadVariablesAction: vi.fn(),
    loadMergedVariablesAction: vi.fn(),
    rebuildBoardsAction: vi.fn(),
}));

vi.mock('./actions/preview-variable.action', () => ({
    previewVariableAction: mocks.previewVariableAction,
}));
vi.mock('./actions/create-variable.action', () => ({
    createVariableAction: mocks.createVariableAction,
}));
vi.mock('./actions/update-variable.action', () => ({
    updateVariableAction: mocks.updateVariableAction,
}));
vi.mock('./actions/delete-variable.action', () => ({
    deleteVariableAction: mocks.deleteVariableAction,
}));
vi.mock('./actions/load-variables.action', () => ({
    loadVariablesAction: mocks.loadVariablesAction,
}));
vi.mock('./actions/load-merged-variables.action', () => ({
    loadMergedVariablesAction: mocks.loadMergedVariablesAction,
}));
vi.mock('./actions/rebuild-boards.action', () => ({
    rebuildBoardsAction: mocks.rebuildBoardsAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

function renderSection() {
    return render(
        <VariablesSection
            gameSlug="celeste"
            gameId={1}
            selectedCategory={null}
        />,
    );
}

async function openCreateFormAndFillIn() {
    fireEvent.click(screen.getByRole('button', { name: '+ Add variable' }));
    fireEvent.change(screen.getByLabelText('Name'), {
        target: { value: 'Platform' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nintendo 64'), {
        target: { value: 'N64' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create variable' }));
}

describe('VariablesSection write path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.loadVariablesAction.mockResolvedValue({
            result: { variables: [], reservedParams: [] },
        });
    });

    afterEach(() => {
        cleanup();
    });

    // Task 16's whole point: handleSubmit only ever requests a preview. The
    // real create/update/delete call lives in commitWrite(), reachable only
    // through the dialog's confirm button.
    it('submitting the form requests a preview and does not write directly', async () => {
        mocks.previewVariableAction.mockResolvedValue({
            result: { moved: 0, unresolved: 0, categories: [] },
        });

        renderSection();
        await waitFor(() =>
            expect(mocks.loadVariablesAction).toHaveBeenCalled(),
        );

        await openCreateFormAndFillIn();

        await waitFor(() =>
            expect(mocks.previewVariableAction).toHaveBeenCalledTimes(1),
        );
        expect(mocks.createVariableAction).not.toHaveBeenCalled();
        expect(mocks.updateVariableAction).not.toHaveBeenCalled();
    });

    // CRITICAL #1 regression test: if the preview promise never resolves to
    // either a result or an `{ error }` (a rejected server action — network
    // failure, deploy-time action-id mismatch, anything outside
    // previewVariableAction's own try/catch), `preview` stays null and the
    // dialog must refuse to commit a write. Both defenses are exercised
    // here: the confirm button is disabled, and clicking it anyway (a user
    // agent could still dispatch the event) results in no write call.
    it('does not write when confirming while preview is still null', async () => {
        let resolvePreview: (value: unknown) => void = () => {
            // Replaced synchronously below, before this default is ever
            // reachable — placeholder to satisfy the type until then.
        };
        mocks.previewVariableAction.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePreview = resolve;
                }),
        );

        renderSection();
        await waitFor(() =>
            expect(mocks.loadVariablesAction).toHaveBeenCalled(),
        );

        await openCreateFormAndFillIn();

        await waitFor(() =>
            expect(mocks.previewVariableAction).toHaveBeenCalledTimes(1),
        );

        const confirmButton = await screen.findByRole('button', {
            name: 'Save changes',
        });
        expect((confirmButton as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(confirmButton);

        expect(mocks.createVariableAction).not.toHaveBeenCalled();
        expect(mocks.updateVariableAction).not.toHaveBeenCalled();
        expect(mocks.deleteVariableAction).not.toHaveBeenCalled();

        // Let the hung preview resolve so it can't leak a state update into
        // a later test after this component unmounts.
        resolvePreview({ result: { moved: 0, unresolved: 0, categories: [] } });
    });
});
