import { describe, expect, it } from 'vitest';
import type { ManageCategoryRow, ManageGroup } from '~src/lib/category-mgmt';
import type { AttentionItem } from '../moderation/attention/attention-model';
import { buildOverviewStats, timeAgo, topFeaturedRows } from './overview-model';

function row(p: Partial<ManageCategoryRow>): ManageCategoryRow {
    return {
        id: 1,
        display: 'Any%',
        groupId: null,
        groupName: null,
        sortOrder: 0,
        isMain: true,
        active: true,
        totalRunTime: 0,
        totalFinishedAttemptCount: 0,
        uniqueRunners: 0,
        ...p,
    } as ManageCategoryRow;
}

function group(id: number, kind: 'normal' | 'level'): ManageGroup {
    return {
        id,
        name: `Group ${id}`,
        sortOrder: 0,
        hiddenByDefault: false,
        displayMode: null,
        kind,
        rules: null,
    };
}

function item(...sources: AttentionItem['sources']): AttentionItem {
    return {
        key: sources.join('-'),
        sources,
        severity: 'low',
        categoryId: 1,
        categoryName: 'Any%',
        subcategoryKey: '',
    } as AttentionItem;
}

describe('buildOverviewStats', () => {
    it('counts full-game categories apart from levels and sums all runs', () => {
        // group 20 is a level, so a row in it is a level board — excluded from
        // the full-game category counts but still summed into finished runs.
        const rows = [
            row({
                id: 1,
                isMain: true,
                active: true,
                totalFinishedAttemptCount: 100,
            }),
            row({
                id: 2,
                isMain: true,
                active: true,
                totalFinishedAttemptCount: 50,
            }),
            row({
                id: 3,
                isMain: false,
                active: true,
                totalFinishedAttemptCount: 10,
            }),
            row({
                id: 4,
                isMain: false,
                active: true,
                totalFinishedAttemptCount: 0,
            }),
            row({
                id: 5,
                isMain: true,
                active: false,
                totalFinishedAttemptCount: 5,
            }),
            row({
                id: 6,
                isMain: true,
                active: true,
                totalFinishedAttemptCount: 40,
                groupId: 20,
            }),
        ];
        const stats = buildOverviewStats({
            rows,
            groups: [group(10, 'normal'), group(20, 'level')],
            attentionItems: [],
            moderatorCount: 3,
            pendingApplications: 2,
        });
        expect(stats.featured).toBe(2); // ids 1, 2 (id 6 is a level board)
        expect(stats.offBoardWithRuns).toBe(1); // id 3 (id 4 has no runs)
        expect(stats.archived).toBe(1); // id 5
        expect(stats.levels).toBe(1); // group 20
        expect(stats.categoryGroups).toBe(1); // group 10
        expect(stats.finishedRuns).toBe(205); // includes level board id 6
        expect(stats.moderatorCount).toBe(3);
        expect(stats.pendingApplications).toBe(2);
    });

    it('buckets attention by source, grouping appeals with claims', () => {
        const stats = buildOverviewStats({
            rows: [],
            groups: [],
            attentionItems: [
                item('flag'),
                item('flag'),
                item('report'),
                item('self_claim'),
                item('appeal'),
            ],
            moderatorCount: 0,
            pendingApplications: 0,
        });
        expect(stats.attention).toEqual({
            total: 5,
            flags: 2,
            reports: 1,
            claims: 2,
        });
    });
});

describe('topFeaturedRows', () => {
    it('ranks featured-active rows by finished runs and reports overflow', () => {
        const rows = [
            row({
                id: 1,
                isMain: true,
                active: true,
                totalFinishedAttemptCount: 10,
            }),
            row({
                id: 2,
                isMain: true,
                active: true,
                totalFinishedAttemptCount: 30,
            }),
            row({
                id: 3,
                isMain: true,
                active: true,
                totalFinishedAttemptCount: 20,
            }),
            row({
                id: 4,
                isMain: false,
                active: true,
                totalFinishedAttemptCount: 99,
            }),
            row({
                id: 5,
                isMain: true,
                active: false,
                totalFinishedAttemptCount: 99,
            }),
        ];
        const { shown, remaining } = topFeaturedRows(rows, 2);
        expect(shown.map((r) => r.id)).toEqual([2, 3]);
        expect(remaining).toBe(1); // id 1 is the third featured-active row
    });
});

describe('timeAgo', () => {
    const now = Date.parse('2026-08-29T12:00:00Z');
    it('formats recent and older timestamps', () => {
        expect(timeAgo('2026-08-29T11:59:30Z', now)).toBe('just now');
        expect(timeAgo('2026-08-29T09:00:00Z', now)).toBe('3h ago');
        expect(timeAgo('2026-08-23T12:00:00Z', now)).toBe('6d ago');
        expect(timeAgo('2026-08-01T12:00:00Z', now)).toBe('4w ago');
    });
    it('returns null for missing or invalid dates', () => {
        expect(timeAgo(null, now)).toBeNull();
        expect(timeAgo(undefined, now)).toBeNull();
        expect(timeAgo('not-a-date', now)).toBeNull();
    });
});
