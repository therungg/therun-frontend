// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

const data = {
    game: { id: 1, name: 'doom' },
    categories: [],
    groups: [],
    levelTemplates: [],
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
});
