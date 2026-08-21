// Badge content for the attention count, shared by the sidebar nav item and
// the tile grid so the degraded-source wording and the 99+ ceiling cannot
// drift between the two surfaces.

export interface AttentionBadgeContent {
    /** What the badge shows — '7', '7+', '99+' or '!'. */
    text: string;
    /** Screen-reader description of the same. */
    label: string;
    /** Hover hint, present only when sources are degraded. */
    title?: string;
}

const DEGRADED_TITLE = 'Some sources failed to load — counts may be incomplete';

/**
 * Returns null when there is nothing worth showing — a confirmed zero. A zero
 * that might be an undercount still renders, as a bare '!'.
 */
export function attentionBadgeContent(
    count: number,
    degraded: boolean,
): AttentionBadgeContent | null {
    if (count === 0 && !degraded) return null;

    // The 99+ cap wins over the degraded '+' — '99++' would be nonsense, and
    // '99+' already reads as "at least this many".
    const text =
        degraded && count === 0
            ? '!'
            : count > 99
              ? '99+'
              : `${count}${degraded ? '+' : ''}`;

    const label = degraded
        ? count > 0
            ? `${count} items need attention — some sources didn't load, actual count may be higher`
            : DEGRADED_TITLE
        : `${count} items need attention`;

    return { text, label, title: degraded ? DEGRADED_TITLE : undefined };
}
