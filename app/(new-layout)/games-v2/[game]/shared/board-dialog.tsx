'use client';

import {
    type ReactNode,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './board-dialog.module.scss';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(el: HTMLElement) {
    return el.offsetParent !== null;
}

/**
 * Pure focus-order helper for the Tab trap: given the panel's focusable
 * elements (in DOM order), which one currently has focus, and whether Shift
 * is held, returns the element to redirect to — or `null` when the browser's
 * default Tab movement already stays inside the panel and needs no help.
 */
export function nextTrapFocusTarget<T>(
    focusable: readonly T[],
    active: T | null,
    shiftKey: boolean,
): T | null {
    if (focusable.length === 0) return null;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (active === null || !focusable.includes(active)) return first;
    if (shiftKey && active === first) return last;
    if (!shiftKey && active === last) return first;
    return null;
}

interface UseDialogBehaviorOptions {
    open: boolean;
    onClose: () => void;
    panelRef: RefObject<HTMLElement | null>;
    initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Focus trap + autofocus + focus-restore + Escape-to-close + background
 * scroll lock for an overlay panel. Presentation-agnostic — used by
 * `BoardDialog` for its centered chrome, and directly by overlays with a
 * different presentation (e.g. a slide-in drawer) that still need the same
 * accessibility behavior.
 */
export function useDialogBehavior({
    open,
    onClose,
    panelRef,
    initialFocusRef,
}: UseDialogBehaviorOptions) {
    // Lock background scroll and remember the trigger element for the
    // duration the dialog is open; restore focus to it on close.
    useEffect(() => {
        if (!open) return;
        const triggerEl = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
            triggerEl?.focus?.();
        };
    }, [open]);

    // Move focus into the dialog on open — the requested element, or the
    // first focusable descendant of the panel.
    useEffect(() => {
        if (!open) return;
        const target =
            initialFocusRef?.current ??
            panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        target?.focus();
    }, [open, initialFocusRef, panelRef]);

    // Escape closes no matter where focus sits; Tab/Shift-Tab is trapped
    // inside the panel. Attached to `document` (capture phase) rather than
    // the panel itself so it fires even if focus somehow lands outside it.
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }
            if (e.key !== 'Tab') return;
            const panel = panelRef.current;
            if (!panel) return;
            const focusable = Array.from(
                panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
            ).filter(isVisible);
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }
            const target = nextTrapFocusTarget(
                focusable,
                document.activeElement as HTMLElement | null,
                e.shiftKey,
            );
            if (target) {
                e.preventDefault();
                target.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open, onClose, panelRef]);
}

export type BoardDialogSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<BoardDialogSize, string> = {
    sm: 'modal-sm',
    md: '',
    lg: 'modal-lg',
};

interface BoardDialogProps {
    open: boolean;
    onClose: () => void;
    /** Id of a heading rendered inside `children` (preferred). */
    labelledBy?: string;
    /** Accessible name fallback when the dialog doesn't render its own labelled heading. */
    title?: string;
    size?: BoardDialogSize;
    /** Element to focus on open; falls back to the first focusable descendant. */
    initialFocusRef?: RefObject<HTMLElement | null>;
    /** Set false to disable backdrop-click-to-close for destructive flows. */
    closeOnBackdropClick?: boolean;
    children: ReactNode;
}

/**
 * Shared board dialog primitive — overlay + panel chrome extracted from the
 * moderation `RunActionDialog`, with real focus management: trap, autofocus,
 * restore-on-close, Escape-to-close, and background scroll lock.
 */
export function BoardDialog({
    open,
    onClose,
    labelledBy,
    title,
    size = 'lg',
    initialFocusRef,
    closeOnBackdropClick = true,
    children,
}: BoardDialogProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    // Portal target isn't available during SSR; mount client-side only. This
    // also keeps the dialog out of any opacity-0 `.reveal` subtree it may be
    // composed inside, which would otherwise render an open dialog invisible.
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    useDialogBehavior({
        open: open && mounted,
        onClose,
        panelRef,
        initialFocusRef,
    });

    if (!open || !mounted) return null;

    return createPortal(
        <div
            className={`modal d-block ${styles.backdrop}`}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : title}
            onMouseDown={(e) => {
                if (closeOnBackdropClick && e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className={[
                    'modal-dialog',
                    SIZE_CLASS[size],
                    'modal-dialog-scrollable',
                ]
                    .filter(Boolean)
                    .join(' ')}
                role="document"
            >
                <div
                    ref={panelRef}
                    className={`modal-content ${styles.content}`}
                >
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    );
}
