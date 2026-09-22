'use client';

import { normalizeVariableName } from '~src/lib/variables/keys';
import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import {
    CategoryGroupRow,
    useCollapsedGroups,
} from '../../header/category-group-row';
import type { CategoryVisibility } from '../../header/category-visibility';
import { LevelPicker } from '../../header/level-picker';
import styles from '../../header/masthead.module.scss';
import { CategoryIcon } from '../../shared/category-icon';
import { defaultCanonicalOf } from './subcategory-bands';

interface Props {
    visibility: CategoryVisibility;
    selected: ResolvedCategory | null;
    onSelect: (category: ResolvedCategory) => void;
}

/**
 * The category rail as the public board will draw it, driving local
 * selection instead of the URL.
 *
 * Same `computeCategoryVisibility` output and the same rules as
 * header/category-rail.tsx — live order, Pills / Dropdown per group,
 * hidden-by-default groups as their own collapsed row, level boards behind
 * the Levels picker, and no rail at all for a board with one category — so the setup
 * preview shows what goes live rather than a moderator's flat list.
 */
export function LiveCategoryRail({ visibility, selected, onSelect }: Props) {
    const { sections, levels } = visibility;
    const selectedName = selected?.name ?? '';
    const { rowState, toggle } = useCollapsedGroups(selectedName);

    const hasLevels = levels.groups.length > 0;
    if (sections.length === 0 && !hasLevels) return null;
    if (sections.length === 1 && sections[0].pills.length <= 1 && !hasLevels)
        return null;

    const byName = (name: string) => {
        const c =
            sections.flatMap((s) => s.pills).find((p) => p.name === name) ??
            levels.groups.flatMap((l) => l.boards).find((b) => b.name === name);
        if (c) onSelect(c);
    };

    return (
        <nav aria-label="Category" className={styles.rail}>
            {sections.map((section, idx) => {
                const capId = `live-rail-group-${section.id ?? `ungrouped-${idx}`}`;
                const holdsSelected = section.pills.some(
                    (c) => c.name === selectedName,
                );
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
                            <select
                                className={`${styles.categorySelect} ${
                                    holdsSelected
                                        ? styles.categorySelectActive
                                        : ''
                                }`}
                                value={holdsSelected ? selectedName : ''}
                                onChange={(e) => byName(e.target.value)}
                                aria-label={
                                    section.name
                                        ? `Category in ${section.name}`
                                        : 'Category'
                                }
                            >
                                {!holdsSelected && (
                                    <option value="" disabled>
                                        Pick a category…
                                    </option>
                                )}
                                {section.pills.map((c) => (
                                    <option key={c.id} value={c.name}>
                                        {c.display}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            section.pills.map((c) => {
                                const active = c.name === selectedName;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => onSelect(c)}
                                        aria-pressed={active}
                                        className={`${styles.chip} ${styles.chipCategory} ${active ? styles.chipActive : ''}`}
                                    >
                                        <CategoryIcon
                                            imageUrl={c.imageUrl}
                                            size={20}
                                        />
                                        {c.display}
                                    </button>
                                );
                            })
                        )}
                    </CategoryGroupRow>
                );
            })}

            {hasLevels && (
                <div className={styles.block}>
                    <span className={styles.endcap} id="live-rail-levels">
                        Levels
                    </span>
                    <div
                        className={styles.well}
                        role="group"
                        aria-labelledby="live-rail-levels"
                    >
                        <LevelPicker
                            levels={levels.groups}
                            activeCategoryName={selectedName}
                            onSelect={byName}
                        />
                    </div>
                </div>
            )}
        </nav>
    );
}

interface TierProps {
    variables: VariableRow[];
    selectedValues: Record<string, string>;
    onSelect: (nameNormalized: string, canonical: string) => void;
}

/**
 * The subcategory tier as the public board draws it (filters/
 * subcategory-pills.tsx): one segmented control per variable, captions with
 * the trailing question mark trimmed. Selection stays in the normalized key
 * space the roster fetch uses.
 */
export function LiveSubcategoryTier({
    variables,
    selectedValues,
    onSelect,
}: TierProps) {
    if (variables.length === 0) return null;

    return (
        <div className={styles.tier}>
            <div className={styles.tierControls}>
                {variables.map((v) => {
                    const active =
                        selectedValues[v.nameNormalized] ??
                        defaultCanonicalOf(v);
                    const capId = `live-subcat-${v.id}`;
                    return (
                        <div
                            key={v.id}
                            className={styles.control}
                            role="group"
                            aria-labelledby={capId}
                        >
                            <span className={styles.controlCap} id={capId}>
                                {v.name.replace(/\s*\?+\s*$/, '')}
                            </span>
                            <div className={styles.segTrack}>
                                {v.values.map((bucket, i) => {
                                    const canonical = normalizeVariableName(
                                        bucket[0] ?? '',
                                    );
                                    const isActive = active === canonical;
                                    return (
                                        <button
                                            key={`${v.id}-${i}`}
                                            type="button"
                                            onClick={() =>
                                                onSelect(
                                                    v.nameNormalized,
                                                    canonical,
                                                )
                                            }
                                            aria-pressed={isActive}
                                            className={`${styles.seg} ${isActive ? styles.segOn : ''}`}
                                            title={
                                                bucket.length > 1
                                                    ? `Aliases: ${bucket.slice(1).join(', ')}`
                                                    : undefined
                                            }
                                        >
                                            {bucket[0]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
