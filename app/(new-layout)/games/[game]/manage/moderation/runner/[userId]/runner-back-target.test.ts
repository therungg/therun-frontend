import { describe, expect, it } from 'vitest';
import { resolveRunnerBackTarget } from './runner-back-target';

const CATEGORIES = [{ id: 10 }, { id: 20 }, { id: 30 }];

describe('resolveRunnerBackTarget', () => {
    it('returns to All runs with the category restored when from=roster and the id is valid', () => {
        expect(
            resolveRunnerBackTarget('sm64', 'roster', '20', CATEGORIES),
        ).toEqual({
            href: '/games/sm64/manage?pane=all-runs&cat=20',
            label: 'Back to All runs',
        });
    });

    it('drops an invalid categoryId rather than echoing it into the link', () => {
        expect(
            resolveRunnerBackTarget('sm64', 'roster', '999', CATEGORIES),
        ).toEqual({
            href: '/games/sm64/manage?pane=all-runs',
            label: 'Back to All runs',
        });
    });

    it('drops a non-numeric categoryId', () => {
        expect(
            resolveRunnerBackTarget(
                'sm64',
                'roster',
                'not-a-number',
                CATEGORIES,
            ),
        ).toEqual({
            href: '/games/sm64/manage?pane=all-runs',
            label: 'Back to All runs',
        });
    });

    it('returns to All runs with no query when categoryId is absent', () => {
        expect(
            resolveRunnerBackTarget('sm64', 'roster', null, CATEGORIES),
        ).toEqual({
            href: '/games/sm64/manage?pane=all-runs',
            label: 'Back to All runs',
        });
    });

    it('returns to the public leaderboard when from=board', () => {
        expect(
            resolveRunnerBackTarget('sm64', 'board', null, CATEGORIES),
        ).toEqual({
            href: '/games/sm64',
            label: 'Back to leaderboard',
        });
    });

    it('falls back to the console front door for from=boards while the pane is pulled', () => {
        expect(
            resolveRunnerBackTarget('sm64', 'boards', null, CATEGORIES),
        ).toEqual({
            href: '/games/sm64/manage',
            label: 'Back to console',
        });
    });

    it('falls back to the console front door when from is absent', () => {
        expect(resolveRunnerBackTarget('sm64', null, '20', CATEGORIES)).toEqual(
            {
                href: '/games/sm64/manage',
                label: 'Back to console',
            },
        );
    });

    it('falls back to the console for any origin outside the allowlist — from is never reflected verbatim', () => {
        expect(
            resolveRunnerBackTarget(
                'sm64',
                'https://evil.example.com',
                '20',
                CATEGORIES,
            ),
        ).toEqual({
            href: '/games/sm64/manage',
            label: 'Back to console',
        });
    });
});
