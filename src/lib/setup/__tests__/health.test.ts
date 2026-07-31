import { describe, expect, it } from 'vitest';
import type { BoardCompleteness } from '../completeness';
import { computeBoardHealth } from '../health';

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

describe('computeBoardHealth', () => {
    it('grades a clean board healthy with a confirmation line', () => {
        const h = computeBoardHealth({
            completeness: completeness({}),
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
        });
        expect(h.items).toContainEqual({
            severity: 'warning',
            label: 'Slug missing',
            pane: 'game-details',
        });
    });
});
