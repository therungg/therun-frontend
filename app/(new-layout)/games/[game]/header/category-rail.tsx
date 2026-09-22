'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../types/leaderboards.types';
import { useBoardNav } from '../filters/use-board-nav';
import { CategoryIcon } from '../shared/category-icon';
import { CategoryGroupRow, useCollapsedGroups } from './category-group-row';
import { computeCategoryVisibility } from './category-visibility';
import { LevelPicker } from './level-picker';
import styles from './masthead.module.scss';

const PENDING_PREFIX = 'category:';

interface Props {
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    selectedCategoryName: string;
    variableKeys: string[];
    /** Board population per category slug; see GamePageData.categoryBoardCounts. */
    boardCounts?: Record<string, number>;
    /** Board-wide selector default; groups override it one by one. */
    gameDisplayMode?: string | null;
}

export function CategoryRail({
    categories,
    groups,
    selectedCategoryName,
    variableKeys,
    boardCounts,
    gameDisplayMode,
}: Props) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { navigate, isPending, pendingKey } = useBoardNav();

    const { sections, levels } = useMemo(
        () =>
            computeCategoryVisibility(
                categories,
                groups,
                gameDisplayMode,
                selectedCategoryName,
            ),
        [categories, groups, gameDisplayMode, selectedCategoryName],
    );

    const onSelect = (name: string) => {
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete('page');
        sp.delete('combined');
        for (const k of variableKeys) sp.delete(k);
        // Set last, the convention every reserved param here follows.
        sp.set('board', name);
        navigate(`${pathname}?${sp.toString()}`, `${PENDING_PREFIX}${name}`);
    };

    // Optimistic selection: while a category nav is in flight the clicked
    // chip reads active immediately rather than waiting for the RSC payload.
    const optimisticSelectedName =
        isPending && pendingKey?.startsWith(PENDING_PREFIX)
            ? pendingKey.slice(PENDING_PREFIX.length)
            : selectedCategoryName;

    // A collapsed group holding the board you're looking at expands
    // regardless — otherwise the active chip is invisible.
    const { rowState, toggle } = useCollapsedGroups(optimisticSelectedName);

    const hasLevels = levels.groups.length > 0;
    if (sections.length === 0 && !hasLevels) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1 && !hasLevels)
        return null;

    return (
        <nav
            aria-label="Category"
            aria-busy={isPending || undefined}
            className={styles.rail}
        >
            {sections.map((section, idx) => {
                const capId = `rail-group-${section.id ?? `ungrouped-${idx}`}`;
                return (
                    <CategoryGroupRow
                        key={capId}
                        label={section.name}
                        labelId={capId}
                        state={rowState(section)}
                        count={section.pills.length}
                        onToggle={() => toggle(section.id as number)}
                    >
                        {section.pills.length === 0 ? (
                            <span className={styles.emptyGroup}>
                                No categories enabled for this group.
                            </span>
                        ) : section.displayMode === 'dropdown' ? (
                            // One control instead of a wrapping band.
                            // Deliberately a native select: it is the one
                            // picker that is already correct with a keyboard,
                            // a screen reader and a thumb, and the rail has no
                            // room for a popover that would have to
                            // reimplement all three.
                            <select
                                // Green only when this group actually holds the
                                // selected category — matches the `value` logic
                                // below, so a group showing "Pick a category…"
                                // no longer reads as chosen.
                                className={`${styles.categorySelect} ${
                                    section.pills.some(
                                        (c) =>
                                            c.name === optimisticSelectedName,
                                    )
                                        ? styles.categorySelectActive
                                        : ''
                                }`}
                                value={
                                    section.pills.some(
                                        (c) =>
                                            c.name === optimisticSelectedName,
                                    )
                                        ? optimisticSelectedName
                                        : ''
                                }
                                onChange={(e) => onSelect(e.target.value)}
                                aria-label={
                                    section.name
                                        ? `Category in ${section.name}`
                                        : 'Category'
                                }
                            >
                                {/* A group that does not hold the selected
                                    board has no value of its own to show —
                                    without this the select would lie and
                                    display its first category as chosen. */}
                                {!section.pills.some(
                                    (c) => c.name === optimisticSelectedName,
                                ) && (
                                    <option value="" disabled>
                                        Pick a category…
                                    </option>
                                )}
                                {section.pills.map((c) => {
                                    const entries =
                                        boardCounts?.[c.name] ?? null;
                                    return (
                                        <option key={c.id} value={c.name}>
                                            {c.display}
                                            {entries == null
                                                ? ''
                                                : ` · ${entries.toLocaleString()} ${entries === 1 ? 'entry' : 'entries'}`}
                                        </option>
                                    );
                                })}
                            </select>
                        ) : (
                            section.pills.map((c) => {
                                const active =
                                    c.name === optimisticSelectedName;
                                // Entries, not the category stats row's
                                // uniqueRunners: the number above the
                                // subcategory values has to be the total those
                                // values add up to, and one runner can hold an
                                // entry on several of them. See
                                // categoryBoardCounts.
                                const entries = boardCounts?.[c.name] ?? null;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => onSelect(c.name)}
                                        aria-pressed={active}
                                        aria-label={
                                            entries == null
                                                ? undefined
                                                : `${c.display}, ${entries} ${entries === 1 ? 'entry' : 'entries'}`
                                        }
                                        // The count's unit differs from the
                                        // plate's run count — name it on hover.
                                        title={
                                            entries == null
                                                ? undefined
                                                : `${entries.toLocaleString()} ${entries === 1 ? 'entry' : 'entries'}`
                                        }
                                        className={`${styles.chip} ${styles.chipCategory} ${active ? styles.chipActive : ''}`}
                                    >
                                        <CategoryIcon
                                            imageUrl={c.imageUrl}
                                            size={20}
                                        />
                                        {c.display}
                                        {entries != null && (
                                            <span
                                                aria-hidden
                                                className={styles.chipCount}
                                            >
                                                {entries.toLocaleString()}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </CategoryGroupRow>
                );
            })}

            {hasLevels && (
                <div className={styles.block}>
                    <span className={styles.endcap} id="rail-levels">
                        Levels
                    </span>
                    <div
                        className={styles.well}
                        role="group"
                        aria-labelledby="rail-levels"
                    >
                        <LevelPicker
                            levels={levels.groups}
                            activeCategoryName={optimisticSelectedName}
                            boardCounts={boardCounts}
                            onSelect={onSelect}
                        />
                    </div>
                </div>
            )}
        </nav>
    );
}
