import { describe, expect, it } from 'vitest';
import { computeAccent } from './accent-hue';

/** Builds an RGBA pixel array from repeated [r, g, b] triples. */
function pixels(...rgb: [number, number, number][]): Uint8ClampedArray {
    const out = new Uint8ClampedArray(rgb.length * 4);
    rgb.forEach(([r, g, b], i) => {
        out[i * 4] = r;
        out[i * 4 + 1] = g;
        out[i * 4 + 2] = b;
        out[i * 4 + 3] = 255;
    });
    return out;
}

const RED: [number, number, number] = [200, 40, 40];
const BLUE: [number, number, number] = [40, 60, 200];
const GREY: [number, number, number] = [128, 128, 128];
const WHITE: [number, number, number] = [250, 250, 250];
const BLACK: [number, number, number] = [5, 5, 5];

describe('computeAccent', () => {
    it('finds the hue of a saturated single-color image', () => {
        const accent = computeAccent(pixels(...Array(20).fill(RED)));
        expect(accent).not.toBeNull();
        // 200/40/40 is hue 0 ± the 30° bucket width
        expect(accent!.h).toBeGreaterThanOrEqual(0);
        expect(accent!.h).toBeLessThan(30);
    });

    it('returns null for a monochrome image', () => {
        expect(computeAccent(pixels(...Array(10).fill(GREY)))).toBeNull();
        expect(
            computeAccent(
                pixels(...Array(5).fill(WHITE), ...Array(5).fill(BLACK)),
            ),
        ).toBeNull();
    });

    it('picks the dominant hue bucket in a mixed image', () => {
        const accent = computeAccent(
            pixels(...Array(15).fill(BLUE), ...Array(5).fill(RED)),
        );
        expect(accent).not.toBeNull();
        // 40/60/200 → hue ≈ 232
        expect(accent!.h).toBeGreaterThan(200);
        expect(accent!.h).toBeLessThan(260);
    });

    it('ignores near-white and near-black pixels when a color exists', () => {
        const accent = computeAccent(
            pixels(
                ...Array(10).fill(WHITE),
                ...Array(10).fill(BLACK),
                ...Array(4).fill(RED),
            ),
        );
        expect(accent).not.toBeNull();
        expect(accent!.h).toBeLessThan(30);
    });

    it('clamps saturation into the tasteful band', () => {
        const neon: [number, number, number] = [255, 0, 0]; // s = 100
        const accent = computeAccent(pixels(...Array(10).fill(neon)));
        expect(accent).not.toBeNull();
        expect(accent!.s).toBeGreaterThanOrEqual(35);
        expect(accent!.s).toBeLessThanOrEqual(70);
    });

    it('returns null when qualifying pixels are under the 8% floor', () => {
        // 1 saturated pixel among 19 grey = 5%
        expect(computeAccent(pixels(...Array(19).fill(GREY), RED))).toBeNull();
    });
});
