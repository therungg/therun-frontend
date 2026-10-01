'use client';

import {
    type KeyboardEvent,
    type RefObject,
    useEffect,
    useId,
    useRef,
} from 'react';
import {
    type PopoverAlign,
    PopoverLayer,
    type PopoverSide,
} from '../../../shared/popover-layer';
import { usePopoverFocus } from '../../../shared/use-popover-focus';
import styles from './verb-menu.module.scss';

export interface VerbMenuItem {
    key: string;
    label: string;
    /** Second line: what the runner sees, or why the verb is unavailable. */
    line?: string;
    /** The verb's key in the shared keymap, when it has one here. */
    shortcut?: string;
    danger?: boolean;
    /** Still waiting on a read: in place, but not pressable yet. */
    unavailable?: boolean;
    onSelect: () => void;
}

/**
 * The moderator's verb menu, the same on the run view and in the panel.
 * Groups are split by a rule, not titled. Arrow keys, Home and End move
 * through the items; Escape, Tab and focus restore come from
 * `usePopoverFocus`.
 */
export function VerbMenu({
    open,
    anchorRef,
    onClose,
    label,
    groups,
    busy,
    id,
    align = 'end',
    side = 'bottom',
    themed = true,
}: {
    open: boolean;
    anchorRef: RefObject<HTMLElement | null>;
    onClose: () => void;
    label: string;
    groups: VerbMenuItem[][];
    busy: boolean;
    /** For the trigger's `aria-controls`. */
    id?: string;
    align?: PopoverAlign;
    side?: PopoverSide;
    themed?: boolean;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const lineId = useId();
    usePopoverFocus({ open, onClose, panelRef });

    // The layer is hidden until it has been placed, and a hidden element
    // cannot take focus: wait a frame before moving focus in.
    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => {
            panelRef.current
                ?.querySelector<HTMLElement>('[role="menuitem"]')
                ?.focus();
        });
        return () => cancelAnimationFrame(frame);
    }, [open]);

    const shown = groups.filter((g) => g.length > 0);

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        // Tab leaves a menu: close it, and focus goes back to the trigger.
        if (e.key === 'Tab') {
            e.preventDefault();
            onClose();
            return;
        }
        const items = Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>(
                '[role="menuitem"]',
            ) ?? [],
        );
        if (items.length === 0) return;
        const at = items.indexOf(document.activeElement as HTMLElement);
        let next: number;
        if (e.key === 'ArrowDown') next = (at + 1) % items.length;
        else if (e.key === 'ArrowUp')
            next = (at - 1 + items.length) % items.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = items.length - 1;
        else return;
        e.preventDefault();
        items[next]?.focus();
    };

    return (
        <PopoverLayer
            open={open}
            anchorRef={anchorRef}
            onClose={onClose}
            align={align}
            side={side}
            themed={themed}
        >
            <div
                ref={panelRef}
                id={id}
                className={styles.menu}
                role="menu"
                aria-label={label}
                aria-busy={busy || undefined}
                onKeyDown={onKeyDown}
            >
                {shown.map((group, gi) => [
                    gi > 0 ? (
                        <div
                            key={`sep-${group[0].key}`}
                            className={styles.sep}
                            role="separator"
                        />
                    ) : null,
                    ...group.map((item) => {
                        const off = busy || item.unavailable;
                        const describedBy = item.line
                            ? `${lineId}-${item.key}`
                            : undefined;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                role="menuitem"
                                className={styles.item}
                                data-danger={item.danger || undefined}
                                aria-disabled={off || undefined}
                                aria-describedby={describedBy}
                                aria-keyshortcuts={item.shortcut}
                                onClick={() => {
                                    if (off) return;
                                    onClose();
                                    item.onSelect();
                                }}
                            >
                                <span className={styles.label}>
                                    {item.label}
                                </span>
                                {item.shortcut ? (
                                    <kbd
                                        className={styles.key}
                                        aria-hidden="true"
                                    >
                                        {item.shortcut}
                                    </kbd>
                                ) : null}
                                {item.line ? (
                                    <span
                                        id={describedBy}
                                        className={styles.line}
                                        aria-hidden="true"
                                    >
                                        {item.line}
                                    </span>
                                ) : null}
                            </button>
                        );
                    }),
                ])}
            </div>
        </PopoverLayer>
    );
}
