import { describe, expect, it } from 'vitest';
import type { ResolvedCategory } from '../../../../types/leaderboards.types';
import type { ManageCategoryRow } from '../../category-mgmt';
import { previewCategories } from '../preview-categories';

function snapshot(): ResolvedCategory[] {
    return [
        {
            id: 1,
            name: 'any',
            display: 'Any%',
            isMain: true,
            archived: false,
            sortOrder: 1,
            groupId: null,
        },
        {
            id: 2,
            name: '120-star',
            display: '120 Star',
            isMain: false,
            archived: false,
            sortOrder: 2,
            groupId: null,
        },
    ] as unknown as ResolvedCategory[];
}

function row(patch: Partial<ManageCategoryRow>): ManageCategoryRow {
    return {
        id: 1,
        display: 'Any%',
        sortOrder: 1,
        primaryTiming: 'rt',
        isMain: true,
        active: true,
        groupId: null,
        groupName: null,
        totalRunTime: 0,
        totalFinishedAttemptCount: 0,
        uniqueRunners: 0,
        ...patch,
    } as ManageCategoryRow;
}

describe('previewCategories', () => {
    it('takes the live flags from the rows and the slug from the snapshot', () => {
        // The pane edits rows; only the snapshot knows a category's slug. A
        // preview built from either alone is wrong in one direction or the
        // other.
        const out = previewCategories(snapshot(), [
            row({ id: 1 }),
            row({ id: 2, display: '120 Star', isMain: true, sortOrder: 2 }),
        ]);

        expect(out.map((c) => c.name)).toEqual(['any', '120-star']);
    });

    it('drops a category the pane just unfeatured, before any reload', () => {
        const out = previewCategories(snapshot(), [
            row({ id: 1, isMain: false }),
        ]);
        expect(out).toHaveLength(0);
    });

    it('drops a category the pane just archived, even while still featured', () => {
        // Archived beats Featured everywhere else; the preview must agree or
        // it promises a chip the public band will not render.
        const out = previewCategories(snapshot(), [
            row({ id: 1, isMain: true, active: false }),
        ]);
        expect(out).toHaveLength(0);
    });

    it('carries a group reassignment through, so the band regroups live', () => {
        const out = previewCategories(snapshot(), [row({ id: 1, groupId: 7 })]);
        expect(out[0].groupId).toBe(7);
    });

    it('leaves a snapshot category alone when no row mentions it', () => {
        const out = previewCategories(snapshot(), []);
        expect(out.map((c) => c.id)).toEqual([1]);
    });
});
