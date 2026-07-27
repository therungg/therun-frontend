'use client';

import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import band from '../../game-page.module.scss';
import { computeCategoryVisibility } from '../../header/category-visibility';
import styles from '../setup.module.scss';

interface Props {
    /** Draft categories the mod has ticked — what the public band would list. */
    categories: ResolvedCategory[];
    groups: ResolvedGroup[];
    variables: VariableRow[];
}

/** One chip per variable name — a category-scoped row shadows the game-wide one. */
function dedupeByName(variables: VariableRow[]): VariableRow[] {
    const seen = new Set<string>();
    const out: VariableRow[] = [];
    for (const v of variables) {
        if (seen.has(v.nameNormalized)) continue;
        seen.add(v.nameNormalized);
        out.push(v);
    }
    return out;
}

/**
 * The board's category band, rendered from unsaved wizard state.
 *
 * Deliberately runs the *same* `computeCategoryVisibility` the public page
 * runs (header/category-pills.tsx) rather than approximating it, so the
 * preview can't drift from the thing it previews. That includes the
 * flatten-when-trivial rule: one group in use collapses back to a single
 * unlabeled row, which is exactly the surprise this preview exists to show
 * before someone saves and wonders why nothing changed.
 *
 * Pills are inert spans — this is a picture of the board, not the board.
 */
export function CategoryBandPreview({ categories, groups, variables }: Props) {
    const { sections } = computeCategoryVisibility(categories, groups);
    // The wizard loads variables from the admin endpoint, which returns every
    // version including unpublished drafts; the public band only ever sees
    // published ones, deduped per variable name. Match that, or the preview
    // promises chips the board won't render.
    const subcategories = dedupeByName(
        variables.filter((v) => v.role === 'subcategory' && v.published),
    ).sort((a, b) => a.sortOrder - b.sortOrder);
    // Read the flatten out of the real output rather than re-deriving the
    // rule — one source of truth for when headings appear.
    const flattened = groups.length > 0 && sections.length === 1;

    return (
        <div className={styles.previewPanel}>
            <div className={styles.previewHead}>
                <h3 className="h6 mb-0">Live preview — the category band</h3>
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
                    {sections.map((section, idx) => (
                        <div
                            key={section.id ?? `ungrouped-${idx}`}
                            className={band.bandRow}
                        >
                            {section.name && (
                                <span className={band.groupLabel}>
                                    {section.name}
                                </span>
                            )}
                            {section.collapsedByDefault && (
                                <span className={styles.previewNote}>
                                    collapsed — {section.pills.length} behind a
                                    click
                                </span>
                            )}
                            {section.pills.length === 0 ? (
                                <span className="text-muted small">
                                    No categories in this group.
                                </span>
                            ) : (
                                !section.collapsedByDefault &&
                                section.pills.map((c) => (
                                    <span key={c.id} className={band.pill}>
                                        {c.display}
                                    </span>
                                ))
                            )}
                        </div>
                    ))}

                    {subcategories.length > 0 && (
                        <div className={`${band.bandRow} ${band.bandRowSub}`}>
                            <div className="d-flex flex-column gap-1">
                                {subcategories.map((v) => {
                                    const defaultValue =
                                        v.defaultValueIndex != null
                                            ? (v.values[
                                                  v.defaultValueIndex
                                              ]?.[0] ?? '')
                                            : '';
                                    return (
                                        <div
                                            key={v.id}
                                            className="d-flex align-items-center gap-2 flex-wrap"
                                        >
                                            <span className={band.groupLabel}>
                                                {v.name}
                                            </span>
                                            {v.values.map((bucket) => (
                                                <span
                                                    key={bucket[0]}
                                                    className={`${band.pill} ${
                                                        bucket[0] ===
                                                        defaultValue
                                                            ? band.pillActive
                                                            : ''
                                                    }`}
                                                >
                                                    {bucket[0]}
                                                </span>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {flattened && (
                <p className={`${styles.previewNote} mb-0 mt-2`}>
                    One group doesn&apos;t change anything — the band only
                    splits into labeled sections once a second group has
                    categories in it.
                </p>
            )}

            {subcategories.length > 0 && (
                <p className={`${styles.previewNote} mb-0 mt-2`}>
                    Subcategories come from variables, which you set up in the
                    console — not in this wizard.
                </p>
            )}
        </div>
    );
}
