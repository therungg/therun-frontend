import type { MillisecondsMode } from '../../types/leaderboards.types';

/**
 * A board's precision setting, read off whatever carries it.
 *
 * `millisecondsMode` is the field; the older `showMilliseconds` boolean is
 * still written beside it and is all an older backend sends, so it stands in
 * when the mode is absent. Neither present means the board has said nothing,
 * and a board that has said nothing shows its milliseconds.
 */
export function resolveMillisecondsMode(
    source:
        | {
              millisecondsMode?: MillisecondsMode | null;
              showMilliseconds?: boolean | null;
          }
        | null
        | undefined,
): MillisecondsMode {
    if (source?.millisecondsMode != null) return source.millisecondsMode;
    if (source?.showMilliseconds === false) return 'never';
    return 'always';
}

/** The boolean the backend keeps in sync with the mode. */
export function millisecondsModeToBoolean(mode: MillisecondsMode): boolean {
    return mode === 'always';
}

/** Anything the tie rule can tell apart: a run, a set time, or its position. */
export interface MillisecondsRow {
    runId?: number | null;
    manualTimeId?: number | null;
}

/**
 * What identifies a row for the tie rule. A run and a set time each have their
 * own id; a row with neither (curation's ghost row, an older payload) falls
 * back to where it sits in the list, which is stable for one render.
 */
export function millisecondsKey(row: MillisecondsRow, index: number): string {
    if (row.runId != null) return `r:${row.runId}`;
    if (row.manualTimeId != null) return `m:${row.manualTimeId}`;
    return `i:${index}`;
}

/**
 * Which of these times print their milliseconds.
 *
 * `always` and `never` are the whole list either way. `tied` is the reason
 * this is a list operation rather than a per-time one: a time only earns its
 * milliseconds when another time in the same list reads the same whole second
 * on the clock the list is shown by. Both halves of such a tie print them, so
 * the pair reads as two different times instead of one repeated.
 *
 * `clock` picks that displayed clock — the one the board ranks by, not
 * whichever the entry happens to carry. Entries with no time on it are not
 * candidates for a tie with anything.
 */
export function millisecondsFor<T extends MillisecondsRow>(
    entries: readonly T[],
    mode: MillisecondsMode,
    clock: (entry: T) => number | null,
    key: (entry: T, index: number) => string = millisecondsKey,
): Set<string> {
    if (mode === 'never') return new Set();
    if (mode === 'always') {
        return new Set(entries.map((e, i) => key(e, i)));
    }

    const seconds = entries.map((e) => {
        const ms = clock(e);
        return ms == null || !Number.isFinite(ms)
            ? null
            : Math.floor(Math.round(ms) / 1000);
    });
    const counts = new Map<number, number>();
    for (const s of seconds) {
        if (s != null) counts.set(s, (counts.get(s) ?? 0) + 1);
    }

    const out = new Set<string>();
    entries.forEach((entry, i) => {
        const s = seconds[i];
        if (s != null && (counts.get(s) ?? 0) > 1) out.add(key(entry, i));
    });
    return out;
}

/** A payload's precision field, or undefined when it says nothing readable. */
export function asMillisecondsMode(
    value: unknown,
): MillisecondsMode | undefined {
    return value === 'always' || value === 'never' || value === 'tied'
        ? value
        : undefined;
}

/** What each setting is called wherever one is shown or chosen. */
export const MILLISECONDS_MODE_LABEL: Record<MillisecondsMode, string> = {
    always: 'Always',
    never: 'Never',
    tied: 'Only to break ties',
};

export const MILLISECONDS_MODE_OPTIONS: {
    value: MillisecondsMode;
    label: string;
}[] = [
    { value: 'always', label: MILLISECONDS_MODE_LABEL.always },
    { value: 'never', label: MILLISECONDS_MODE_LABEL.never },
    { value: 'tied', label: MILLISECONDS_MODE_LABEL.tied },
];

/** The one line that explains the middle setting, wherever it is offered. */
export const MILLISECONDS_MODE_HINT =
    'Times are rounded to the second unless two runs share the same second.';
