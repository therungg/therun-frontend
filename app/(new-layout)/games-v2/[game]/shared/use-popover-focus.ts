'use client';

import { type RefObject, useEffect } from 'react';
import { FOCUSABLE_SELECTOR, nextTrapFocusTarget } from './board-dialog';

interface UsePopoverFocusOptions {
    open: boolean;
    onClose: () => void;
    panelRef: RefObject<HTMLElement | null>;
}

/**
 * Focus trap + autofocus + focus-restore + Escape-to-close for an inline
 * popover anchored to its own trigger button (filters, category overflow).
 * Lighter than `useDialogBehavior`: no backdrop, no background scroll lock —
 * this isn't a page-covering modal — but shares its Tab-trap math via the
 * exported `nextTrapFocusTarget`. Outside-click/backdrop closing is left to
 * the caller since these popovers aren't portaled.
 */
export function usePopoverFocus({
    open,
    onClose,
    panelRef,
}: UsePopoverFocusOptions) {
    // Remember the trigger and restore focus to it once the popover closes.
    useEffect(() => {
        if (!open) return;
        const triggerEl = document.activeElement as HTMLElement | null;
        return () => {
            triggerEl?.focus?.();
        };
    }, [open]);

    // Move focus into the panel on open.
    useEffect(() => {
        if (!open) return;
        const target =
            panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        target?.focus();
    }, [open, panelRef]);

    // Escape closes; Tab/Shift-Tab is trapped inside the panel.
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
            );
            if (focusable.length === 0) {
                // Text-only panel: nothing to trap focus in. Treat Tab as
                // "leave" — close the popover (for focus-restore parity with
                // Escape/outside-click) and let Tab proceed naturally from
                // the trigger, instead of swallowing every Tab press on the
                // page until Escape/outside-click.
                onClose();
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
