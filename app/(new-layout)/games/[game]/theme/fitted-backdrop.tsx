'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { autoBackgroundFit, type BackgroundFit } from '~src/lib/game-theme';

/**
 * The fit a background is drawn with, as a data-bg-fit value the stylesheets
 * key on. 'auto' needs the image's natural size, so it reads 'pending' until
 * the image has loaded and been measured; the stylesheets keep the art hidden
 * while pending, so a pattern never flashes stretched before it tiles.
 */
function useResolvedFit(
    url: string | null,
    fit: BackgroundFit | undefined,
): 'cover' | 'tile' | 'pending' {
    const [measured, setMeasured] = useState<{
        url: string;
        fit: 'cover' | 'tile';
    } | null>(null);
    const wantsProbe = !!url && (fit ?? 'auto') === 'auto';

    useEffect(() => {
        if (!wantsProbe || !url) return;
        let live = true;
        const img = new Image();
        img.onload = () => {
            if (live)
                setMeasured({
                    url,
                    fit: autoBackgroundFit(img.naturalWidth, img.naturalHeight),
                });
        };
        // A broken image has nothing to show either way; stop pending.
        img.onerror = () => {
            if (live) setMeasured({ url, fit: 'cover' });
        };
        img.src = url;
        return () => {
            live = false;
        };
    }, [url, wantsProbe]);

    if (!url) return 'cover';
    if (fit === 'cover' || fit === 'tile') return fit;
    return measured?.url === url ? measured.fit : 'pending';
}

/**
 * A theme's background layer: a div carrying the art (directly, or through a
 * CSS variable a pseudo-element paints) plus data-bg-fit for the stylesheet.
 */
export function FittedBackdrop({
    url,
    fit,
    className,
    style,
    ...data
}: {
    url: string | null;
    fit: BackgroundFit | undefined;
    className: string;
    style: CSSProperties;
    [dataAttr: `data-${string}`]: string | undefined;
}) {
    const resolved = useResolvedFit(url, fit);
    return (
        <div
            className={className}
            style={style}
            data-bg-fit={resolved}
            aria-hidden
            {...data}
        />
    );
}
