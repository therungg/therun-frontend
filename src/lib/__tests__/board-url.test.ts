import { describe, expect, it } from 'vitest';
import {
    buildBoardHref,
    buildBoardQuery,
    buildSubmitHref,
    rankToPage,
} from '../board-url';

describe('buildBoardQuery', () => {
    it('is empty when no category and no subcategory key', () => {
        expect(buildBoardQuery({}).toString()).toBe('');
    });

    it('sets only category when there is no subcategory key', () => {
        expect(buildBoardQuery({ categorySlug: 'any%' }).toString()).toBe(
            'category=any%25',
        );
    });

    it('sets subcategory params without a category', () => {
        expect(
            buildBoardQuery({ subcategoryKey: 'platform=pc' }).toString(),
        ).toBe('platform=pc');
    });

    it('sets category plus every subcategory pair', () => {
        expect(
            buildBoardQuery({
                categorySlug: 'any%',
                subcategoryKey: 'platform=pc|region=ntsc',
            }).toString(),
        ).toBe('category=any%25&platform=pc&region=ntsc');
    });

    it('ignores a blank subcategory key', () => {
        expect(
            buildBoardQuery({
                categorySlug: 'any%',
                subcategoryKey: '',
            }).toString(),
        ).toBe('category=any%25');
    });

    it('omits page when page is 1 (the board default)', () => {
        expect(
            buildBoardQuery({ categorySlug: 'any%', page: 1 }).toString(),
        ).toBe('category=any%25');
    });

    it('omits page when page is absent', () => {
        expect(buildBoardQuery({ categorySlug: 'any%' }).toString()).toBe(
            'category=any%25',
        );
    });

    it('sets page when page is greater than 1', () => {
        expect(
            buildBoardQuery({ categorySlug: 'any%', page: 3 }).toString(),
        ).toBe('category=any%25&page=3');
    });

    it('sets page alongside subcategory params', () => {
        expect(
            buildBoardQuery({
                subcategoryKey: 'platform=pc',
                page: 2,
            }).toString(),
        ).toBe('platform=pc&page=2');
    });
});

describe('rankToPage', () => {
    it('rank 1 is page 1', () => {
        expect(rankToPage(1)).toBe(1);
    });

    it('the last rank on page 1 (25) is still page 1', () => {
        expect(rankToPage(25)).toBe(1);
    });

    it('the first rank on page 2 (26) is page 2', () => {
        expect(rankToPage(26)).toBe(2);
    });

    it('rank 50 is page 2, rank 51 is page 3', () => {
        expect(rankToPage(50)).toBe(2);
        expect(rankToPage(51)).toBe(3);
    });

    it('respects a custom page size', () => {
        expect(rankToPage(10, 5)).toBe(2);
        expect(rankToPage(11, 5)).toBe(3);
    });

    it('never returns a page below 1, even for a non-positive rank', () => {
        expect(rankToPage(0)).toBe(1);
        expect(rankToPage(-5)).toBe(1);
    });
});

describe('buildBoardHref', () => {
    it('is the bare game path with no context', () => {
        expect(buildBoardHref('celeste')).toBe('/games-v2/celeste');
    });

    it('appends category and subcategory params', () => {
        expect(
            buildBoardHref('celeste', {
                categorySlug: 'any%',
                subcategoryKey: 'platform=pc',
            }),
        ).toBe('/games-v2/celeste?category=any%25&platform=pc');
    });

    it('appends the page param when past page 1', () => {
        expect(
            buildBoardHref('celeste', {
                categorySlug: 'any%',
                page: 2,
            }),
        ).toBe('/games-v2/celeste?category=any%25&page=2');
    });
});

describe('buildSubmitHref', () => {
    it('is the bare submit path with no context', () => {
        expect(buildSubmitHref('celeste')).toBe('/games-v2/celeste/submit');
    });

    it('carries category and subcategory context into the submit page', () => {
        expect(
            buildSubmitHref('celeste', {
                categorySlug: 'any%',
                subcategoryKey: 'platform=pc',
            }),
        ).toBe('/games-v2/celeste/submit?category=any%25&platform=pc');
    });

    it('adds mode=claim alongside context', () => {
        expect(
            buildSubmitHref('celeste', {
                categorySlug: 'any%',
                subcategoryKey: 'platform=pc',
                mode: 'claim',
            }),
        ).toBe(
            '/games-v2/celeste/submit?category=any%25&platform=pc&mode=claim',
        );
    });

    it('supports mode=claim alone when there is no category/subcategory context', () => {
        expect(buildSubmitHref('celeste', { mode: 'claim' })).toBe(
            '/games-v2/celeste/submit?mode=claim',
        );
    });
});
