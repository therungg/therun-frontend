import { cache } from 'react';
import { apiFetch } from './api-client';

/**
 * `/v1/games/{id}` — the game's whole page payload (game row, categories,
 * groups). Several unrelated loaders read different slices of it, and the
 * manage console used to fetch it more than once in a single render.
 *
 * Memoised per request rather than cached across requests: the console
 * refreshes the route after every write and has to see its own edit, so
 * nothing here may outlive the render that asked for it.
 *
 * Callers keep their own view of the payload — each one declares the slice it
 * reads — so this returns the raw body for them to narrow.
 */
export const loadGamePageData = cache(
    async (gameId: number): Promise<unknown> =>
        apiFetch<unknown>(`/v1/games/${gameId}`),
);
