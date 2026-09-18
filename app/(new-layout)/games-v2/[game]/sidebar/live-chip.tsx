'use client';

import useSWR from 'swr';
import type { LiveRun } from '~app/(new-layout)/live/live.types';
import { fetcher } from '~src/utils/fetcher';
import styles from './sidebar.module.scss';

/**
 * The collapsed form of the Live panel, for the Recent PBs panel head.
 *
 * Nobody is live for most games most of the time, and the full panel spent
 * that whole time rendering a heading and one sentence at the very top of
 * the rail — the first thing on the page was an empty box. LivePanel now
 * renders only when somebody is actually live; this chip carries the empty
 * fact in a heading's worth of space.
 *
 * Deliberately the same SWR key as LivePanel: SWR dedupes, so the two
 * components share one request.
 */
export function LiveStatusChip({ gameDisplay }: { gameDisplay: string }) {
    const { data } = useSWR<LiveRun[]>(
        `/api/live?game=${encodeURIComponent(gameDisplay)}`,
        fetcher,
    );
    // Nothing until the count is known — a chip that appears, says "nobody",
    // then swaps to a live count reads as a glitch.
    if (data === undefined || data.length > 0) return null;
    return <span className={styles.liveChip}>Nobody live</span>;
}
