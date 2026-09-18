import { describe, expect, it } from 'vitest';
import { shouldInterceptSubmitClick } from './intercept-click';

const click = (
    over: Partial<Parameters<typeof shouldInterceptSubmitClick>[0]> = {},
) => ({
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    ...over,
});

describe('shouldInterceptSubmitClick', () => {
    it('intercepts a plain left click — that is the instant-open case', () => {
        expect(shouldInterceptSubmitClick(click())).toBe(true);
    });

    it('lets a middle click through so it opens a new tab', () => {
        expect(shouldInterceptSubmitClick(click({ button: 1 }))).toBe(false);
    });

    it('lets cmd/ctrl click through so it opens a new tab', () => {
        expect(shouldInterceptSubmitClick(click({ metaKey: true }))).toBe(
            false,
        );
        expect(shouldInterceptSubmitClick(click({ ctrlKey: true }))).toBe(
            false,
        );
    });

    it('lets shift click through so it opens a new window', () => {
        expect(shouldInterceptSubmitClick(click({ shiftKey: true }))).toBe(
            false,
        );
    });

    it('lets alt click through so it downloads', () => {
        expect(shouldInterceptSubmitClick(click({ altKey: true }))).toBe(false);
    });

    it('does nothing to an already-handled event', () => {
        expect(
            shouldInterceptSubmitClick(click({ defaultPrevented: true })),
        ).toBe(false);
    });
});
