'use client';

import { useEffect, useState } from 'react';
import Link from '~src/components/link';
import styles from './leaderboards-profile.module.scss';

interface LiveRun {
    user: string;
    game: string;
    category: string;
}

export function LiveStrip({ username }: { username: string }) {
    const [live, setLive] = useState<LiveRun | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch(
                    `/api/live/${encodeURIComponent(username)}`,
                );
                if (!res.ok) return;
                const body = (await res.json()) as LiveRun | null;
                if (!cancelled) setLive(body && body.game ? body : null);
            } catch {
                // A failed poll leaves the strip as it was.
            }
        };
        load();
        const timer = setInterval(load, 30_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [username]);

    if (!live) return null;
    return (
        <Link
            href={`/live/${encodeURIComponent(username)}`}
            className={styles.live}
        >
            <span className={styles.liveDot} aria-hidden />
            <span>
                Live now — {live.game} · {live.category}
            </span>
        </Link>
    );
}
