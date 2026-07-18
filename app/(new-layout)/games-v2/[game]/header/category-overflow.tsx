'use client';

import { useEffect, useRef, useState } from 'react';
import type { ResolvedCategory } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { usePopoverFocus } from '../shared/use-popover-focus';

interface Props {
    categories: ResolvedCategory[];
    onSelect: (name: string) => void;
}

/**
 * Quiet trailing pill revealing non-featured active categories the band
 * doesn't render directly (see `computeCategoryVisibility`'s `overflow`).
 * Selecting one navigates exactly like a featured pill click (through the
 * shared `useBoardNav`, which self-guards re-clicks while pending — see
 * category-pills.tsx); the panel itself follows the same focus-management
 * pattern as `FiltersPopover`.
 */
export function CategoryOverflow({ categories, onSelect }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const close = () => setOpen(false);

    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    if (categories.length === 0) return null;

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={styles.pill}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                More…
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={styles.popoverPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="More categories"
                >
                    <div className="d-flex flex-column gap-1">
                        {categories.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                    onSelect(c.name);
                                    close();
                                }}
                                className={styles.pill}
                            >
                                {c.display}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
