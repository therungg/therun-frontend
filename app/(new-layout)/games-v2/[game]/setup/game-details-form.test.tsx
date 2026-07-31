// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
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
vi.mock('~src/components/link', () => ({
    default: ({ children, ...props }: Record<string, unknown>) => (
        <a {...props}>{children as never}</a>
    ),
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

    it('shows the IGDB provenance line before the field grid', () => {
        render(
            <GameDetailsForm
                identifiers={identifiers}
                metadata={metadata}
                game={game}
                onSaved={vi.fn()}
            />,
        );
        const provenance = screen.getByText(/this IGDB entry/).closest('p')!;
        const grid = document.querySelector('.row.g-4')!;
        // Provenance must precede the grid in document order.
        expect(
            provenance.compareDocumentPosition(grid) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
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
