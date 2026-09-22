'use client';

import { useEffect, useRef, useState } from 'react';
import { Sliders } from 'react-bootstrap-icons';
import type {
    BoardFacets,
    VariableRow,
} from '../../../../../types/leaderboards.types';
import styles from '../game-page.module.scss';
import mastheadStyles from '../header/masthead.module.scss';
import { PopoverLayer } from '../shared/popover-layer';
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

    // Which foot button started the navigation that is still in flight. The
    // sheet used to close on the same tick as Apply, which threw away the one
    // surface that could say the press had landed — the panel vanished and
    // the board sat on its old rows for a second or two. It stays up now,
    // with that button saying what it is doing, and closes when the board it
    // asked for arrives.
    const [submitting, setSubmitting] = useState<'apply' | 'reset' | null>(
        null,
    );
    // `isPending` is still false on the render that starts the transition, so
    // the effect has to see it go up before it may act on it coming down.
    const sawPending = useRef(false);

    const openSheet = () => {
        setDraft(draftFromApplied(builtins, selectedVarFilters));
        setOpen(true);
    };
    const close = () => {
        setSubmitting(null);
        sawPending.current = false;
        setOpen(false);
    };
    // Escape and Tab-trap from usePopoverFocus; placement and outside-click
    // from PopoverLayer, which knows where the portaled panel ended up.
    usePopoverFocus({ open, onClose: close, panelRef });

    useEffect(() => {
        if (submitting === null) return;
        if (isPending) {
            sawPending.current = true;
            return;
        }
        if (!sawPending.current) return;
        close();
    }, [submitting, isPending]);

    const onApply = () => {
        applyFilters(draft, variableKeys);
        setSubmitting('apply');
    };
    const onReset = () => {
        const d = emptyDraft();
        setDraft(d);
        // Nothing applied to clear — writing the empty draft would push the
        // URL it is already on, so there is nothing to wait for.
        if (draftCount(applied) === 0) {
            close();
            return;
        }
        applyFilters(d, variableKeys);
        setSubmitting('reset');
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
            <PopoverLayer
                open={open}
                anchorRef={rootRef}
                onClose={close}
                themed
            >
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
                        submitting={submitting}
                    />
                </div>
            </PopoverLayer>
        </div>
    );
}
