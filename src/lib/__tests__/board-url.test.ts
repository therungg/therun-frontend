import { describe, expect, it } from 'vitest';
import {
    buildBoardHref,
    buildCurationHref,
    buildSubmitHref,
} from '../board-url';

describe('buildSubmitHref', () => {
    it('points at the board with submit=1, not a submit route', () => {
        const href = buildSubmitHref('super-mario-64');
        expect(href).not.toContain('/submit');
        expect(href).toBe('/games-v2/super-mario-64?submit=1');
    });

    it('carries the board context so the dialog opens preselected', () => {
        const href = buildSubmitHref('sm64', {
            categorySlug: '16-star',
            subcategoryKey: 'platform=vc|region=jp',
        });
        expect(href).toBe(
            '/games-v2/sm64?category=16-star&platform=vc&region=jp&submit=1',
        );
    });

    it('opens on the same board buildBoardHref would land on', () => {
        const ctx = {
            categorySlug: '120-star',
            subcategoryKey: 'platform=n64',
        };
        const board = new URL(buildBoardHref('sm64', ctx), 'https://x.test');
        const submit = new URL(buildSubmitHref('sm64', ctx), 'https://x.test');
        expect(submit.pathname).toBe(board.pathname);
        for (const [name, value] of board.searchParams) {
            expect(submit.searchParams.get(name)).toBe(value);
        }
        expect(submit.searchParams.get('submit')).toBe('1');
    });

    it('a variable literally named submit cannot clobber the submit param', () => {
        expect(
            buildSubmitHref('sm64', {
                categorySlug: 'any',
                subcategoryKey: 'submit=weird',
            }),
        ).toBe('/games-v2/sm64?category=any&submit=1');
    });
});

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
