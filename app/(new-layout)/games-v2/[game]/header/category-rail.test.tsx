// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { CategoryRail } from './category-rail';

vi.mock('next/navigation', () => ({
    usePathname: () => '/games-v2/some-game',
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock('../filters/use-board-nav', () => ({
    useBoardNav: () => ({
        navigate: vi.fn(),
        isPending: false,
        pendingKey: null,
    }),
}));

afterEach(() => {
    cleanup();
});

function cat(
    overrides: Partial<ResolvedCategory> & { id: number },
): ResolvedCategory {
    return {
        name: `cat-${overrides.id}`,
        display: `Cat ${overrides.id}`,
        primaryTiming: 'rt',
        archived: false,
        sortOrder: 0,
        isMain: true,
        ...overrides,
    };
}

describe('CategoryRail — levels-only game', () => {
    it('renders the Level select and no "No categories enabled" placeholder', () => {
        const groups: ResolvedGroup[] = [
            { id: 1, name: 'E1M1', sortOrder: 1, kind: 'level', rules: null },
        ];
        const categories = [
            cat({
                id: 20,
                groupId: 1,
                display: 'E1M1 — Any%',
                levelTemplateId: 9,
                name: 'e1m1-any',
            }),
        ];
        render(
            <CategoryRail
                categories={categories}
                groups={groups}
                selectedCategoryName="e1m1-any"
                variableKeys={[]}
            />,
        );
        expect(screen.getByRole('combobox', { name: 'Level' })).toBeTruthy();
        expect(
            screen.queryByText('No categories enabled for this group.'),
        ).toBeNull();
    });
});
