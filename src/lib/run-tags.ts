import { safeDecodeURI } from '~src/utils/uri';

/**
 * The tag every cached read of a runner's timer runs carries.
 *
 * Canonicalised — the same runner reached through a route segment, an
 * encoded name or their own session name has to produce one tag, or an owner
 * edit expires nothing. Lives apart from `get-run.ts` because that file is
 * `'use server'` and may only export async functions.
 */
export const userRunsTag = (username: string) =>
    `user-runs:${safeDecodeURI(username).toLowerCase()}`;
