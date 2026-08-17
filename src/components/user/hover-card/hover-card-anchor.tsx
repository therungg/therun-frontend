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
import type { UserCardContext } from '../../../../types/user-card.types';
import { CARD_WIDTH, type CardPlacement, placeCard } from './card-position';
import { createHoverIntent } from './hover-intent';
import { UserHoverCard } from './user-hover-card';
import styles from './user-hover-card.module.scss';

interface Props {
    username: string;
    context?: UserCardContext;
    /** Rendered with the hover handlers attached. Always a single element. */
    children: (handlers: AnchorHandlers) => ReactNode;
}

export interface AnchorHandlers {
    ref: (node: HTMLElement | null) => void;
    onPointerEnter: (event: React.PointerEvent) => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
}

/**
 * Owns one card at a time. Nothing is mounted, positioned or fetched until the
 * hover intent fires, so a page with fifty of these carries fifty sets of
 * event handlers and no more.
 */
export function HoverCardAnchor({ username, context, children }: Props) {
    const [placement, setPlacement] = useState<CardPlacement | null>(null);
    const anchorRef = useRef<HTMLElement | null>(null);

    const setOpen = useCallback((open: boolean) => {
        const node = anchorRef.current;
        if (!open || !node) {
            setPlacement(null);
            return;
        }

        setPlacement(
            placeCard(node.getBoundingClientRect(), {
                width: window.innerWidth,
                height: window.innerHeight,
            }),
        );
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
                              left: placement.left,
                              top: placement.top,
                              width: CARD_WIDTH,
                          }}
                          // Already open: only call off the pending close, so
                          // moving onto the card doesn't re-run placement.
                          onPointerEnter={() => intent.cancel()}
                          onPointerLeave={() => intent.leave()}
                      >
                          <UserHoverCard
                              username={username}
                              context={context}
                          />
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}
