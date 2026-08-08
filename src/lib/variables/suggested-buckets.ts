import type { VariableValueCount } from '~src/lib/leaderboard-variables';
import { normalizeVariableName } from './keys';

/**
 * A candidate option bucket built from observed submitted values, ready to
 * pre-fill a variable's option list. `aliases` is every raw spelling that folds
 * into this bucket, canonical first — the same `[display, ...aliases]` shape the
 * backend stores, so historical runs in any of these spellings resolve here.
 */
export interface CandidateBucket {
    /** Canonical display value — the highest-count raw spelling. */
    label: string;
    /** All raw spellings in this bucket, canonical first. */
    aliases: string[];
    /** Representative distinct-runner count (max across the folded spellings). */
    count: number;
}

/**
 * Group observed values into candidate buckets. Spellings that normalize to the
 * same key ("Nintendo 64" / "nintendo64") auto-collapse into one bucket —
 * canonical = the highest-count spelling, the rest become aliases. Spellings
 * that mean the same thing but normalize differently ("N64" → `n64`) stay
 * separate; `mergeBuckets` folds those on the moderator's say-so.
 *
 * Blank submissions are dropped — an empty string is not an option.
 */
export function bucketsFromValues(
    values: VariableValueCount[],
): CandidateBucket[] {
    const byNorm = new Map<string, VariableValueCount[]>();
    for (const v of values) {
        const key = normalizeVariableName(v.value);
        if (!key) continue;
        const list = byNorm.get(key);
        if (list) list.push(v);
        else byNorm.set(key, [v]);
    }
    const buckets: CandidateBucket[] = [];
    for (const group of byNorm.values()) {
        const sorted = [...group].sort((a, b) => b.count - a.count);
        buckets.push({
            label: sorted[0].value,
            aliases: sorted.map((v) => v.value),
            count: sorted[0].count,
        });
    }
    return buckets.sort((a, b) => b.count - a.count);
}

/**
 * Fold `sourceLabel`'s bucket into `targetLabel`'s — the moderator declaring
 * them the same thing (e.g. "N64" → "Nintendo 64"). The target keeps its label;
 * the source's spellings join its aliases and their counts sum, so the merge is
 * visible in the number (a slight over-count if a runner used both spellings,
 * which is fine for a discovery hint). The result is re-sorted by count so the
 * grown bucket keeps its rank. Returns a new list.
 */
export function mergeBuckets(
    buckets: CandidateBucket[],
    sourceLabel: string,
    targetLabel: string,
): CandidateBucket[] {
    if (sourceLabel === targetLabel) return buckets;
    const source = buckets.find((b) => b.label === sourceLabel);
    const target = buckets.find((b) => b.label === targetLabel);
    if (!source || !target) return buckets;
    return buckets
        .filter((b) => b.label !== sourceLabel)
        .map((b) =>
            b.label === targetLabel
                ? {
                      ...b,
                      aliases: [...b.aliases, ...source.aliases],
                      count: b.count + source.count,
                  }
                : b,
        )
        .sort((a, b) => b.count - a.count);
}

/**
 * The backend's `values` shape: one `[display, ...aliases]` array per bucket.
 * Aliases already lead with the canonical spelling, so each bucket's `aliases`
 * is exactly that array.
 */
export function bucketsToValueGroups(buckets: CandidateBucket[]): string[][] {
    return buckets.map((b) => b.aliases);
}
