'use client';

import { useEffect, useRef, useState } from 'react';
import { Sliders } from 'react-bootstrap-icons';
import type { VariableDef } from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import { VariablePills } from './variable-pills';
import { VerifiedToggle } from './verified-toggle';

interface Props {
    defs: VariableDef[];
    selectedVarFilters: Record<string, string>;
    verified: boolean;
}

export function FiltersPopover({ defs, selectedVarFilters, verified }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const filterDefs = defs.filter((d) => d.role === 'filter');
    const count = Object.keys(selectedVarFilters).length + (verified ? 1 : 0);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={`${styles.pill} ${count > 0 ? styles.pillActive : ''}`}
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
                    className={styles.popoverPanel}
                    role="dialog"
                    aria-label="Filters"
                >
                    {filterDefs.length > 0 && (
                        <VariablePills
                            defs={filterDefs}
                            selected={selectedVarFilters}
                        />
                    )}
                    <VerifiedToggle verified={verified} />
                </div>
            )}
        </div>
    );
}
