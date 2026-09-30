'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';
import {
    autoBackgroundFit,
    type BackgroundFit,
    type BackgroundPosition,
    type BackgroundRepeat,
    type BackgroundScroll,
    backdropLayoutVars,
    backdropScrollLoop,
} from '~src/lib/game-theme';

type Size = { width: number; height: number };

/** The image's natural size once loaded, or null (not needed, or not yet). */
function useImageSize(url: string | null, needed: boolean): Size | null {
    const [measured, setMeasured] = useState<{
        url: string;
        size: Size;
    } | null>(null);

    useEffect(() => {
        if (!needed || !url) return;
        let live = true;
        const img = new Image();
        img.onload = () => {
            if (live)
                setMeasured({
                    url,
                    size: {
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                    },
                });
        };
        // A broken image has nothing to show either way; stop pending.
        img.onerror = () => {
            if (live) setMeasured({ url, size: { width: 0, height: 0 } });
        };
        img.src = url;
        return () => {
            live = false;
        };
    }, [url, needed]);

    return measured?.url === url ? measured.size : null;
}

/** The element's box, tracked only while `needed` (a scrolling cover image). */
function useBoxSize(
    ref: React.RefObject<HTMLDivElement | null>,
    needed: boolean,
): Size | null {
    const [box, setBox] = useState<Size | null>(null);
    useEffect(() => {
        const el = ref.current;
        if (!needed || !el) return;
        const update = () =>
            setBox({ width: el.clientWidth, height: el.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, needed]);
    return needed ? box : null;
}

/**
 * A theme's background layer: a div carrying the art (directly, or through a
 * CSS variable a pseudo-element paints) plus the data attributes and custom
 * properties the stylesheets key on:
 *
 * - data-bg-fit: 'cover' | 'tile' | 'pending'. 'auto' needs the image's
 *   natural size, so it reads 'pending' until measured; the stylesheets keep
 *   the art hidden while pending, so a pattern never flashes stretched.
 * - --bg-x / --bg-y / --bg-repeat: position and repeat, known up front.
 * - data-bg-scroll + --bg-tile-w / --bg-scroll-dur: the pan, set once the
 *   image (and, for a cover image, the box it fills) has been measured, so a
 *   loop is always exactly one image wide and wraps without a jump.
 */
export function FittedBackdrop({
    url,
    fit,
    scroll,
    repeat,
    position,
    className,
    style,
    ...data
}: {
    url: string | null;
    fit: BackgroundFit | undefined;
    scroll?: BackgroundScroll;
    repeat?: BackgroundRepeat;
    position?: BackgroundPosition;
    className: string;
    style: CSSProperties;
    [dataAttr: `data-${string}`]: string | undefined;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const scrolls = !!url && !!scroll && scroll !== 'none';
    const wantsSize = !!url && ((fit ?? 'auto') === 'auto' || scrolls);
    const image = useImageSize(url, wantsSize);

    let resolved: 'cover' | 'tile' | 'pending';
    if (!url) resolved = 'cover';
    else if (fit === 'cover' || fit === 'tile') resolved = fit;
    else if (!image) resolved = 'pending';
    // A broken image measures 0x0; it shows nothing, so don't call it a pattern.
    else if (image.width === 0) resolved = 'cover';
    else resolved = autoBackgroundFit(image.width, image.height);

    const box = useBoxSize(ref, scrolls && resolved === 'cover');
    const loop =
        scrolls && image && resolved !== 'pending'
            ? backdropScrollLoop(
                  scroll,
                  resolved,
                  image,
                  box ?? { width: 0, height: 0 },
              )
            : null;

    return (
        <div
            ref={ref}
            className={className}
            style={
                {
                    ...style,
                    ...backdropLayoutVars({
                        backgroundRepeat: repeat,
                        backgroundPosition: position,
                    }),
                    ...(loop
                        ? {
                              '--bg-tile-w': `${loop.tileWidth}px`,
                              '--bg-scroll-dur': `${loop.seconds}s`,
                          }
                        : {}),
                } as CSSProperties
            }
            data-bg-fit={resolved}
            data-bg-scroll={loop ? scroll : undefined}
            aria-hidden
            {...data}
        />
    );
}
