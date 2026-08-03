import { describe, expect, it } from 'vitest';
import { buildBoardHref, buildCurationHref } from '../board-url';

describe('buildCurationHref', () => {
    it('carries the same category + subcategory params as the public board URL, plus pane=boards', () => {
        expect(
            buildCurationHref('sm64', {
                categorySlug: '120-star',
                subcategoryKey: 'platform=n64',
            }),
        ).toBe(
            '/games-v2/sm64/manage?category=120-star&platform=n64&pane=boards',
        );
    });

    it('is the mod-side twin of buildBoardHref — identical board params', () => {
        const ctx = {
            categorySlug: '16-star',
            subcategoryKey: 'platform=vc|region=jp',
        };
        const board = new URL(buildBoardHref('sm64', ctx), 'https://x.test');
        const curation = new URL(
            buildCurationHref('sm64', ctx),
            'https://x.test',
        );
        for (const [name, value] of board.searchParams) {
            expect(curation.searchParams.get(name)).toBe(value);
        }
        expect(curation.searchParams.get('pane')).toBe('boards');
    });

    it('a variable literally named pane cannot clobber the pane param', () => {
        expect(
            buildCurationHref('sm64', {
                categorySlug: 'any',
                subcategoryKey: 'pane=weird',
            }),
        ).toBe('/games-v2/sm64/manage?category=any&pane=boards');
    });

    it('bare context still lands on the Boards pane', () => {
        expect(buildCurationHref('sm64')).toBe(
            '/games-v2/sm64/manage?pane=boards',
        );
    });
});
