// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import type { LevelTemplate } from '../../../../../types/levels.types';
import type { LevelGroupVisibility } from './category-visibility';
import { LevelPicker } from './level-picker';

afterEach(() => {
    cleanup();
});

function board(
    overrides: Partial<ResolvedCategory> & { id: number },
): ResolvedCategory {
    return {
        name: `board-${overrides.id}`,
        display: `Board ${overrides.id}`,
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        ...overrides,
    };
}

function template(
    overrides: Partial<LevelTemplate> & { id: number },
): LevelTemplate {
    return {
        display: `Template ${overrides.id}`,
        rules: null,
        isMain: false,
        sortOrder: 0,
        imageUrl: null,
        ...overrides,
    };
}

const levels: LevelGroupVisibility[] = [
    {
        id: 1,
        name: 'E1M1',
        rules: null,
        boards: [
            board({
                id: 10,
                name: 'e1m1-any',
                display: 'E1M1 — Any%',
                levelTemplateId: 9,
            }),
        ],
    },
    {
        id: 2,
        name: 'E1M2',
        rules: null,
        boards: [
            board({
                id: 20,
                name: 'e1m2-any',
                display: 'E1M2 — Any%',
                levelTemplateId: 9,
            }),
        ],
    },
];

const templates: LevelTemplate[] = [template({ id: 9, display: 'Any%' })];

describe('LevelPicker', () => {
    it('renders a select with one option per level, selecting the active level', () => {
        render(
            <LevelPicker
                levels={levels}
                activeLevelId={2}
                activeCategoryName="e1m2-any"
                templates={templates}
                onSelect={vi.fn()}
            />,
        );
        const select = screen.getByRole('combobox', {
            name: 'Level',
        }) as HTMLSelectElement;
        expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
            'E1M1',
            'E1M2',
        ]);
        expect(select.value).toBe('2');
    });

    it("shows pills for the active level's boards, labelled by the template display", () => {
        render(
            <LevelPicker
                levels={levels}
                activeLevelId={2}
                activeCategoryName="e1m2-any"
                templates={templates}
                onSelect={vi.fn()}
            />,
        );
        expect(screen.getByText('Any%')).toBeTruthy();
        expect(screen.queryByText('E1M2 — Any%')).toBeNull();
    });

    it('calls onSelect(board.name) on pill click', () => {
        const onSelect = vi.fn();
        render(
            <LevelPicker
                levels={levels}
                activeLevelId={2}
                activeCategoryName="e1m2-any"
                templates={templates}
                onSelect={onSelect}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Any%' }));
        expect(onSelect).toHaveBeenCalledWith('e1m2-any');
    });

    it('calls onSelect with the first board of the chosen level on select change', () => {
        const onSelect = vi.fn();
        render(
            <LevelPicker
                levels={levels}
                activeLevelId={2}
                activeCategoryName="e1m2-any"
                templates={templates}
                onSelect={onSelect}
            />,
        );
        const select = screen.getByRole('combobox', { name: 'Level' });
        fireEvent.change(select, { target: { value: '1' } });
        expect(onSelect).toHaveBeenCalledWith('e1m1-any');
    });
});
