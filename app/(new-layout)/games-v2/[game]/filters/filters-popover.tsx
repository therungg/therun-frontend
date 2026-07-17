'use client';

import { useEffect, useRef, useState } from 'react';
import { Sliders } from 'react-bootstrap-icons';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { usePopoverFocus } from '../shared/use-popover-focus';
import { VariablePills } from './variable-pills';

interface Props {
    defs: VariableDef[];
    selectedVarFilters: Record<string, string>;
}

export function FiltersPopover({ defs, selectedVarFilters }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const filterDefs = defs.filter((d) => d.role === 'filter');
    // Variable filters only — the verified toggle lives in the band now and
    // isn't part of this popover or its count.
    const count = Object.keys(selectedVarFilters).length;

    const close = () => setOpen(false);

    usePopoverFocus({ open, onClose: close, panelRef });

    // Outside-click closes too; Escape and Tab-trap come from usePopoverFocus.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) close();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    if (filterDefs.length === 0) return null;

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={`${styles.pill} ${count > 0 ? styles.pillActive : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                <Sliders size={13} aria-hidden />
                Filters
                {count > 0 && (
                    <span className={styles.filterCount}>{count}</span>
                )}
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={styles.popoverPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filters"
                >
                    <VariablePills
                        defs={filterDefs}
                        selected={selectedVarFilters}
                    />
                </div>
            )}
        </div>
    );
}
