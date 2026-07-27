'use client';

import { CaretRightFill } from 'react-bootstrap-icons';
import type {
    ResolvedCategory,
    ResolvedGroup,
    VariableRow,
} from '../../../../../../types/leaderboards.types';
import { computeCategoryVisibility } from '../../header/category-visibility';
import band from '../../header/masthead.module.scss';
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
 * runs (header/category-rail.tsx) rather than approximating it, so the
 * preview can't drift from the thing it previews. That includes the
 * flatten-when-trivial rule: one group in use collapses back to a single
 * unlabeled row, which is exactly the surprise this preview exists to show
 * before someone saves and wonders why nothing changed.
 *
 * Chips are inert spans — this is a picture of the board, not the board.
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
    // Mirror the real rail's split: a group marked hidden-by-default renders
    // as a ghost chip in one shared trailing well, not its own labeled row —
    // a collapsed group must not own a whole block for one chip, same as
    // header/category-rail.tsx.
    const open = sections.filter((s) => !s.collapsedByDefault);
    const collapsed = sections.filter((s) => s.collapsedByDefault);

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
                    {open.map((section, idx) => (
                        <div
                            key={section.id ?? `ungrouped-${idx}`}
                            className={band.block}
                        >
                            {section.name && (
                                <span className={band.endcap}>
                                    {section.name}
                                </span>
                            )}
                            <div
                                className={`${band.well} ${section.name ? '' : band.wellSolo}`}
                            >
                                <div className={band.chips}>
                                    {section.pills.length === 0 ? (
                                        <span className={band.emptyGroup}>
                                            No categories in this group.
                                        </span>
                                    ) : (
                                        section.pills.map((c) => (
                                            <span
                                                key={c.id}
                                                className={band.chip}
                                            >
                                                {c.display}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {collapsed.length > 0 && (
                        <div className={band.block}>
                            <div className={`${band.well} ${band.wellSolo}`}>
                                <div className={band.chips}>
                                    {collapsed.map((section) => (
                                        <span
                                            key={`collapsed-${section.id}`}
                                            className={`${band.chip} ${band.chipGhost}`}
                                        >
                                            <CaretRightFill
                                                size={9}
                                                aria-hidden
                                            />
                                            {section.name}
                                            <span
                                                aria-hidden
                                                className={band.chipCount}
                                            >
                                                {section.pills.length}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {subcategories.length > 0 && (
                        <div className={band.tier}>
                            {subcategories.map((v) => {
                                const defaultValue =
                                    v.defaultValueIndex != null
                                        ? (v.values[v.defaultValueIndex]?.[0] ??
                                          '')
                                        : '';
                                return (
                                    <div key={v.id} className={band.block}>
                                        <span className={band.endcap}>
                                            {v.name}
                                        </span>
                                        <div className={band.well}>
                                            <div className={band.chips}>
                                                {v.values.map((bucket) => (
                                                    <span
                                                        key={bucket[0]}
                                                        className={`${band.chip} ${
                                                            bucket[0] ===
                                                            defaultValue
                                                                ? band.chipActive
                                                                : ''
                                                        }`}
                                                    >
                                                        {bucket[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
