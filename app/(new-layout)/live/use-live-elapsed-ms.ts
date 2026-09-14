'use client';

import { useEffect, useState } from 'react';
import { LiveRun } from './live.types';

const TICK_MS = 100;
const NETWORK_OFFSET_MS = 400;

export const useLiveElapsedMs = (liveRun: LiveRun): number | null => {
    // No clock until mounted: the server's HTML (possibly a cached render) and
    // the first browser render must print the same time, so both use the
    // run's own reported time, and ticking starts after hydration.
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);
    if (liveRun.currentTime == null || !liveRun.insertedAt) return null;
    if (now === null) return liveRun.currentTime;
    const inserted = new Date(liveRun.insertedAt).getTime();
    if (Number.isNaN(inserted)) return null;
    return (
        liveRun.currentTime + Math.max(0, now - inserted) + NETWORK_OFFSET_MS
    );
};
