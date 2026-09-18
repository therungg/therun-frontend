/** A successfully resolved + summarized hub row. */
export interface HubRowOk {
    kind: 'ok';
    slug: string;
    display: string;
    image: string | null;
    count: number;
    degraded: boolean;
}

/**
 * A row whose load rejected (resolveGame or the summary fetch threw
 * something other than a clean 404) — distinct from absence (a 404 means
 * the game is gone and the row is dropped entirely, see `settleHubRow`).
 * Rendered with just the raw slug and a "couldn't load" badge; the game's
 * own console link may still work, so it's kept.
 */
export interface HubRowFailed {
    kind: 'failed';
    slug: string;
}

export type HubRow = HubRowOk | HubRowFailed;

/**
 * Maps one row's settled load outcome to a render-ready `HubRow`, or `null`
 * to drop the row entirely. Fulfilled-with-null means `resolveGame` hit a
 * clean 404 (the game is gone) — that's absence, so it's dropped silently.
 * A rejection means something failed transiently — that's degradation, so
 * it renders as a `HubRowFailed` rather than sinking the whole hub (see
 * `loadHubRows` in page.tsx, which awaits each batch with
 * `Promise.allSettled` and maps every result through this function).
 */
export function settleHubRow(
    slug: string,
    result: PromiseSettledResult<HubRowOk | null>,
): HubRow | null {
    if (result.status === 'fulfilled') return result.value;
    return { kind: 'failed', slug };
}

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
