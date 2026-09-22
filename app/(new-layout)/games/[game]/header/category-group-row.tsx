'use client';

import { type ReactNode, useState } from 'react';
import type { CategorySection } from './category-visibility';
import styles from './masthead.module.scss';

/**
 * How one rail row draws right now.
 *
 * `collapsible` is the moderator's hidden-by-default flag after the rules
 * that can override it; `collapsed` is whether the row is clipped at this
 * moment. A row that is not collapsible has no toggle at all — it is an
 * ordinary labelled rail row.
 */
export interface GroupRowState {
    collapsible: boolean;
    collapsed: boolean;
}

/**
 * Which hidden-by-default groups the reader opened this visit.
 *
 * Not persisted: "hidden by default" is the moderator's call about the
 * default state, so every visit starts from it again.
 *
 * Shared by the public rail, the console's live rail and the wizard's band
 * preview so the three cannot disagree about when a group is open — the one
 * override being that a group holding the board you are looking at is always
 * open, and shows no toggle, because "Show less" there would hide the active
 * category.
 */
export function useCollapsedGroups(activeCategoryName: string) {
    const [opened, setOpened] = useState<Set<number>>(new Set());

    const toggle = (id: number) =>
        setOpened((prev) => {
            const next = new Set(prev);
            if (!next.delete(id)) next.add(id);
            return next;
        });

    const rowState = (section: CategorySection): GroupRowState => {
        const open: GroupRowState = { collapsible: false, collapsed: false };
        // The ungrouped section has no group to carry the flag, and no id to
        // remember an open state under.
        if (section.id === null) return open;
        if (!section.collapsedByDefault) return open;
        // A dropdown group is already one control on one row — there is
        // nothing left for a clip to hide, and "Show 9 more" would be a lie.
        if (section.displayMode === 'dropdown') return open;
        if (section.pills.some((c) => c.name === activeCategoryName))
            return open;
        return { collapsible: true, collapsed: !opened.has(section.id) };
    };

    return { rowState, toggle };
}

interface Props {
    /** The group's name, drawn with the same eyebrow as MAIN CATEGORIES. */
    label: string | null;
    /** Stable id for the eyebrow, so the row's chips can be labelled by it. */
    labelId: string;
    state: GroupRowState;
    /**
     * How many categories the group holds. The toggle names this number
     * rather than the number actually clipped: which pills fit on the first
     * row is a layout outcome only the browser knows, and measuring it would
     * buy a more exact sentence at the cost of a resize observer per row.
     */
    count: number;
    onToggle: () => void;
    /** The group's pills, selects or placeholder — each surface's own. */
    children: ReactNode;
}

/**
 * One row of the category rail: eyebrow label, then the group's pills.
 *
 * A group the moderator marked hidden-by-default is still its own labelled
 * row — it is clipped to a single row of pills with a text toggle at the end
 * ("Show 8 more"), never reduced to a chip standing in for the group and
 * never dropped. Hidden by default means collapsed, not absent.
 *
 * The clip is CSS (`max-height` + `overflow: hidden`), not a slice of the
 * pill list, so the pills that fit stay visible and readable and expanding
 * costs no layout thrash.
 */
export function CategoryGroupRow({
    label,
    labelId,
    state,
    count,
    onToggle,
    children,
}: Props) {
    const chipsId = `${labelId}-chips`;
    const toggleText = state.collapsed ? `Show ${count} more` : 'Show less';

    return (
        <div className={styles.block}>
            {label && (
                <span className={styles.endcap} id={labelId}>
                    {label}
                </span>
            )}
            <div
                className={`${styles.well} ${label ? '' : styles.wellSolo}`}
                role={label ? 'group' : undefined}
                aria-labelledby={label ? labelId : undefined}
            >
                <div className={styles.groupRow}>
                    <div
                        id={chipsId}
                        className={`${styles.chips} ${styles.groupChips} ${
                            state.collapsed ? styles.chipsClamped : ''
                        }`}
                    >
                        {children}
                    </div>
                    {state.collapsible && (
                        <button
                            type="button"
                            className={styles.groupToggle}
                            aria-expanded={!state.collapsed}
                            aria-controls={chipsId}
                            aria-label={
                                label ? `${toggleText} in ${label}` : undefined
                            }
                            onClick={onToggle}
                        >
                            {toggleText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
