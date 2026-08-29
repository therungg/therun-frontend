// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WizardData } from '../types';

vi.mock('../../manage/identifiers/actions/update-identifiers.action', () => ({
    updateIdentifiersAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../actions/update-game-metadata.action', () => ({
    updateGameMetadataAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../actions/get-cover-upload-url.action', () => ({
    getCoverUploadUrlAction: vi.fn(),
}));
vi.mock(
    '../../manage/moderation/policies/actions/policies-actions.action',
    () => ({
        createPolicyAction: vi.fn(async () => ({ policy: { id: 5 } })),
        updatePolicyAction: vi.fn(async () => ({ policy: { id: 5 } })),
        deletePolicyAction: vi.fn(async () => ({ ok: true })),
    }),
);
vi.mock('~src/components/link', () => ({
    default: ({ children, ...props }: Record<string, unknown>) => (
        <a {...props}>{children as never}</a>
    ),
}));
vi.mock('../../manage/identifiers/actions/igdb-match.action', () => ({
    igdbSearchAction: vi.fn(async () => ({ result: [] })),
    igdbApplyMatchAction: vi.fn(async () => ({
        result: { igdbName: 'Example' },
    })),
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ refresh: vi.fn() }),
}));

import { createPolicyAction } from '../../manage/moderation/policies/actions/policies-actions.action';
import { updateGameMetadataAction } from '../actions/update-game-metadata.action';
import { StepDetails } from './step-details';

const data = {
    game: { id: 1, name: 'example-game', display: 'Example Game', image: null },
    categories: [],
    policies: [],
    identifiers: { slug: '' },
    metadata: {
        coverUrl: null,
        platforms: [],
        igdbPlatforms: [],
        releaseYear: null,
        firstReleaseDate: null,
        discordUrl: null,
        summary: null,
        summaryOverride: null,
        links: [],
        igdbUrl: null,
        primaryTiming: null,
        rulesTemplate: null,
        gameRules: null,
        emulatorPolicy: null,
        hideRealTime: false,
        hideGameTime: false,
    },
} as unknown as WizardData;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('StepDetails', () => {
    it('renders the step header', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        expect(
            screen.getByRole('heading', { name: 'Game details' }),
        ).toBeInTheDocument();
    });

    it('renders exactly one Save & continue button, associated with the details form', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        const buttons = screen.getAllByRole('button', {
            name: 'Save & continue',
        });
        expect(buttons).toHaveLength(1);
        expect(buttons[0].getAttribute('form')).toBe('game-details-form');
        expect(document.getElementById('game-details-form')?.tagName).toBe(
            'FORM',
        );
    });

    it('renders emulator policy as a segmented radiogroup and toggles it', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        const group = screen.getByRole('radiogroup', {
            name: 'Emulator policy',
        });
        const banned = screen.getByRole('radio', { name: 'Banned' });
        expect(group.contains(banned)).toBe(true);
        fireEvent.click(banned);
        expect(banned.getAttribute('aria-checked')).toBe('true');
    });

    it('has no game-level minimum-time field (minimums are category-level)', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        expect(screen.queryByLabelText('Minimum real time')).toBeNull();
        expect(screen.queryByText('Minimum time')).toBeNull();
    });

    it('surfaces a blocked-submit form error near the bottom action', async () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        fireEvent.change(screen.getByPlaceholderText('e.g. super-mario-64'), {
            target: { value: '!!!' },
        });
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() =>
            expect(
                screen.getAllByText(
                    'URL slug must contain at least one alphanumeric character.',
                ),
            ).toHaveLength(2),
        );
    });

    it('saves details and defaults in one submit without touching policies, then advances', async () => {
        const onAdvance = vi.fn();
        render(
            <StepDetails data={data} onAdvance={onAdvance} onBack={vi.fn()} />,
        );
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() => expect(onAdvance).toHaveBeenCalledTimes(1));
        expect(updateGameMetadataAction).toHaveBeenCalledWith(
            expect.objectContaining({ primaryTiming: 'rt' }),
        );
        expect(createPolicyAction).not.toHaveBeenCalled();
    });

    it('always shows the primary column and offers only the secondary as a checkbox', () => {
        render(
            <StepDetails data={data} onAdvance={vi.fn()} onBack={vi.fn()} />,
        );
        // Primary defaults to RTA, so the only checkbox is the secondary.
        expect(screen.queryByRole('checkbox', { name: 'Show real time' })).toBe(
            null,
        );
        const secondary = screen.getByRole('checkbox', {
            name: 'Also show game time',
        });
        expect((secondary as HTMLInputElement).checked).toBe(true);
        // Flipping the primary timing relabels the secondary checkbox.
        fireEvent.click(screen.getByRole('radio', { name: 'IGT' }));
        expect(
            screen.getByRole('checkbox', { name: 'Also show real time' }),
        ).toBeTruthy();
    });

    it('derives the hide flags from the primary timing and the secondary checkbox', async () => {
        const onAdvance = vi.fn();
        render(
            <StepDetails data={data} onAdvance={onAdvance} onBack={vi.fn()} />,
        );
        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Also show game time' }),
        );
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() => expect(onAdvance).toHaveBeenCalledTimes(1));
        expect(updateGameMetadataAction).toHaveBeenCalledWith(
            expect.objectContaining({
                hideRealTime: false,
                hideGameTime: true,
            }),
        );
    });

    it('never hides the primary clock, even after a timing flip', async () => {
        const onAdvance = vi.fn();
        render(
            <StepDetails data={data} onAdvance={onAdvance} onBack={vi.fn()} />,
        );
        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Also show game time' }),
        );
        fireEvent.click(screen.getByRole('radio', { name: 'IGT' }));
        fireEvent.submit(document.getElementById('game-details-form')!);
        await waitFor(() => expect(onAdvance).toHaveBeenCalledTimes(1));
        // Secondary is now real time; game time is primary and stays shown.
        expect(updateGameMetadataAction).toHaveBeenCalledWith(
            expect.objectContaining({
                hideRealTime: true,
                hideGameTime: false,
            }),
        );
    });
});
