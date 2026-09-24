'use client';

import {
    type ReactNode,
    type RefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './popover-layer.module.scss';
import { usePortalTheme } from './portal-theme';

/** Which edge of the trigger the panel's near edge lines up with. */
export type PopoverAlign = 'start' | 'end';
/** Preferred side of the trigger; flipped when the panel doesn't fit there. */
export type PopoverSide = 'top' | 'bottom';

export interface PopoverPlacement {
    left: number;
    top: number;
    maxHeight: number;
}

interface Rect {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

interface Size {
    width: number;
    height: number;
}

/** Keep the panel at least this far inside the viewport edges. */
const EDGE = 8;

/**
 * Pure placement math: where a panel of `panel` size goes when anchored to
 * `anchor` (both in viewport coordinates). Prefers the requested side, flips
 * to the other when the panel doesn't fit, and clamps into the viewport so a
 * panel wider or taller than the room available is still fully reachable.
 */
export function placePopover(
    anchor: Rect,
    panel: Size,
    viewport: Size,
    options: { align: PopoverAlign; side: PopoverSide; gap: number },
): PopoverPlacement {
    const { align, side, gap } = options;
    const clamp = (value: number, limit: number) =>
        Math.max(EDGE, Math.min(value, Math.max(EDGE, limit)));

    const left = clamp(
        align === 'end' ? anchor.right - panel.width : anchor.left,
        viewport.width - panel.width - EDGE,
    );

    const below = anchor.bottom + gap;
    const above = anchor.top - gap - panel.height;
    const fitsBelow = below + panel.height + EDGE <= viewport.height;
    const fitsAbove = above >= EDGE;
    const useAbove =
        side === 'top' ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    return {
        left,
        top: clamp(
            useAbove ? above : below,
            viewport.height - panel.height - EDGE,
        ),
        // A panel taller than the viewport scrolls inside itself rather than
        // running off the screen; panels that can't get that tall ignore it.
        maxHeight: Math.max(viewport.height - 2 * EDGE, 0),
    };
}

interface PopoverLayerProps {
    open: boolean;
    /**
     * The trigger the panel is positioned against — the button itself, or the
     * wrapper holding it. Also counts as "inside" for outside-click closing.
     */
    anchorRef: RefObject<HTMLElement | null>;
    /** Called on a pointer-down outside both the trigger and the panel. */
    onClose: () => void;
    align?: PopoverAlign;
    side?: PopoverSide;
    /** Distance between trigger edge and panel edge, in px. */
    gap?: number;
    /**
     * Paint the panel in the page's game theme. The board's custom properties
     * are scoped to `.main-container`, which the portal sits outside of, so a
     * themed popover has to opt into the theme stylesheet's portal selector.
     * Off for popovers opened from inside something already unthemed, so the
     * menu matches its surroundings instead of out-colouring them.
     */
    themed?: boolean;
    children: ReactNode;
}

/**
 * Renders an anchored popover in a portal on <body> with fixed positioning,
 * so no ancestor's `overflow` can clip it. Owns placement (including
 * reposition on scroll, resize and content growth) and outside-click
 * closing; Escape and focus handling stay with the caller, which already has
 * `usePopoverFocus` for the plain case and needs its own handling where a
 * popover sits inside a dialog that also listens for Escape.
 */
export function PopoverLayer({
    open,
    anchorRef,
    onClose,
    align = 'end',
    side = 'bottom',
    gap = 6,
    themed = false,
    children,
}: PopoverLayerProps) {
    const layerRef = useRef<HTMLDivElement>(null);
    const portalTheme = usePortalTheme(themed);
    const [placement, setPlacement] = useState<PopoverPlacement | null>(null);

    const place = useCallback(() => {
        const anchor = anchorRef.current;
        const layer = layerRef.current;
        if (!anchor || !layer) return;
        const box = layer.getBoundingClientRect();
        const next = placePopover(
            anchor.getBoundingClientRect(),
            { width: box.width, height: box.height },
            { width: window.innerWidth, height: window.innerHeight },
            { align, side, gap },
        );
        // Placement is measured from the laid-out layer, so committing an
        // identical result has to be a no-op or the resize observer below
        // would loop.
        setPlacement((prev) =>
            prev &&
            prev.left === next.left &&
            prev.top === next.top &&
            prev.maxHeight === next.maxHeight
                ? prev
                : next,
        );
    }, [anchorRef, align, side, gap]);

    // Measure and place as soon as the panel is in the DOM; until then it is
    // laid out but `visibility: hidden`, so it is never seen at 0,0.
    useEffect(() => {
        if (!open) {
            setPlacement(null);
            return;
        }
        place();
    }, [open, place]);

    useEffect(() => {
        if (!open) return;
        const reposition = () => place();
        // Capture phase: the scroller that moved the trigger is usually an
        // ancestor panel, not the window.
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        // The panel's own content can grow (a note appears, a list loads) and
        // the trigger can move without a scroll (a row above it expands).
        const observer = new ResizeObserver(reposition);
        if (layerRef.current) observer.observe(layerRef.current);
        if (anchorRef.current) observer.observe(anchorRef.current);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
            observer.disconnect();
        };
    }, [open, place, anchorRef]);

    // The panel is no longer a descendant of the trigger, so "outside" has to
    // mean outside both of them.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (anchorRef.current?.contains(target)) return;
            if (layerRef.current?.contains(target)) return;
            onClose();
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open, onClose, anchorRef]);

    // There is no portal target during SSR. These popovers all start closed
    // and only open from a click, so the server and the first client render
    // agree on `null` and nothing can mismatch.
    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            ref={layerRef}
            className={`${styles.layer}${portalTheme.className}`}
            {...portalTheme.attrs}
            style={
                {
                    left: placement?.left ?? 0,
                    top: placement?.top ?? 0,
                    // Measured, not placed yet: laid out so it can be measured,
                    // but not shown in the wrong spot for a frame.
                    visibility: placement ? undefined : 'hidden',
                    '--popover-max-height': placement
                        ? `${placement.maxHeight}px`
                        : undefined,
                } as React.CSSProperties
            }
        >
            {children}
        </div>,
        document.body,
    );
}
