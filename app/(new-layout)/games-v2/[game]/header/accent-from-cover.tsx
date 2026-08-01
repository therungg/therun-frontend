'use client';

import { useEffect } from 'react';
import { computeAccent } from './accent-hue';

const SAMPLE_W = 24;
const SAMPLE_H = 32;

interface Props {
    coverUrl: string | null;
    /** The element that receives the `--board-accent(-soft)` custom props. */
    targetRef: React.RefObject<HTMLElement | null>;
}

/**
 * Renders nothing; samples the cover into a tiny canvas and sets the page
 * scope's accent custom properties (BoardAmbience owns the target, so the
 * plate, category chips and table header all inherit them). Every failure
 * path (no cover, load error, CORS-tainted canvas, monochrome art) is a
 * silent no-op — the accentless page is the designed fallback, not an
 * error state.
 */
export function AccentFromCover({ coverUrl, targetRef }: Props) {
    useEffect(() => {
        if (!coverUrl) return;
        const target = targetRef.current;
        if (!target) return;
        let cancelled = false;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.onload = () => {
            if (cancelled) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = SAMPLE_W;
                canvas.height = SAMPLE_H;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(img, 0, 0, SAMPLE_W, SAMPLE_H);
                const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
                const accent = computeAccent(data);
                if (!accent) return;
                target.style.setProperty(
                    '--board-accent',
                    `hsl(${accent.h} ${accent.s}% 45%)`,
                );
                target.style.setProperty(
                    '--board-accent-soft',
                    `hsl(${accent.h} ${accent.s}% 45% / 0.09)`,
                );
            } catch {
                // Tainted canvas (no CORS on the image host) — keep the
                // accentless look.
            }
        };
        img.src = coverUrl;

        return () => {
            cancelled = true;
            // Deliberately not removing already-applied props on unmount:
            // the plate and this component unmount together.
        };
    }, [coverUrl, targetRef]);

    return null;
}
