export interface Accent {
    /** Dominant hue in degrees [0, 360). */
    h: number;
    /** Saturation %, clamped to [35, 70] so no cover goes neon or muddy. */
    s: number;
}

const BUCKET_DEG = 30;
const MIN_SATURATION = 0.2; // below this a pixel reads as grey
const MIN_LIGHTNESS = 0.12; // near-black carries no usable hue
const MAX_LIGHTNESS = 0.92; // near-white likewise
const MIN_QUALIFYING_RATIO = 0.08;

/**
 * Dominant-hue extraction for the board's cover-art accent. Input is a
 * canvas `ImageData.data` array (RGBA). Returns null when the cover is
 * effectively monochrome — callers fall back to the accentless look, which
 * must remain identical to the pre-accent design.
 */
export function computeAccent(data: Uint8ClampedArray): Accent | null {
    const buckets = new Map<number, { count: number; sats: number[] }>();
    const totalPixels = Math.floor(data.length / 4);
    if (totalPixels === 0) return null;

    let qualifying = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255;
        const g = data[i + 1] / 255;
        const b = data[i + 2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;
        const delta = max - min;
        if (delta === 0) continue;
        const s = delta / (1 - Math.abs(2 * l - 1));
        if (s < MIN_SATURATION) continue;

        let h: number;
        if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / delta + 2) * 60;
        else h = ((r - g) / delta + 4) * 60;

        qualifying++;
        const bucket = Math.floor(h / BUCKET_DEG) * BUCKET_DEG;
        const entry = buckets.get(bucket) ?? { count: 0, sats: [] };
        entry.count++;
        entry.sats.push(s);
        buckets.set(bucket, entry);
    }

    if (qualifying / totalPixels < MIN_QUALIFYING_RATIO) return null;

    let bestBucket = -1;
    let bestCount = 0;
    for (const [bucket, { count }] of buckets) {
        if (count > bestCount) {
            bestCount = count;
            bestBucket = bucket;
        }
    }
    if (bestBucket < 0) return null;

    const sats = buckets.get(bestBucket)!.sats.sort((a, b) => a - b);
    const medianS = sats[Math.floor(sats.length / 2)] * 100;
    return {
        h: bestBucket + BUCKET_DEG / 2,
        s: Math.min(70, Math.max(35, Math.round(medianS))),
    };
}
