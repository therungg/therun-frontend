import { describe, expect, it } from 'vitest';
import type { BoardCompleteness } from '../completeness';
import { computeBoardHealth, STALE_TRIAGE_MS } from '../health';

const NOW = 1_800_000_000_000;

function completeness(over: Partial<BoardCompleteness>): BoardCompleteness {
    return {
        steps: [],
        firstIncomplete: null,
        doneCount: 5,
        totalCount: 5,
        blockers: [],
        warnings: [],
        ...over,
    };
}

function isoAgo(ms: number): string {
    return new Date(NOW - ms).toISOString();
}

describe('computeBoardHealth', () => {
    it('grades a clean board healthy with a confirmation line', () => {
        const h = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('healthy');
        expect(h.items).toEqual([
            { severity: 'info', label: 'All checks pass', pane: null },
        ]);
    });

    it('grades any completeness blocker at-risk and maps categories to the index', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                blockers: [
                    'No categories are marked main (shown on the board)',
                ],
                steps: [
                    {
                        step: 'categories',
                        status: 'blocker',
                        summary:
                            'No categories are marked main (shown on the board)',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('at-risk');
        expect(h.items[0]).toEqual({
            severity: 'blocker',
            label: 'No categories are marked main (shown on the board)',
            pane: 'categories',
        });
    });

    it('sends a category-setup warning to the index, not one arbitrary category', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['1 of 2 main categories missing rules'],
                steps: [
                    {
                        step: 'category-setup',
                        status: 'warning',
                        summary: '1 of 2 main categories missing rules',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('needs-attention');
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: '1 of 2 main categories missing rules',
            pane: 'categories',
        });
    });

    it('maps a groups blocker to the groups pane', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                blockers: ['3 featured categories are not in a group'],
                steps: [
                    {
                        step: 'groups',
                        status: 'blocker',
                        summary: '3 featured categories are not in a group',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.items).toContainEqual({
            severity: 'blocker',
            label: '3 featured categories are not in a group',
            pane: 'groups',
        });
    });

    it('maps a details warning to the game-details pane', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['Slug missing'],
                steps: [
                    {
                        step: 'details',
                        status: 'warning',
                        summary: 'Slug missing',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: 'Slug missing',
            pane: 'game-details',
        });
    });

    it('buckets triage items older than 7 days (info ≤2, warning >2)', () => {
        const two = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [
                isoAgo(STALE_TRIAGE_MS + 1000),
                isoAgo(STALE_TRIAGE_MS + 2000),
                isoAgo(1000), // fresh — not counted
            ],
            now: NOW,
        });
        expect(two.items).toContainEqual({
            severity: 'info',
            label: '2 triage items waiting more than a week',
            pane: 'attention',
        });
        expect(two.grade).toBe('healthy');

        const many = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [
                isoAgo(STALE_TRIAGE_MS + 1000),
                isoAgo(STALE_TRIAGE_MS + 2000),
                isoAgo(STALE_TRIAGE_MS + 3000),
            ],
            now: NOW,
        });
        expect(many.items).toContainEqual({
            severity: 'warning',
            label: '3 triage items waiting more than a week',
            pane: 'attention',
        });
        expect(many.grade).toBe('needs-attention');
    });

    it('uses singular copy for one stale item', () => {
        const h = computeBoardHealth({
            completeness: completeness({}),
            attentionCreatedAts: [isoAgo(STALE_TRIAGE_MS + 1000)],
            now: NOW,
        });
        expect(h.items).toContainEqual({
            severity: 'info',
            label: '1 triage item waiting more than a week',
            pane: 'attention',
        });
    });
});
