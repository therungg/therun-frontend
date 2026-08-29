// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
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
    it('shows level category groups under a Levels endcap', () => {
        render(
            <CategoryBandPreview
                categories={[
                    cat({ id: 1, display: 'Any%', groupId: null }),
                    // A level board: a category sitting in a kind:'level' group.
                    cat({
                        id: 2,
                        name: 'bob-omb',
                        display: 'Bob-omb Battlefield',
                        groupId: 20,
                    }),
                ]}
                groups={[group({ id: 20, name: 'Bob-omb', kind: 'level' })]}
            />,
        );
        expect(screen.getByText('Levels')).toBeInTheDocument();
        expect(screen.getByText('Bob-omb')).toBeInTheDocument();
    });
});
