'use client';

import type {
    ResolvedCategory,
    ResolvedGroup,
} from '../../../../../../types/leaderboards.types';
import {
    CategoryGroupRow,
    useCollapsedGroups,
} from '../../header/category-group-row';
import { computeCategoryVisibility } from '../../header/category-visibility';
import band from '../../header/masthead.module.scss';
import styles from '../setup.module.scss';

interface Props {
    /** Draft categories the mod has ticked — what the public band would list. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    /** Draft board-wide selector default, so the preview follows the picker. */
    gameDisplayMode?: string | null;
}

/**
 * The board's category band, rendered from unsaved wizard state.
 *
 * Deliberately runs the *same* `computeCategoryVisibility` the public page
 * runs (header/category-rail.tsx) rather than approximating it, so the
 * preview can't drift from the thing it previews. That includes the
 * flatten-when-trivial rule: one group in use collapses back to a single
 * unlabeled row, which is exactly the surprise this preview exists to show
 * before someone saves and wonders why nothing changed.
 *
 * Subcategory bands are per-category (variables are category-scoped), so
 * this previews the category tier only — the per-category editor's own band
 * preview shows how one category splits.
 *
 * Chips are inert spans — this is a picture of the board, not the board.
 */
export function CategoryBandPreview({
    categories,
    groups,
    gameDisplayMode,
}: Props) {
    const { sections, levels } = computeCategoryVisibility(
        categories,
        groups,
        gameDisplayMode,
    );
    // Read the flatten out of the real output rather than re-deriving the
    // rule — one source of truth for when headings appear.
    const flattened = groups.length > 0 && sections.length === 1;
    // The real rail's own row treatment, hidden-by-default groups included:
    // a labeled row clipped to one line of pills with a "Show N more" toggle.
    // The preview has no active board, so nothing is ever force-opened here —
    // the mod sees the state a first-time visitor lands on, and can still
    // open a row to check what is inside it.
    const { rowState, toggle } = useCollapsedGroups('');

    return (
        <div className={styles.previewPanel}>
            <div className={styles.previewHead}>
                <h3 className="h6 mb-0">Live preview of the category band</h3>
                <span className={styles.previewNote}>
                    reflects your unsaved edits
                </span>
            </div>

            {categories.length === 0 ? (
                <p className="text-muted small mb-0">
                    Nothing on the board yet. Tick a category below and it shows
                    up here.
                </p>
            ) : (
                <div className={styles.previewBand}>
                    {sections.map((section, idx) => {
                        const capId = `preview-group-${section.id ?? `ungrouped-${idx}`}`;
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
                                    <span className={band.emptyGroup}>
                                        No categories in this group.
                                    </span>
                                ) : section.displayMode === 'dropdown' ? (
                                    // A real select, same as the live rail
                                    // (see CategoryRail) and the Levels
                                    // preview below: the mod can expand it to
                                    // check the dropdown works. It drives
                                    // nothing — this is still a preview.
                                    <select
                                        className={`${band.categorySelect} ${styles.previewChip}`}
                                        aria-label={
                                            section.name
                                                ? `Category in ${section.name}`
                                                : 'Category'
                                        }
                                        defaultValue={section.pills[0].id}
                                    >
                                        {section.pills.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.display}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    section.pills.map((c) => (
                                        <span
                                            key={c.id}
                                            className={`${band.chip} ${styles.previewChip}`}
                                        >
                                            {c.display}
                                        </span>
                                    ))
                                )}
                            </CategoryGroupRow>
                        );
                    })}

                    {levels.groups.length > 0 && (
                        <div className={band.block}>
                            <span className={band.endcap}>Levels</span>
                            <div className={band.well}>
                                <div className={band.chips}>
                                    {/* The real board picks levels with a
                                     * native <select> (see LevelPicker). A real
                                     * select here lets the mod expand it to see
                                     * every level; it drives nothing — this is
                                     * still a preview. */}
                                    <select
                                        className={`${band.categorySelect} ${styles.previewChip}`}
                                        aria-label="Levels"
                                        defaultValue={levels.groups[0].id}
                                    >
                                        {levels.groups.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {flattened && (
                <p className={`${styles.previewNote} mb-0 mt-2`}>
                    One group doesn&apos;t change anything. The band only splits
                    into labeled sections once a second group has categories in
                    it.
                </p>
            )}
        </div>
    );
}
