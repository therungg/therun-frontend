// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameIdentifiers, GameMetadata } from '~src/lib/game-mgmt';

vi.mock('../manage/identifiers/actions/update-identifiers.action', () => ({
    updateIdentifiersAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./actions/update-game-metadata.action', () => ({
    updateGameMetadataAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('./actions/get-cover-upload-url.action', () => ({
    getCoverUploadUrlAction: vi.fn(),
}));
vi.mock('../manage/identifiers/actions/igdb-match.action', () => ({
    igdbSearchAction: vi.fn(async () => ({ result: [] })),
    igdbApplyMatchAction: vi.fn(async () => ({
        result: { igdbName: 'Example' },
    })),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

import { updateIdentifiersAction } from '../manage/identifiers/actions/update-identifiers.action';
import { GameDetailsForm } from './game-details-form';

const identifiers = { slug: '' } as unknown as GameIdentifiers;
const metadata = {
    coverUrl: null,
    platforms: [],
    igdbPlatforms: [],
    releaseYear: null,
    firstReleaseDate: null,
    discordUrl: null,
    summary: null,
    summaryOverride: null,
    links: [],
    igdbUrl: 'https://www.igdb.com/games/example',
} as unknown as GameMetadata;
const game = { id: 1, name: 'example-game', image: null };

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('GameDetailsForm', () => {
    it('renders a <form> with the given id and hides the internal button when hideAction', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={vi.fn()}
            />,
        );
        const form = document.getElementById('game-details-form');
        expect(form?.tagName).toBe('FORM');
        expect(
            screen.queryByRole('button', { name: 'Save & continue' }),
        ).toBeNull();
    });

    it('keeps the internal submit button by default (console pane contract)', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                saveLabel="Save details"
                onSaved={vi.fn()}
            />,
        );
        const button = screen.getByRole('button', { name: 'Save details' });
        expect(button.getAttribute('type')).toBe('submit');
    });

    it('runs the save chain and calls onSaved on form submit', async () => {
        const onSaved = vi.fn();
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={onSaved}
            />,
        );
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(updateIdentifiersAction).toHaveBeenCalledTimes(1);
    });

    it('blocks submit and shows an error for a slug with no alphanumerics', async () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={vi.fn()}
            />,
        );
        fireEvent.change(screen.getByPlaceholderText('e.g. super-mario-64'), {
            target: { value: '!!!' },
        });
        fireEvent.submit(document.getElementById('game-details-form')!);
        await screen.findByText(
            'URL slug must contain at least one alphanumeric character.',
        );
        expect(updateIdentifiersAction).not.toHaveBeenCalled();
    });

    it('reports the blocked-submit error via onErrorChange, and null initially', async () => {
        const onErrorChange = vi.fn();
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                formId="game-details-form"
                hideAction
                onSaved={vi.fn()}
                onErrorChange={onErrorChange}
            />,
        );
        expect(onErrorChange).toHaveBeenCalledWith(null);
        fireEvent.change(screen.getByPlaceholderText('e.g. super-mario-64'), {
            target: { value: '!!!' },
        });
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() =>
            expect(onErrorChange).toHaveBeenCalledWith(
                'URL slug must contain at least one alphanumeric character.',
            ),
        );
    });

    it('shows the IGDB source card, linking the entry, under the field grid', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
            />,
        );
        const link = screen.getByRole('link', { name: 'example' });
        expect(link.getAttribute('href')).toBe(
            'https://www.igdb.com/games/example',
        );
        const card = screen.getByText('IGDB').closest('div')!;
        const grid = document.querySelector('.row.g-4')!;
        // The source card must follow the grid in document order.
        expect(
            grid.compareDocumentPosition(card) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('gates the re-match control on canRematch', () => {
        const { unmount } = render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
            />,
        );
        expect(
            screen.getByText('Only site admins can change the IGDB match.'),
        ).toBeInTheDocument();
        unmount();
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
                canRematch
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Change IGDB match' }),
        ).toBeInTheDocument();
    });

    it('says all fields match IGDB when nothing diverges', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
            />,
        );
        expect(screen.getByText('All fields match IGDB.')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Reset fields to IGDB…' }),
        ).toBeNull();
    });

    it('previews and applies a reset of diverged fields to the IGDB values', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={
                    {
                        ...(metadata as object),
                        releaseYear: 2001,
                        firstReleaseDate: '1996-06-23',
                        summary: 'From IGDB.',
                        summaryOverride: 'Custom text',
                    } as unknown as GameMetadata
                }
                game={game}
                onSaved={vi.fn()}
            />,
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Reset fields to IGDB…' }),
        );
        // Preview names the diverging fields with current → IGDB values.
        const dialog = within(
            document.querySelector('[role="dialog"]') as HTMLElement,
        );
        expect(dialog.getByText('Release year')).toBeInTheDocument();
        expect(dialog.getByText('1996')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Reset fields' }));
        expect(
            (document.getElementById('release-year') as HTMLInputElement).value,
        ).toBe('1996');
        expect(
            (document.getElementById('about') as HTMLTextAreaElement).value,
        ).toBe('From IGDB.');
        expect(screen.getByText('All fields match IGDB.')).toBeInTheDocument();
    });

    it('sectioned layout groups fields under Identity / About / Web & community', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
                sectioned
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'Identity' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'About' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Web & community' }),
        ).toBeInTheDocument();
    });

    it('default layout has no section headings (wizard unchanged)', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
            />,
        );
        expect(screen.queryByRole('heading', { name: 'Identity' })).toBeNull();
    });
});
