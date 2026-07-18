/**
 * Split items into fixed-size batches, preserving order. Used to bound how
 * many moderated games the hub fans out to the backend at once — each
 * batch is awaited fully before the next starts (see page.tsx).
 */
export function chunk<T>(items: T[], size: number): T[][] {
    if (size <= 0 || items.length === 0) return items.length ? [items] : [];
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

/**
 * Badge text for a hub row's open-items count. `degraded` means one of the
 * three inbox sources failed to load, so `count` may be an undercount —
 * signaled with a trailing "+". At count 0, "0+" would read as a
 * contradiction ("no items, but maybe more"), so a bare "!" renders
 * instead — the same fix applied to the console sidebar's badge.
 */
export function formatCountBadge(count: number, degraded: boolean): string {
    if (!degraded) return String(count);
    return count > 0 ? `${count}+` : '!';
}
