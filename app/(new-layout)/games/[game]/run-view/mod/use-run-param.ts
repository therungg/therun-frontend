'use client';

import { useSearchParams } from 'next/navigation';

/** The run or manual time a review modal is open on. */
export type ReviewTarget = { kind: 'run' | 'manual'; id: number };

function parseId(value: string | null): number | null {
    if (value == null || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * The review target in the URL: `?run=<id>` or `?manual=<id>` (run wins
 * when both are there). The setter rewrites the query in place with
 * `history.replaceState`, which Next keeps `useSearchParams` in step with,
 * without refetching the page or adding a history entry.
 *
 * Reads `useSearchParams`, so the calling component must sit inside a
 * `<Suspense>` boundary.
 */
export function useRunParam(): [
    ReviewTarget | null,
    (target: ReviewTarget | null) => void,
] {
    const params = useSearchParams();
    const runId = parseId(params.get('run'));
    const manualId = parseId(params.get('manual'));
    const target: ReviewTarget | null =
        runId != null
            ? { kind: 'run', id: runId }
            : manualId != null
              ? { kind: 'manual', id: manualId }
              : null;

    const setTarget = (next: ReviewTarget | null) => {
        const url = new URL(window.location.href);
        url.searchParams.delete('run');
        url.searchParams.delete('manual');
        if (next) url.searchParams.set(next.kind, String(next.id));
        window.history.replaceState(null, '', url.toString());
    };

    return [target, setTarget];
}
