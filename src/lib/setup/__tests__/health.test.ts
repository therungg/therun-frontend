import { describe, expect, it } from 'vitest';
import type { BoardCompleteness } from '../completeness';
import { computeBoardHealth, STALE_TRIAGE_MS } from '../health';

const NOW = 1_800_000_000_000;

function completeness(over: Partial<BoardCompleteness>): BoardCompleteness {
    return {
        steps: [],
        firstIncomplete: null,
        doneCount: 8,
        totalCount: 8,
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

    it('grades any completeness blocker at-risk', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                blockers: ['No main category selected'],
                steps: [
                    {
                        step: 'categories',
                        status: 'blocker',
                        summary: 'No main category selected',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('at-risk');
        expect(h.items[0]).toEqual({
            severity: 'blocker',
            label: 'No main category selected',
            pane: 'categories-visibility',
        });
    });

    it('maps rules/standards warnings to their panes', () => {
        const h = computeBoardHealth({
            completeness: completeness({
                warnings: ['2 categories have no rules'],
                steps: [
                    {
                        step: 'rules',
                        status: 'warning',
                        summary: '2 categories have no rules',
                    },
                    {
                        step: 'standards',
                        status: 'warning',
                        summary: 'No video requirement or minimum time',
                    },
                ],
            }),
            attentionCreatedAts: [],
            now: NOW,
        });
        expect(h.grade).toBe('needs-attention');
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: '2 categories have no rules',
            pane: 'rules',
        });
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: 'No video requirement or minimum time',
            pane: 'standards',
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
