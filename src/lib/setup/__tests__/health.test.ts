import { describe, expect, it } from 'vitest';
import type { BoardCompleteness } from '../completeness';
import { computeBoardHealth, STALE_TRIAGE_MS } from '../health';

const NOW = 1_800_000_000_000;

function completeness(over: Partial<BoardCompleteness>): BoardCompleteness {
    return {
        steps: [],
        firstIncomplete: null,
        doneCount: 6,
        totalCount: 6,
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

    it('grades any completeness blocker at-risk and maps categories to categories-visibility', () => {
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
            pane: 'categories-visibility',
        });
    });

    it('maps a category-config warning to the rules pane', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['1 of 2 main categories not configured'],
                steps: [
                    {
                        step: 'category-config',
                        status: 'warning',
                        summary: '1 of 2 main categories not configured',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('needs-attention');
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: '1 of 2 main categories not configured',
            pane: 'rules',
        });
    });

    it('maps a defaults item to the timing pane', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['Optional bulk settings not reviewed'],
                steps: [
                    {
                        step: 'defaults',
                        status: 'warning',
                        summary: 'Optional bulk settings not reviewed',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: 'Optional bulk settings not reviewed',
            pane: 'timing',
        });
    });

    it('maps a details warning to the game-details pane', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['Slug or abbreviation missing'],
                steps: [
                    {
                        step: 'details',
                        status: 'warning',
                        summary: 'Slug or abbreviation missing',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: 'Slug or abbreviation missing',
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
