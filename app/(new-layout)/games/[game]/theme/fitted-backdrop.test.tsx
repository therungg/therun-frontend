// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FittedBackdrop } from './fitted-backdrop';

// jsdom never loads images, so stand in an Image whose load the test fires
// with a chosen natural size.
let loaded: Array<{ fire: (w: number, h: number) => void; fail: () => void }>;

class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    src = '';
    constructor() {
        loaded.push({
            fire: (w, h) => {
                this.naturalWidth = w;
                this.naturalHeight = h;
                this.onload?.();
            },
            fail: () => this.onerror?.(),
        });
    }
}

beforeEach(() => {
    loaded = [];
    vi.stubGlobal('Image', FakeImage);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

const URL_A = 'https://media.therun.gg/backgrounds/1-1.png';

function fitOf(container: HTMLElement) {
    return container.firstElementChild?.getAttribute('data-bg-fit');
}

describe('FittedBackdrop', () => {
    it.each([
        ['cover', 'cover'],
        ['tile', 'tile'],
    ] as const)(
        "uses an explicit '%s' fit without probing",
        (fit, expected) => {
            const { container } = render(
                <FittedBackdrop
                    url={URL_A}
                    fit={fit}
                    className="x"
                    style={{}}
                />,
            );
            expect(fitOf(container)).toBe(expected);
            expect(loaded).toHaveLength(0);
        },
    );

    it('is cover with no image, so the console wash still shows', () => {
        const { container } = render(
            <FittedBackdrop url={null} fit="auto" className="x" style={{}} />,
        );
        expect(fitOf(container)).toBe('cover');
    });

    it.each([
        [900, 375, 'tile'],
        [1920, 1080, 'cover'],
    ])('auto: pending, then %sx%s resolves to %s', (w, h, expected) => {
        const { container } = render(
            <FittedBackdrop
                url={URL_A}
                fit={undefined}
                className="x"
                style={{}}
            />,
        );
        expect(fitOf(container)).toBe('pending');
        act(() => loaded[0].fire(w, h));
        expect(fitOf(container)).toBe(expected);
    });

    it('auto: a broken image stops pending', () => {
        const { container } = render(
            <FittedBackdrop url={URL_A} fit="auto" className="x" style={{}} />,
        );
        act(() => loaded[0].fail());
        expect(fitOf(container)).toBe('cover');
    });

    it('passes data attributes through', () => {
        const { container } = render(
            <FittedBackdrop
                url={URL_A}
                fit="tile"
                className="x"
                style={{}}
                data-board-art={URL_A}
            />,
        );
        expect(
            container.firstElementChild?.getAttribute('data-board-art'),
        ).toBe(URL_A);
    });
});
