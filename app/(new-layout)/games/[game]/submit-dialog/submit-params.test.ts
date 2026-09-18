import { describe, expect, it } from 'vitest';
import { parseSubmitParams } from './submit-params';

const sp = (qs: string) => new URLSearchParams(qs);

describe('parseSubmitParams', () => {
    it('is closed with no submit param', () => {
        expect(parseSubmitParams(sp('category=any')).open).toBe(false);
    });

    it('opens on submit=1', () => {
        expect(parseSubmitParams(sp('submit=1')).open).toBe(true);
    });

    it('does not open on any other submit value', () => {
        expect(parseSubmitParams(sp('submit=0')).open).toBe(false);
        expect(parseSubmitParams(sp('submit=true')).open).toBe(false);
    });

    it('carries the category slug', () => {
        expect(
            parseSubmitParams(sp('category=16-star&submit=1')).categorySlug,
        ).toBe('16-star');
    });

    it('has no category slug when the board URL carries none', () => {
        // The overview's hero links this way — no category chosen yet.
        expect(parseSubmitParams(sp('submit=1')).categorySlug).toBeNull();
    });

    it('reads subcategory values off the remaining params', () => {
        expect(
            parseSubmitParams(
                sp('category=16-star&platform=vc&region=jp&submit=1'),
            ).subcategoryValues,
        ).toEqual({ platform: 'vc', region: 'jp' });
    });

    it('excludes the board’s own params from the subcategory values', () => {
        expect(
            parseSubmitParams(
                sp(
                    'category=any&page=3&pageSize=25&view=moderation&verified=true&combined=1&submit=1&platform=n64',
                ),
            ).subcategoryValues,
        ).toEqual({ platform: 'n64' });
    });

    it('drops empty values rather than passing blanks through', () => {
        expect(
            parseSubmitParams(sp('submit=1&platform=')).subcategoryValues,
        ).toEqual({});
    });
});
