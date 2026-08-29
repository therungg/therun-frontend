// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import { CategoryBandPreview } from './category-band-preview';

function cat(over: Partial<ResolvedCategory>): ResolvedCategory {
    return {
        id: 1,
        name: 'any',
        display: 'Any%',
        primaryTiming: 'rt',
        archived: false,
        isMain: true,
        sortOrder: 0,
        groupId: null,
        totalRunTime: 0,
        ...over,
    } as ResolvedCategory;
}

function group(over: Partial<ResolvedGroup>): ResolvedGroup {
    return {
        id: 1,
        name: 'Group',
        sortOrder: 0,
        kind: 'normal',
        rules: null,
        ...over,
    };
}

describe('CategoryBandPreview', () => {
    it('shows level groups under a Levels endcap as an expandable dropdown', () => {
        render(
            <CategoryBandPreview
                categories={[
                    cat({ id: 1, display: 'Any%', groupId: null }),
                    // Level boards: categories sitting in kind:'level' groups.
                    cat({
                        id: 2,
                        name: 'bob',
                        display: 'Bob-omb',
                        groupId: 20,
                    }),
                    cat({
                        id: 3,
                        name: 'whomp',
                        display: 'Whomp',
                        groupId: 21,
                    }),
                ]}
                groups={[
                    group({ id: 20, name: 'Bob-omb', kind: 'level' }),
                    group({ id: 21, name: 'Whomp', kind: 'level' }),
                ]}
            />,
        );
        expect(screen.getByText('Levels')).toBeInTheDocument();
        // A real <select> the mod can expand, one option per level.
        const picker = screen.getByRole('combobox', { name: 'Levels' });
        expect(
            within(picker)
                .getAllByRole('option')
                .map((o) => o.textContent),
        ).toEqual(['Bob-omb', 'Whomp']);
    });
});
