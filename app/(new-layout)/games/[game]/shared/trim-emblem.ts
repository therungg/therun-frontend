/**
 * Category art is drawn at 17 to 36px, so a wide transparent margin in the
 * file is most of the box: a 128px emblem whose art fills 64% of it shows as
 * an 11px mark in the rail. The margin is cropped away before upload and the
 * art put back on a square, so an emblem fills its slot however it was
 * exported.
 *
 * Only transparency is trimmed. An opaque plate is part of the picture, and
 * guessing at a background colour would eat into art that touches it.
 */

/** Alpha at or below this is margin: anti-aliasing haze, not art. */
const ALPHA_FLOOR = 16;
/** Largest side kept. The biggest slot is 36px, so this covers 3x screens. */
const MAX_SIDE = 256;

function loadImage(file: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Image could not be read.'));
        };
        img.src = url;
    });
}

/**
 * The file with its transparent margin removed, or the file itself when there
 * is nothing to trim or the browser cannot do it. Never throws: a failed trim
 * must not fail an upload that would have worked.
 */
export async function trimEmblem(file: File): Promise<Blob> {
    try {
        const img = await loadImage(file);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) return file;

        const src = document.createElement('canvas');
        src.width = w;
        src.height = h;
        const sctx = src.getContext('2d', { willReadFrequently: true });
        if (!sctx) return file;
        sctx.drawImage(img, 0, 0);
        const { data } = sctx.getImageData(0, 0, w, h);

        let left = w;
        let top = h;
        let right = -1;
        let bottom = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] <= ALPHA_FLOOR) continue;
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
        // Fully transparent, or art that already reaches every edge.
        if (right < 0) return file;
        const cw = right - left + 1;
        const ch = bottom - top + 1;
        if (cw === w && ch === h && w === h && w <= MAX_SIDE) return file;

        const scale = Math.min(1, MAX_SIDE / Math.max(cw, ch));
        const dw = Math.max(1, Math.round(cw * scale));
        const dh = Math.max(1, Math.round(ch * scale));
        const side = Math.max(dw, dh);

        const out = document.createElement('canvas');
        out.width = side;
        out.height = side;
        const octx = out.getContext('2d');
        if (!octx) return file;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(
            img,
            left,
            top,
            cw,
            ch,
            Math.round((side - dw) / 2),
            Math.round((side - dh) / 2),
            dw,
            dh,
        );

        const blob = await new Promise<Blob | null>((resolve) =>
            out.toBlob(resolve, 'image/png'),
        );
        return blob ?? file;
    } catch {
        return file;
    }
}
