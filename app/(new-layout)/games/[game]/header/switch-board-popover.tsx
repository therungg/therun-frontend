'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CaretDownFill } from 'react-bootstrap-icons';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import { CategoryIcon } from '../shared/category-icon';
import { usePopoverFocus } from '../shared/use-popover-focus';
import { computeCategoryVisibility } from './category-visibility';
import { LevelPicker } from './level-picker';
import styles from './masthead.module.scss';

const PENDING_PREFIX = 'category:';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
}

/**
 * The sticky bar's category switcher — decision 6 of the masthead design.
 * Reuses `computeCategoryVisibility` (the rail's own data path) and
 * `useBoardNav`'s exact URL mechanics (`category`, drop `page`/`combined`/
 * every variable key, `category:` pending-key prefix) so optimistic
 * selection and the board's stale-dim behaviour keep working from here too.
 *
 * Unlike the rail, collapsed-by-default groups are simply listed rather
 * than folded behind a disclosure chip — the point of this control is
 * reaching anything quickly while scrolled past the plate, not mirroring
 * the rail's default-collapsed presentation.
 *
 * Levels are the exception: they get the rail's own dropdown. Listing them
 * put one labelled group of buttons on screen per level, which on a game
 * like Tomb of the Mask is 650 of them inside a popover — a list nobody can
 * read, and a level is picked by name anyway.
 */
export function SwitchBoardPopover({
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const { sections, levels } = useMemo(
        () =>
            computeCategoryVisibility(
                categories,
                groups,
                null,
                selectedCategoryName,
            ),
        [categories, groups, selectedCategoryName],
    );

    // A pick used to close the panel on the same tick as the navigation
    // started, which threw away the only surface that could say the press had
    // landed — the panel vanished and the board sat unchanged for a second or
    // two. The panel now stays up, wearing the ring on the chip that was
    // pressed, and closes when the board it asked for arrives.
    const [closeWhenSettled, setCloseWhenSettled] = useState(false);
    // The transition's `isPending` is still false on the render that starts
    // it, so the effect below has to see it go up before it may act on it
    // coming down.
    const sawPending = useRef(false);

    const close = () => {
        setCloseWhenSettled(false);
        sawPending.current = false;
        setOpen(false);
    };

    useEffect(() => {
        if (!closeWhenSettled) return;
        if (isPending) {
            sawPending.current = true;
            return;
        }
        if (!sawPending.current) return;
        close();
    }, [closeWhenSettled, isPending]);

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

    // Optimistic selection: same read as the rail, so a chip picked from
    // here reads active immediately in both this panel and (once it
    // remounts) the plate's rail.
    const optimisticSelectedName =
        isPending && pendingKey?.startsWith(PENDING_PREFIX)
            ? pendingKey.slice(PENDING_PREFIX.length)
            : selectedCategoryName;

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        // Set last, the convention every reserved param here follows.
        sp.set('board', name);
        navigate(`${pathname}?${sp.toString()}`, `${PENDING_PREFIX}${name}`);
        setCloseWhenSettled(true);
    };

    // Nothing to switch to: same guard as CategoryRail's own "don't render
    // a control for a single board" rule.
    const hasLevels = levels.groups.length > 0;
    if (sections.length === 0 && !hasLevels) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1 && !hasLevels)
        return null;

    return (
        <div className={styles.switchRoot} ref={rootRef}>
            <button
                type="button"
                className={`${styles.chip} ${styles.switchTrigger}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                Switch board
                <CaretDownFill size={9} aria-hidden />
            </button>
            {open && (
                <div
                    ref={panelRef}
                    className={styles.switchPanel}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Switch board"
                >
                    {sections.map((section, idx) => {
                        const capId = `switch-group-${section.id ?? `ungrouped-${idx}`}`;
                        return (
                            <div
                                key={capId}
                                className={styles.switchGroup}
                                role={section.name ? 'group' : undefined}
                                aria-labelledby={
                                    section.name ? capId : undefined
                                }
                            >
                                {section.name && (
                                    <span
                                        id={capId}
                                        className={styles.groupEyebrow}
                                    >
                                        {section.name}
                                    </span>
                                )}
                                <div className={styles.switchChips}>
                                    {section.pills.map((c) => {
                                        const active =
                                            c.name === optimisticSelectedName;
                                        // The chip that was pressed, not
                                        // every chip in the panel.
                                        const busy =
                                            isPending &&
                                            pendingKey ===
                                                `${PENDING_PREFIX}${c.name}`;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => onSelect(c.name)}
                                                aria-pressed={active}
                                                aria-busy={busy || undefined}
                                                className={`${styles.chip} ${active ? styles.chipActive : ''} ${busy ? styles.chipBusy : ''}`}
                                            >
                                                <CategoryIcon
                                                    imageUrl={c.imageUrl}
                                                    size={17}
                                                />
                                                {c.display}
                                                {busy && (
                                                    <span
                                                        aria-hidden
                                                        className={
                                                            styles.chipSpinner
                                                        }
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    {hasLevels && (
                        <div
                            className={styles.switchGroup}
                            role="group"
                            aria-labelledby="switch-levels-label"
                        >
                            <span
                                id="switch-levels-label"
                                className={styles.groupEyebrow}
                            >
                                Levels
                            </span>
                            <LevelPicker
                                levels={levels.groups}
                                activeCategoryName={optimisticSelectedName}
                                onSelect={onSelect}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
