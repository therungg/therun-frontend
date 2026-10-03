'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { runIdForManualTimeAction } from '../actions/load-mod-run-view.action';

/** The run a review modal is open on. */
export type ReviewTarget = { kind: 'run'; id: number };

function parseId(value: string | null): number | null {
    if (value == null || !/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function writeRunParam(runId: number | null) {
    const url = new URL(window.location.href);
    url.searchParams.delete('run');
    url.searchParams.delete('manual');
    if (runId != null) url.searchParams.set('run', String(runId));
    window.history.replaceState(null, '', url.toString());
}

/**
 * The review target in the URL: `?run=<id>`. The setter rewrites the query in
 * place with `history.replaceState`, which Next keeps `useSearchParams` in
 * step with, without refetching the page or adding a history entry.
 *
 * An old link's `?manual=<id>` is swapped for the `?run=` of the run that
 * manual time became, or dropped when it maps to none.
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
    const manualId = runId == null ? parseId(params.get('manual')) : null;
    const target: ReviewTarget | null =
        runId != null ? { kind: 'run', id: runId } : null;

    useEffect(() => {
        if (manualId == null) return;
        let live = true;
        runIdForManualTimeAction(manualId)
            .catch(() => null)
            .then((mapped) => {
                if (live) writeRunParam(mapped);
            });
        return () => {
            live = false;
        };
    }, [manualId]);

    const setTarget = (next: ReviewTarget | null) =>
        writeRunParam(next?.id ?? null);

    return [target, setTarget];
}
