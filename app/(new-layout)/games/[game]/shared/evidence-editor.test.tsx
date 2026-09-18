// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EvidenceEditor } from './evidence-editor';

afterEach(() => {
    cleanup();
});

const editablePerms = {
    canEditVod: true,
    canEditDescription: true,
    lockedReason: null,
};

const lockedPerms = {
    canEditVod: false,
    canEditDescription: false,
    lockedReason:
        'This run is verified — locked, ask a moderator to make changes.',
};

describe('EvidenceEditor', () => {
    it('shows no edit affordances when both perms are false and nothing is set', () => {
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={{
                    canEditVod: false,
                    canEditDescription: false,
                    lockedReason: null,
                }}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
        expect(
            screen.queryByText(/add a description/i),
        ).not.toBeInTheDocument();
        expect(screen.getByText(/no video/i)).toBeInTheDocument();
        expect(screen.getByText(/no description/i)).toBeInTheDocument();
    });

    it('shows the Add a link affordance only when canEditVod', () => {
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={{ ...editablePerms, canEditDescription: false }}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.getByText(/add a link/i)).toBeInTheDocument();
        expect(
            screen.queryByText(/add a description/i),
        ).not.toBeInTheDocument();
    });

    it('shows the description editor only when canEditDescription', () => {
        render(
            <EvidenceEditor
                vodUrl={null}
                description="Some notes"
                perms={{ ...editablePerms, canEditVod: false }}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.queryByText(/add a link/i)).not.toBeInTheDocument();
        expect(screen.getByText(/edit description/i)).toBeInTheDocument();
    });

    it('renders the lockedReason note when present', () => {
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={lockedPerms}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.getByText(/verified.*locked/i)).toBeInTheDocument();
    });

    it('verified (both-false + lockedReason) state shows the note and no edit controls', () => {
        render(
            <EvidenceEditor
                vodUrl="https://www.twitch.tv/videos/12345"
                description="Existing description"
                perms={lockedPerms}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.queryByText(/change link/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/edit description/i)).not.toBeInTheDocument();
        expect(screen.getByText(/verified.*locked/i)).toBeInTheDocument();
        // Read-only content still shows
        expect(screen.getByText('Existing description')).toBeInTheDocument();
    });

    it('calls onSaveVod with the typed url when attaching', async () => {
        const onSaveVod = vi.fn().mockResolvedValue({ ok: true });
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={editablePerms}
                onSaveVod={onSaveVod}
                onSaveDescription={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText(/add a link/i));
        const input = screen.getByLabelText(/video link/i);
        fireEvent.change(input, {
            target: { value: 'https://www.twitch.tv/videos/12345' },
        });
        fireEvent.click(screen.getByRole('button', { name: /attach/i }));

        await screen.findByText(/change link/i);
        expect(onSaveVod).toHaveBeenCalledWith(
            'https://www.twitch.tv/videos/12345',
        );
    });

    it('calls onSaveVod with null when removing the current link', async () => {
        const onSaveVod = vi.fn().mockResolvedValue({ ok: true });
        render(
            <EvidenceEditor
                vodUrl="https://www.twitch.tv/videos/12345"
                description={null}
                perms={editablePerms}
                onSaveVod={onSaveVod}
                onSaveDescription={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText(/change link/i));
        fireEvent.click(screen.getByText(/remove the current link/i));

        await screen.findByText(/add a link/i);
        expect(onSaveVod).toHaveBeenCalledWith(null);
    });

    it('surfaces an error returned by onSaveVod', async () => {
        const onSaveVod = vi.fn().mockResolvedValue({ error: 'Bad link.' });
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={editablePerms}
                onSaveVod={onSaveVod}
                onSaveDescription={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText(/add a link/i));
        const input = screen.getByLabelText(/video link/i);
        fireEvent.change(input, { target: { value: 'https://example.com/v' } });
        fireEvent.click(screen.getByRole('button', { name: /attach/i }));

        expect(await screen.findByText('Bad link.')).toBeInTheDocument();
    });

    it('calls onSaveDescription with the typed text on save', async () => {
        const onSaveDescription = vi.fn().mockResolvedValue({ ok: true });
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={editablePerms}
                onSaveVod={vi.fn()}
                onSaveDescription={onSaveDescription}
            />,
        );

        fireEvent.click(screen.getByText(/add a description/i));
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'A great run.' } });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        await screen.findByText(/edit description/i);
        expect(onSaveDescription).toHaveBeenCalledWith('A great run.');
    });

    it('calls onSaveDescription with null when clearing', async () => {
        const onSaveDescription = vi.fn().mockResolvedValue({ ok: true });
        render(
            <EvidenceEditor
                vodUrl={null}
                description="Existing text"
                perms={editablePerms}
                onSaveVod={vi.fn()}
                onSaveDescription={onSaveDescription}
            />,
        );

        fireEvent.click(screen.getByText(/edit description/i));
        fireEvent.click(screen.getByText(/clear description/i));

        await screen.findByText(/add a description/i);
        expect(onSaveDescription).toHaveBeenCalledWith(null);
    });

    it('surfaces an error returned by onSaveDescription', async () => {
        const onSaveDescription = vi
            .fn()
            .mockResolvedValue({ error: 'Too long.' });
        render(
            <EvidenceEditor
                vodUrl={null}
                description={null}
                perms={editablePerms}
                onSaveVod={vi.fn()}
                onSaveDescription={onSaveDescription}
            />,
        );

        fireEvent.click(screen.getByText(/add a description/i));
        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'x'.repeat(10) } });
        fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

        expect(await screen.findByText('Too long.')).toBeInTheDocument();
    });

    it('renders an embeddable Twitch vod inline and a link to open it', () => {
        render(
            <EvidenceEditor
                vodUrl="https://www.twitch.tv/videos/12345"
                description={null}
                perms={editablePerms}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.getByText(/open in a new tab/i)).toBeInTheDocument();
    });

    it('renders a non-embeddable vod as a plain link card', () => {
        render(
            <EvidenceEditor
                vodUrl="https://example.com/my-run.mp4"
                description={null}
                perms={editablePerms}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        expect(screen.getByText(/opens on another host/i)).toBeInTheDocument();
    });

    it('renders description markdown', () => {
        render(
            <EvidenceEditor
                vodUrl={null}
                description="**bold text**"
                perms={{ ...editablePerms }}
                onSaveVod={vi.fn()}
                onSaveDescription={vi.fn()}
            />,
        );

        const strong = screen.getByText('bold text');
        expect(strong.tagName.toLowerCase()).toBe('strong');
    });
});
