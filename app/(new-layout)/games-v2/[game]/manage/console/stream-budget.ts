/** How long a streamed source gets before the console gives up on it. */
export const STREAM_BUDGET_MS = 8_000;

/**
 * Start a call the page hands to the console unresolved, and guarantee it
 * settles: any throw (synchronous or not) and anything slower than the budget
 * comes back as `fallback` instead.
 *
 * Two things depend on this. The promise must never reject, because no one
 * awaits it on the server. And it must finish, because the stream stays open
 * until it does — a worklist that takes 37 seconds on a big board would
 * otherwise sit against the route's `maxDuration` with the skeleton still
 * spinning, instead of showing its "didn't load" state.
 */
export function streamWithin<T>(
    call: () => Promise<T>,
    fallback: T,
    budgetMs: number = STREAM_BUDGET_MS,
): Promise<T> {
    return new Promise<T>((resolve) => {
        const timer = setTimeout(() => resolve(fallback), budgetMs);
        const settle = (value: T) => {
            clearTimeout(timer);
            resolve(value);
        };
        Promise.resolve()
            .then(call)
            .then(settle, () => settle(fallback));
    });
}
