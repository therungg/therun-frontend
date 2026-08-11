// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    selfAnonymizeStateAction: vi.fn(),
    selfAnonymizeApplyAction: vi.fn(),
    selfAnonymizeLiftAction: vi.fn(),
    toastSuccess: vi.fn(),
}));

vi.mock('~src/actions/run-user-actions.action', () => ({
    selfAnonymizeStateAction: mocks.selfAnonymizeStateAction,
    selfAnonymizeApplyAction: mocks.selfAnonymizeApplyAction,
    selfAnonymizeLiftAction: mocks.selfAnonymizeLiftAction,
}));
vi.mock('react-toastify', () => ({
    toast: { success: mocks.toastSuccess, info: vi.fn(), error: vi.fn() },
}));

import { OwnerHideIdentityDialog } from './owner-hide-identity-dialog';

beforeEach(() => {
    vi.clearAllMocks();
});
afterEach(cleanup);

function renderDialog(
    overrides: Partial<{ onClose: () => void; onDone: () => void }> = {},
) {
    const onClose = overrides.onClose ?? vi.fn();
    const onDone = overrides.onDone ?? vi.fn();
    render(
        <OwnerHideIdentityDialog
            open
            onClose={onClose}
            onDone={onDone}
            gameId={5}
            gameSlug="mario64"
            gameDisplay="Super Mario 64"
        />,
    );
    return { onClose, onDone };
}

describe('OwnerHideIdentityDialog', () => {
    it('state (a): not hidden — explains and offers to hide', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: false,
                selfApplied: false,
                ruleId: null,
                displayName: null,
            },
        });
        renderDialog();
        await screen.findByText(/Hide who you are across Super Mario 64/);
        expect(
            screen.getByRole('button', { name: 'Hide my identity' }),
        ).toBeTruthy();
        // No unhide affordance while not hidden.
        expect(screen.queryByRole('button', { name: 'Unhide' })).toBeNull();
    });

    it('state (b): hidden and self-applied — shows the placeholder, offers Unhide', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: true,
                selfApplied: true,
                ruleId: 7,
                displayName: 'Anonymous runner #3',
            },
        });
        renderDialog();
        await screen.findByText(/Anonymous runner #3/);
        expect(screen.getByRole('button', { name: 'Unhide' })).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: 'Hide my identity' }),
        ).toBeNull();
    });

    it('state (c): hidden by a moderator — explains, offers no action', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: true,
                selfApplied: false,
                ruleId: 9,
                displayName: 'Anonymous runner #3',
            },
        });
        renderDialog();
        await screen.findByText(/A moderator hid your identity here/);
        expect(screen.getByText(/only a site admin can lift it/i)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Unhide' })).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Hide my identity' }),
        ).toBeNull();
    });

    it('re-GETs after a successful POST and offers Unhide only when the follow-up GET says selfApplied', async () => {
        mocks.selfAnonymizeStateAction
            .mockResolvedValueOnce({
                ok: true,
                state: {
                    hidden: false,
                    selfApplied: false,
                    ruleId: null,
                    displayName: null,
                },
            })
            .mockResolvedValueOnce({
                ok: true,
                state: {
                    hidden: true,
                    selfApplied: true,
                    ruleId: 11,
                    displayName: 'Anonymous runner #4',
                },
            });
        mocks.selfAnonymizeApplyAction.mockResolvedValue({
            ok: true,
            // POST response deliberately has no selfApplied/ruleId field.
            displayName: 'Anonymous runner #4',
        });
        const { onDone } = renderDialog();
        fireEvent.click(
            await screen.findByRole('button', { name: 'Hide my identity' }),
        );
        await waitFor(() => {
            expect(mocks.selfAnonymizeStateAction).toHaveBeenCalledTimes(2);
        });
        expect(mocks.selfAnonymizeApplyAction).toHaveBeenCalledWith(
            'mario64',
            5,
        );
        await screen.findByRole('button', { name: 'Unhide' });
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('does not offer Unhide when a moderator already owns the rule POST reported alreadyExists for', async () => {
        // The runner's POST reports alreadyExists:true (a covering rule
        // exists) but it was placed by a moderator — the follow-up GET is
        // the only source of truth on ownership.
        mocks.selfAnonymizeStateAction
            .mockResolvedValueOnce({
                ok: true,
                state: {
                    hidden: false,
                    selfApplied: false,
                    ruleId: null,
                    displayName: null,
                },
            })
            .mockResolvedValueOnce({
                ok: true,
                state: {
                    hidden: true,
                    selfApplied: false,
                    ruleId: 12,
                    displayName: 'Anonymous runner #4',
                },
            });
        mocks.selfAnonymizeApplyAction.mockResolvedValue({
            ok: true,
            displayName: 'Anonymous runner #4',
            alreadyExists: true,
        });
        renderDialog();
        fireEvent.click(
            await screen.findByRole('button', { name: 'Hide my identity' }),
        );
        await screen.findByText(/A moderator hid your identity here/);
        expect(screen.queryByRole('button', { name: 'Unhide' })).toBeNull();
    });

    it('the overlap case: DELETE reports still-hidden after lifting your own rule, and success copy reflects it', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: true,
                selfApplied: true,
                ruleId: 20,
                displayName: 'Anonymous runner #5',
            },
        });
        mocks.selfAnonymizeLiftAction.mockResolvedValue({
            ok: true,
            // The caller's own rule really was lifted, but a moderator's
            // overlapping category rule still covers them.
            state: {
                hidden: true,
                selfApplied: false,
                ruleId: 30,
                displayName: 'Anonymous runner #5',
            },
        });
        const { onDone } = renderDialog();
        fireEvent.click(await screen.findByRole('button', { name: 'Unhide' }));
        await waitFor(() => {
            expect(mocks.selfAnonymizeLiftAction).toHaveBeenCalledWith(
                'mario64',
                5,
            );
        });
        // The dialog re-renders from the returned state, not an assumption
        // that lifting your rule means you're visible now.
        await screen.findByText(/A moderator hid your identity here/);
        await waitFor(() =>
            expect(mocks.toastSuccess).toHaveBeenCalledWith(
                expect.stringContaining('still hides your identity here'),
            ),
        );
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('non-overlap unhide: DELETE reports fully visible, and the toast describes the change as in progress, not instant/total', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: true,
                selfApplied: true,
                ruleId: 21,
                displayName: 'Anonymous runner #7',
            },
        });
        mocks.selfAnonymizeLiftAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: false,
                selfApplied: false,
                ruleId: null,
                displayName: null,
            },
        });
        const { onDone } = renderDialog();
        fireEvent.click(await screen.findByRole('button', { name: 'Unhide' }));
        await waitFor(() => {
            expect(mocks.selfAnonymizeLiftAction).toHaveBeenCalledWith(
                'mario64',
                5,
            );
        });
        await screen.findByText(/Hide who you are across Super Mario 64/);
        await waitFor(() =>
            expect(mocks.toastSuccess).toHaveBeenCalledWith(
                expect.stringMatching(/unhiding.*may take a moment/i),
            ),
        );
        // Never claim instant/total effect — the contract's cache-invalidation
        // has no success signal.
        expect(mocks.toastSuccess).not.toHaveBeenCalledWith(
            expect.stringMatching(/visible here again/i),
        );
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('unknown ownership: apply succeeds but the follow-up GET fails — renders neutral copy, no moderator attribution, no Unhide button', async () => {
        mocks.selfAnonymizeStateAction
            .mockResolvedValueOnce({
                ok: true,
                state: {
                    hidden: false,
                    selfApplied: false,
                    ruleId: null,
                    displayName: null,
                },
            })
            .mockResolvedValueOnce({ error: 'Something went wrong.' });
        mocks.selfAnonymizeApplyAction.mockResolvedValue({
            ok: true,
            displayName: 'Anonymous runner #8',
        });
        const { onDone } = renderDialog();
        fireEvent.click(
            await screen.findByRole('button', { name: 'Hide my identity' }),
        );
        await waitFor(() => {
            expect(mocks.selfAnonymizeStateAction).toHaveBeenCalledTimes(2);
        });
        await screen.findByText(
            /couldn't confirm whether you can undo it here/,
        );
        // Must NOT tell the runner a moderator did this — they just did it
        // themselves; the follow-up GET merely failed to confirm it.
        expect(
            screen.queryByText(/A moderator hid your identity here/),
        ).toBeNull();
        expect(screen.queryByText(/only a site admin can lift it/i)).toBeNull();
        expect(screen.queryByRole('button', { name: 'Unhide' })).toBeNull();
        await waitFor(() => expect(onDone).toHaveBeenCalled());
    });

    it('load-error phase: initial GET fails, "Try again" retries and renders the resolved state', async () => {
        mocks.selfAnonymizeStateAction
            .mockResolvedValueOnce({ error: 'Something went wrong.' })
            .mockResolvedValueOnce({
                ok: true,
                state: {
                    hidden: false,
                    selfApplied: false,
                    ruleId: null,
                    displayName: null,
                },
            });
        renderDialog();
        const retry = await screen.findByRole('button', {
            name: 'Try again',
        });
        expect(
            screen.queryByRole('button', { name: 'Hide my identity' }),
        ).toBeNull();
        fireEvent.click(retry);
        await waitFor(() => {
            expect(mocks.selfAnonymizeStateAction).toHaveBeenCalledTimes(2);
        });
        await screen.findByText(/Hide who you are across Super Mario 64/);
        expect(
            screen.getByRole('button', { name: 'Hide my identity' }),
        ).toBeTruthy();
    });

    it('surfaces the no-runs-in-game error inline and keeps the dialog open', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: false,
                selfApplied: false,
                ruleId: null,
                displayName: null,
            },
        });
        mocks.selfAnonymizeApplyAction.mockResolvedValue({
            error: 'you have no runs in this game — nothing to hide',
        });
        const { onClose, onDone } = renderDialog();
        fireEvent.click(
            await screen.findByRole('button', { name: 'Hide my identity' }),
        );
        await screen.findByText(
            'you have no runs in this game — nothing to hide',
        );
        // Failure never closes the dialog or fires onDone — only success does.
        expect(onClose).not.toHaveBeenCalled();
        expect(onDone).not.toHaveBeenCalled();
        // The offer to hide is still there — the caller can retry or fix
        // the underlying issue and come back.
        expect(
            screen.getByRole('button', { name: 'Hide my identity' }),
        ).toBeTruthy();
    });

    it('surfaces a lift error inline and keeps the dialog open', async () => {
        mocks.selfAnonymizeStateAction.mockResolvedValue({
            ok: true,
            state: {
                hidden: true,
                selfApplied: true,
                ruleId: 40,
                displayName: 'Anonymous runner #6',
            },
        });
        mocks.selfAnonymizeLiftAction.mockResolvedValue({
            error: 'identity was hidden by a moderator — contact an admin to lift it',
        });
        const { onClose, onDone } = renderDialog();
        fireEvent.click(await screen.findByRole('button', { name: 'Unhide' }));
        await screen.findByText(
            'identity was hidden by a moderator — contact an admin to lift it',
        );
        expect(onClose).not.toHaveBeenCalled();
        expect(onDone).not.toHaveBeenCalled();
    });
});
