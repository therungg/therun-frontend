import { describe, expect, it } from 'vitest';
import { buildBoardHref, buildBoardQuery, buildSubmitHref } from '../board-url';

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
