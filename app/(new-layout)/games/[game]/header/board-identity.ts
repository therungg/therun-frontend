import type {
    ResolvedCategory,
    VariableRow,
} from '../../../../../types/leaderboards.types';

/**
 * The subcategory half of the board's name — "Mario · No Major Skips".
 *
 * Reads the *effective* board, not the URL: a variable with no explicit
 * selection still narrows the board to its default value, so the masthead has
 * to name that value too or the headline disagrees with the record beside it.
 */
export function effectiveSubcategoryLabel(
    defs: VariableRow[],
    selected: Record<string, string>,
): string {
    return defs
        .filter((d) => d.role === 'subcategory')
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((d) => {
            const fallback =
                d.defaultValueIndex != null
                    ? (d.values[d.defaultValueIndex]?.[0] ?? '')
                    : '';
            return selected[d.nameNormalized] ?? fallback;
        })
        .filter(Boolean)
        .join(' · ');
}
