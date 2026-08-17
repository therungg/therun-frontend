'use client';

import { useEffect, useRef, useState } from 'react';
import { Sliders } from 'react-bootstrap-icons';
import type {
    BoardFacets,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import mastheadStyles from '../header/masthead.module.scss';
import { usePopoverFocus } from '../shared/use-popover-focus';
import { BUILTIN_PARAM_KEYS, type BuiltinFilterState } from './builtin-params';
import {
    draftCount,
    draftEquals,
    draftFromApplied,
    emptyDraft,
    type FilterDraft,
} from './filter-draft';
import panelStyles from './filters-popover.module.scss';
import { FiltersSheet } from './filters-sheet';
import { useBuiltinFilterNav } from './use-builtin-filter-nav';

interface Props {
    defs: VariableRow[];
    selectedVarFilters: Record<string, string>;
    builtins: BuiltinFilterState;
    facets: BoardFacets;
}

// Always rendered. Opening seeds a local draft from the applied state; Apply
// writes the whole draft to the URL in one navigation (Reset writes an empty
// one). The badge shows what is APPLIED, not what is drafted.
export function FiltersPopover({
    defs,
    selectedVarFilters,
    builtins,
    facets,
}: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const { applyFilters, isPending } = useBuiltinFilterNav();

    // A mod-defined filter named e.g. `video` or `country` would collide with
    // a built-in param of the same name — the built-in always wins the URL
    // key, so a colliding def could never actually be selected.
    const filterDefs = defs.filter(
        (d) =>
            d.role === 'filter' &&
            !(BUILTIN_PARAM_KEYS as readonly string[]).includes(
                d.nameNormalized,
            ),
    );
    const variableKeys = filterDefs.map((d) => d.nameNormalized);
    const applied = draftFromApplied(builtins, selectedVarFilters);
    const [draft, setDraft] = useState<FilterDraft>(applied);
    const count = draftCount(applied);

    const openSheet = () => {
        setDraft(draftFromApplied(builtins, selectedVarFilters));
        setOpen(true);
    };
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

    const onApply = () => {
        applyFilters(draft, variableKeys);
        close();
    };
    const onReset = () => {
        const d = emptyDraft();
        setDraft(d);
        // Nothing applied to clear — writing the empty draft would push the
        // URL it is already on.
        if (draftCount(applied) === 0) {
            close();
            return;
        }
        applyFilters(d, variableKeys);
        close();
    };

    return (
        <div className={styles.popoverRoot} ref={rootRef}>
            <button
                type="button"
                className={`${mastheadStyles.chip} ${count > 0 ? mastheadStyles.chipActive : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => (open ? close() : openSheet())}
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
                    className={panelStyles.panel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filters"
                >
                    <FiltersSheet
                        draft={draft}
                        onChange={setDraft}
                        onApply={onApply}
                        onReset={onReset}
                        dirty={!draftEquals(draft, applied)}
                        facets={facets}
                        filterDefs={filterDefs}
                        isPending={isPending}
                    />
                </div>
            )}
        </div>
    );
}
