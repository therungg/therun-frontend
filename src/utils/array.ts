export const includesCaseInsensitive = (
    haystack: string[],
    needle: string,
): boolean => {
    return haystack
        .map((entry) => entry.toLowerCase().trim())
        .includes(needle.toLowerCase().trim());
};

export const arrayToMap = <T, K extends keyof T>(
    arr: T[],
    key: K,
): Map<T[K], T> => {
    return new Map(arr.map((i) => [i[key], i]));
};

/**
 * Runs `fn` over `items` with at most `concurrency` calls in flight, keeping
 * the results in input order.
 *
 * Use this instead of `Promise.all(items.map(fn))` whenever `fn` hits the
 * backend once per item and the list is unbounded: a 293-wide fan-out from
 * the sitemap opened ~280 API Lambda containers in a single second, and each
 * one takes its own Postgres connection off the pooler.
 */
export const mapWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
    const results = new Array<R>(items.length);
    let next = 0;

    const worker = async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index], index);
        }
    };

    const workers = Array.from(
        { length: Math.max(1, Math.min(concurrency, items.length)) },
        worker,
    );

    await Promise.all(workers);

    return results;
};
