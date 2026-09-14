'use client';

import { useEffect, useState } from 'react';

function clock(timezone: string): string | null {
    try {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone,
        }).format(new Date());
    } catch {
        return null;
    }
}

/** "Amsterdam" from "Europe/Amsterdam"; "Buenos Aires" from "America/Argentina/Buenos_Aires". */
function place(timezone: string): string {
    return (timezone.split('/').pop() ?? timezone).replace(/_/g, ' ');
}

/**
 * The runner's own clock. The server can't know the time the page is read,
 * so the place renders first and the time joins it once mounted.
 */
export function LocalTime({ timezone }: { timezone: string }) {
    const [time, setTime] = useState<string | null>(null);

    useEffect(() => {
        const tick = () => setTime(clock(timezone));
        tick();
        const id = window.setInterval(tick, 30_000);
        return () => window.clearInterval(id);
    }, [timezone]);

    return (
        <span title={timezone}>
            {time ? `${time} in ${place(timezone)}` : `${place(timezone)} time`}
        </span>
    );
}
