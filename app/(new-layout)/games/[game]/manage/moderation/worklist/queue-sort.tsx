'use client';

import { useRef, useState } from 'react';
import type { WorklistSort } from '../../../../../../../types/worklist.types';
import gamePageStyles from '../../../game-page.module.scss';
import { PopoverLayer } from '../../../shared/popover-layer';
import { usePopoverFocus } from '../../../shared/use-popover-focus';
import { QUEUE_SORTS } from './queue-params';
import styles from './queue-sort.module.scss';

interface Props {
    value: WorklistSort;
    onChange: (next: WorklistSort) => void;
    /** The menu is open: the queue's own keys stand down. */
    onOpenChange?: (open: boolean) => void;
}

/** The queue's sort control: a control-pill button that opens a menu of
 *  `QUEUE_SORTS`, current pick marked with `aria-checked`. */
export function QueueSort({ value, onChange, onOpenChange }: Props) {
    const [open, setOpenState] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const setOpen = (next: boolean) => {
        setOpenState(next);
        onOpenChange?.(next);
    };
    const close = () => setOpen(false);
    usePopoverFocus({ open, onClose: close, panelRef });

    const current = QUEUE_SORTS.find((s) => s.value === value);

    const pick = (next: WorklistSort) => {
        onChange(next);
        close();
    };

    return (
        <div ref={rootRef}>
            <button
                type="button"
                className={open ? styles.triggerActive : styles.trigger}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                {`Sort: ${current?.label ?? ''}`}
            </button>
            <PopoverLayer
                open={open}
                anchorRef={rootRef}
                onClose={close}
                align="end"
            >
                <div
                    ref={panelRef}
                    className={`${gamePageStyles.popoverPanel} ${styles.menu}`}
                    role="menu"
                    aria-label="Sort"
                >
                    {QUEUE_SORTS.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={s.value === value}
                            className={
                                s.value === value
                                    ? `${styles.item} ${styles.itemActive}`
                                    : styles.item
                            }
                            onClick={() => pick(s.value)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </PopoverLayer>
        </div>
    );
}
