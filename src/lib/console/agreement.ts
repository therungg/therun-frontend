// "Does this board agree with itself?" — the one fact the old console could
// never show, because it only ever rendered one category at a time.

/**
 * The most common value, or null when the list is empty or the top two tie.
 * A tie means there is no consensus, and therefore no odd one out to mark.
 * Values are keyed by JSON so null, numbers and strings compare structurally.
 */
export function modalValue<T>(values: T[]): { value: T; count: number } | null {
    if (values.length === 0) return null;

    const counts = new Map<string, { value: T; count: number }>();
    for (const value of values) {
        const key = JSON.stringify(value ?? null);
        const entry = counts.get(key);
        if (entry) entry.count += 1;
        else counts.set(key, { value, count: 1 });
    }

    const ranked = [...counts.values()].sort((a, b) => b.count - a.count);
    if (ranked.length > 1 && ranked[0].count === ranked[1].count) return null;
    return ranked[0];
}

/** Ids whose value differs from the consensus. Empty when there is none. */
export function differingIds<T>(
    rows: Array<{ id: number; value: T }>,
): Set<number> {
    const modal = modalValue(rows.map((r) => r.value));
    if (!modal) return new Set();
    const modalKey = JSON.stringify(modal.value ?? null);
    return new Set(
        rows
            .filter((r) => JSON.stringify(r.value ?? null) !== modalKey)
            .map((r) => r.id),
    );
}
