/**
 * The words this surface uses, in one place.
 *
 * Mods do not read `subcategory`, `bucket`, `nameNormalized` or "re-resolve
 * worker". They read what a thing does. The console, the wizard and the
 * in-effect panel all import from here so they cannot describe the same
 * concept three different ways — which is exactly how this surface got
 * confusing in the first place.
 */

export type VariableRoleId = 'subcategory' | 'filter';

export const ROLE_LABEL: Record<VariableRoleId, string> = {
    subcategory: 'splits this board',
    filter: 'filter only',
};

/**
 * The two things a `role` actually is, to a moderator.
 *
 * `role` is one field on one row type, which is right for storage and wrong
 * for authoring: it makes a moderator pick the value that establishes a
 * distinction they have to already understand. So the field stops being a
 * picker and becomes a consequence of *which section you were standing in* —
 * and the sections are named after what they do, not after the column.
 *
 * Nothing below leaks "variable", "role", "subcategory" or "bucket".
 */
export const SECTION: Record<
    VariableRoleId,
    {
        /** Section heading. */
        title: string;
        /** One line under the heading — what this section costs you. */
        blurb: string;
        /** Label on the section's add button. */
        add: string;
        /** Singular noun for one entry in this section. */
        noun: string;
    }
> = {
    subcategory: {
        title: 'Separate leaderboards',
        blurb: 'Each combination below gets its own board and its own record.',
        add: 'Split the board by…',
        noun: 'split',
    },
    filter: {
        title: 'Run details',
        blurb: 'Runners filter the board with these. No effect on records.',
        add: 'Collect another detail',
        noun: 'detail',
    },
};

/**
 * The filters every board already has, shown read-only beside the ones a
 * moderator adds.
 *
 * A run detail is not a new concept for a runner — the board has a filter bar
 * already. Naming the built-ins here is what makes "you are adding one more
 * control to an existing bar" the obvious reading, and it turns a reserved-name
 * collision into something visible before typing rather than a 400 on save.
 */
export const BUILT_IN_FILTERS = ['Country', 'Year', 'Verified', 'Timing'];

/** The one question asked when creating, phrased as an outcome. */
export const CREATE_QUESTION =
    'Should each option get its own leaderboard and its own world record?';

/**
 * Label for moving a variable between sections. This is a named action with a
 * consequence preview, never a dropdown: it either collapses N boards into one
 * or explodes one into N.
 */
export function conversionLabel(to: VariableRoleId): string {
    return to === 'subcategory'
        ? 'Split the board by this'
        : 'Move to run details';
}

/**
 * Categories disagreeing about a variable's role is not a footnote — it means
 * the same thing is a leaderboard split on part of the board and a filter on
 * the rest. Said plainly, with the two ways out.
 */
export function driftNotice(input: {
    name: string;
    splitOn: string[];
    filterOn: string[];
}): string {
    const { name, splitOn, filterOn } = input;
    return `${name} splits the board on ${list(splitOn)} but is only a run detail on ${list(filterOn)}.`;
}

function list(items: string[]): string {
    if (items.length === 0) return 'no categories';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Sentence-case a ROLE_LABEL phrase for use as a heading or a label's
 *  leading word — the phrases themselves stay lowercase for mid-sentence use. */
export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Row-level label, e.g. "splits this board into 4". A single value doesn't
 * split anything — "into 1" reads as nonsense — so the count is dropped
 * until there's actually more than one board to name, mirroring how
 * roleConsequence already treats a one-value subcategory as not yet split.
 */
export function boardCountLabel(
    role: VariableRoleId,
    valueCount: number,
): string {
    if (role === 'filter') return ROLE_LABEL.filter;
    if (valueCount <= 1) return ROLE_LABEL.subcategory;
    return `${ROLE_LABEL.subcategory} into ${valueCount}`;
}

/** Live sentence under the role choice — what this decision actually does. */
export function roleConsequence(input: {
    role: VariableRoleId;
    variableName: string;
    categoryDisplay: string;
    valueCount: number;
}): string {
    const { role, variableName, categoryDisplay, valueCount } = input;

    if (role === 'filter') {
        return `${categoryDisplay} stays one leaderboard. Runners can filter by ${variableName}.`;
    }
    if (valueCount === 0) return 'Add at least one value.';
    if (valueCount === 1) {
        return `${categoryDisplay} stays one leaderboard until you add a second value.`;
    }
    return `${categoryDisplay} becomes ${valueCount} separate leaderboards, each with its own world record.`;
}
