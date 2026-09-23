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

const DEGRADED_TITLE = 'Some sources failed to load, counts may be incomplete';

/** Overrides the generic "N items need attention" wording for a badge that
 * stands for one specific thing (the Queue) rather than a mixed bag. */
export interface AttentionBadgeCopy {
    label: (count: number) => string;
    degradedLabel: string;
}

/** The Queue's own copy — every caller that badges the Queue count passes
 * this so the wording can't drift between the sidebar and the tile grid. */
export const QUEUE_BADGE_COPY: AttentionBadgeCopy = {
    label: (count) => `${count} runs waiting on you`,
    degradedLabel: "Couldn't load the queue",
};

/**
 * Returns null when there is nothing worth showing — a confirmed zero. A zero
 * that might be an undercount still renders, as a bare '!'.
 */
export function attentionBadgeContent(
    count: number,
    degraded: boolean,
    copy?: AttentionBadgeCopy,
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

    const degradedLabel = copy?.degradedLabel ?? DEGRADED_TITLE;
    const label = degraded
        ? count > 0
            ? copy
                ? degradedLabel
                : `${count} items need attention. Some sources didn't load, so the actual count may be higher`
            : degradedLabel
        : copy
          ? copy.label(count)
          : `${count} items need attention`;

    return { text, label, title: degraded ? degradedLabel : undefined };
}
