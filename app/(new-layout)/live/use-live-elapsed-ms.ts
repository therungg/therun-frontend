'use client';

import { useEffect, useState } from 'react';
import { LiveRun } from './live.types';

const TICK_MS = 100;
const NETWORK_OFFSET_MS = 400;

export const useLiveElapsedMs = (liveRun: LiveRun): number | null => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);
    if (liveRun.currentTime == null || !liveRun.insertedAt) return null;
    const inserted = new Date(liveRun.insertedAt).getTime();
    if (Number.isNaN(inserted)) return null;
    return (
        liveRun.currentTime + Math.max(0, now - inserted) + NETWORK_OFFSET_MS
    );
};
