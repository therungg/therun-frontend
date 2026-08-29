// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createLevelAction } from '~src/actions/levels/create-level.action';
import { createLevelBoardAction } from '~src/actions/levels/create-level-board.action';
import { curateCategoryAction } from '../actions/curate-category.action';
import { StepLevels } from './step-levels';

vi.mock('./level-plan', async (orig) => await orig());
vi.mock('~src/actions/levels/create-level.action', () => ({
    createLevelAction: vi.fn(),
}));
vi.mock('~src/actions/levels/create-level-template.action', () => ({
    createLevelTemplateAction: vi.fn(),
}));
vi.mock('~src/actions/levels/create-level-board.action', () => ({
    createLevelBoardAction: vi.fn(),
}));
vi.mock('~src/actions/levels/level-op.action', () => ({
    levelOpAction: vi.fn(),
}));
vi.mock('../actions/curate-category.action', () => ({
    curateCategoryAction: vi.fn(),
}));

const metadata = {
    primaryTiming: 'rt',
    gameTimeLabel: 'igt',
    hideRealTime: false,
    hideGameTime: false,
} as any;

const data = {
    game: { id: 1, name: 'doom' },
    categories: [],
    groups: [],
    levelTemplates: [],
    metadata,
    // ...minimal WizardData shape; cast as any in the test
} as any;

describe('StepLevels', () => {
    it('hides level inputs until "has individual levels" is checked', () => {
        render(
            <StepLevels data={data} onAdvance={() => {}} onBack={() => {}} />,
        );
        expect(
            screen.getByRole('checkbox', { name: /individual levels/i }),
        ).not.toBeChecked();
        expect(screen.queryByLabelText(/your levels/i)).not.toBeInTheDocument();
    });

    it('creates a new level-only board as featured (isMain: true)', async () => {
        vi.mocked(createLevelAction).mockResolvedValue({
            result: { id: 101, created: 1 },
        } as any);
        vi.mocked(createLevelBoardAction).mockResolvedValue({
            result: { id: 201, created: 1 },
        } as any);

        render(
            <StepLevels data={data} onAdvance={() => {}} onBack={() => {}} />,
        );

        fireEvent.click(
            screen.getByRole('checkbox', { name: /individual levels/i }),
        );
        fireEvent.change(screen.getByLabelText(/your levels/i), {
            target: { value: 'E1M1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /save & continue/i }),
        );

        await waitFor(() => {
            expect(createLevelBoardAction).toHaveBeenCalledWith(
                expect.objectContaining({ isMain: true }),
            );
        });
    });

    it('features a matched full-game category via curateCategoryAction (isMain: true)', async () => {
        vi.mocked(createLevelAction).mockResolvedValue({
            result: { id: 102, created: 1 },
        } as any);
        vi.mocked(curateCategoryAction).mockResolvedValue({
            result: { updated: true },
        } as any);

        const matchedData = {
            ...data,
            categories: [{ id: 55, name: 'e1m1' }],
        };

        render(
            <StepLevels
                data={matchedData}
                onAdvance={() => {}}
                onBack={() => {}}
            />,
        );

        fireEvent.click(
            screen.getByRole('checkbox', { name: /individual levels/i }),
        );
        fireEvent.change(screen.getByLabelText(/your levels/i), {
            target: { value: 'E1M1' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: /save & continue/i }),
        );

        await waitFor(() => {
            expect(curateCategoryAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    categoryId: 55,
                    isMain: true,
                    seed: expect.any(Object),
                }),
            );
        });
    });
});
