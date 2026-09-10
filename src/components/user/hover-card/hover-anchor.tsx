'use client';

import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
    availableHeight,
    type CardPlacement,
    placeCard,
} from './card-position';
import { createHoverIntent } from './hover-intent';
import styles from './user-hover-card.module.scss';

export interface AnchorHandlers {
    ref: (node: HTMLElement | null) => void;
    onPointerEnter: (event: React.PointerEvent) => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
}

export interface HoverAnchorProps {
    /** Rendered with the hover handlers attached. Always a single element. */
    children: (handlers: AnchorHandlers) => ReactNode;
    /** Card content, rendered inside the positioned portal layer. */
    card: ReactNode;
    /** Fixed layer width in px (was CARD_WIDTH). */
    cardWidth: number;
}

/**
 * A game's theme is scoped to `.main-container` (theme-css.ts), but the card
 * is portaled to `document.body`, outside it — so it would always paint in
 * the site's default colors. Custom properties inherit, so the anchor's
 * computed style already holds the theme it sits in; the layer re-declares
 * those values and the card wears the same board as the row it came from.
 */
const BOARD_THEME_VARS = [
    '--board-surface-bg',
    '--board-surface-border',
    '--board-recess-bg',
    '--board-recess-strong-bg',
    '--board-accent',
    '--board-accent-soft',
    '--board-on-accent',
    '--board-ink',
    '--board-ink-emphasis',
    '--board-ink-secondary',
    '--board-ink-tertiary',
    '--bs-primary',
    '--bs-primary-rgb',
] as const;

function readBoardTheme(node: HTMLElement): Record<string, string> {
    const computed = getComputedStyle(node);
    const vars: Record<string, string> = {};
    for (const name of BOARD_THEME_VARS) {
        const value = computed.getPropertyValue(name).trim();
        if (value) vars[name] = value;
    }
    return vars;
}

/**
 * Owns one card at a time. Nothing is mounted, positioned or fetched until the
 * hover intent fires, so a page with fifty of these carries fifty sets of
 * event handlers and no more.
 */
export function HoverAnchor({ children, card, cardWidth }: HoverAnchorProps) {
    const [placement, setPlacement] = useState<
        | (CardPlacement & {
              maxHeight: number;
              themeVars: Record<string, string>;
          })
        | null
    >(null);
    const anchorRef = useRef<HTMLElement | null>(null);

    const setOpen = useCallback((open: boolean) => {
        const node = anchorRef.current;
        if (!open || !node) {
            setPlacement(null);
            return;
        }

        const rect = node.getBoundingClientRect();
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
        const next = placeCard(rect, viewport);

        setPlacement({
            ...next,
            maxHeight: availableHeight(rect, viewport, next.flipped),
            themeVars: readBoardTheme(node),
        });
    }, []);

    const intent = useMemo(() => createHoverIntent(setOpen), [setOpen]);

    useEffect(() => () => intent.cancel(), [intent]);

    // The card is position: fixed against the viewport, so any scroll moves it
    // away from its name. Closing is the honest answer; repositioning on every
    // scroll frame is not worth it for something the pointer already left.
    useEffect(() => {
        if (!placement) return;

        const close = () => intent.closeNow();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') intent.closeNow();
        };

        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [placement, intent]);

    const handlers: AnchorHandlers = {
        ref: (node) => {
            anchorRef.current = node;
        },
        onPointerEnter: (event) => {
            // Touch taps must not open a card the finger is already covering;
            // the link still navigates.
            if (event.pointerType === 'touch') return;
            intent.enter();
        },
        onPointerLeave: () => intent.leave(),
        onFocus: () => intent.openNow(),
        onBlur: () => intent.closeNow(),
    };

    return (
        <>
            {children(handlers)}
            {placement && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          className={styles.layer}
                          style={{
                              ...placement.themeVars,
                              left: placement.left,
                              top: placement.top,
                              bottom: placement.bottom,
                              width: cardWidth,
                              maxHeight: placement.maxHeight,
                          }}
                          // Already open: only call off the pending close, so
                          // moving onto the card doesn't re-run placement.
                          onPointerEnter={() => intent.cancel()}
                          onPointerLeave={() => intent.leave()}
                      >
                          {card}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
