// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RunDescription } from './run-description';

const mocks = vi.hoisted(() => ({
    setOwnDescriptionAction: vi.fn(),
    setOwnManualTimeDescriptionAction: vi.fn(),
    removeDescriptionAction: vi.fn(),
    removeManualTimeDescriptionAction: vi.fn(),
    setDescriptionRestrictionAction: vi.fn(),
    setManualTimeDescriptionRestrictionAction: vi.fn(),
}));

vi.mock('../leaderboard/actions/run-description.action', () => mocks);
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

// react-markdown ships ESM-only deps that don't need exercising here — the
// panel's job is who may write, not how markdown renders.
vi.mock('react-markdown', () => ({
    default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock('remark-gfm', () => ({ default: () => undefined }));

beforeEach(() => {
    for (const fn of Object.values(mocks)) fn.mockReset();
});

const base = {
    kind: 'run' as const,
    runId: 7,
    description: null as string | null,
    canEdit: false,
};

describe('RunDescription — who sees what', () => {
    it('renders nothing for a visitor when there is no description', () => {
        const { container } = render(<RunDescription {...base} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('shows the text to a plain visitor, with no controls', () => {
        render(<RunDescription {...base} description="Route notes" />);
        expect(screen.getByText('Route notes')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers the owner an editor even on an empty description', () => {
        render(<RunDescription {...base} canEdit />);
        expect(screen.getByText('Add a description')).toBeTruthy();
    });
});

describe('RunDescription — the owner writing', () => {
    it('saves through the run action and leaves edit mode', async () => {
        mocks.setOwnDescriptionAction.mockResolvedValue({
            ok: true,
            description: 'Route notes',
        });
        render(<RunDescription {...base} canEdit />);
        fireEvent.click(screen.getByText('Add a description'));
        fireEvent.change(screen.getByLabelText('Run description'), {
            target: { value: 'Route notes' },
        });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() =>
            expect(mocks.setOwnDescriptionAction).toHaveBeenCalledWith(
                7,
                'Route notes',
            ),
        );
    });

    it('routes a manual time to the manual-time action instead', async () => {
        mocks.setOwnManualTimeDescriptionAction.mockResolvedValue({
            ok: true,
            description: 'x',
        });
        render(<RunDescription {...base} kind="manual" canEdit />);
        fireEvent.click(screen.getByText('Add a description'));
        fireEvent.change(screen.getByLabelText('Run description'), {
            target: { value: 'x' },
        });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() =>
            expect(
                mocks.setOwnManualTimeDescriptionAction,
            ).toHaveBeenCalledWith(7, 'x'),
        );
        expect(mocks.setOwnDescriptionAction).not.toHaveBeenCalled();
    });

    it('disables the field and explains itself when descriptions are revoked', () => {
        render(
            <RunDescription
                {...base}
                canEdit
                restriction={{ reason: 'ads in every run', since: null }}
            />,
        );
        fireEvent.click(screen.getByText('Add a description'));
        const field = screen.getByLabelText(
            'Run description',
        ) as HTMLTextAreaElement;
        expect(field.disabled).toBe(true);
        expect(
            screen.getByText(/removed your ability to add a description/),
        ).toBeTruthy();
    });
});

describe('RunDescription — the moderator', () => {
    const mod = {
        ...base,
        description: 'Route notes',
        canModerate: true,
        gameSlug: 'sm64',
    };

    it('gets removal and revoke, but never an editor', () => {
        render(<RunDescription {...mod} />);
        expect(screen.getByText('Remove description')).toBeTruthy();
        expect(screen.getByText('Revoke descriptions')).toBeTruthy();
        expect(screen.queryByText('Edit')).toBeNull();
    });

    it('offers no revoke on a guest row — there is no account to restrict', () => {
        render(<RunDescription {...mod} hasAccount={false} />);
        expect(screen.getByText('Remove description')).toBeTruthy();
        expect(screen.queryByText('Revoke descriptions')).toBeNull();
    });

    it('holds the verb until a long enough reason is typed', async () => {
        mocks.removeDescriptionAction.mockResolvedValue({ ok: true });
        render(<RunDescription {...mod} />);
        fireEvent.click(screen.getByText('Remove description'));

        const confirm = screen.getByText('Confirm') as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'short' },
        });
        expect(
            (screen.getByText('Confirm') as HTMLButtonElement).disabled,
        ).toBe(true);

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'advertising in the description' },
        });
        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() =>
            expect(mocks.removeDescriptionAction).toHaveBeenCalledWith(
                'sm64',
                7,
                'advertising in the description',
            ),
        );
    });

    it('sends revoke through the restriction action', async () => {
        mocks.setDescriptionRestrictionAction.mockResolvedValue({
            ok: true,
            changed: true,
        });
        render(<RunDescription {...mod} />);
        fireEvent.click(screen.getByText('Revoke descriptions'));
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'advertising in the description' },
        });
        fireEvent.click(screen.getByText('Confirm'));

        await waitFor(() =>
            expect(mocks.setDescriptionRestrictionAction).toHaveBeenCalledWith(
                'sm64',
                7,
                'revoke',
                'advertising in the description',
            ),
        );
    });

    it('gives the moderator verbs to no one on their own run', () => {
        render(<RunDescription {...mod} canEdit />);
        expect(screen.queryByText('Remove description')).toBeNull();
        expect(screen.getByText('Edit')).toBeTruthy();
    });
});
