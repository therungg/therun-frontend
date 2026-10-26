'use client';

import { usePathname } from 'next/navigation';
import Link from '~src/components/link';
import styles from './not-found.module.scss';

export function RequestGameLink() {
    const segments = usePathname().split('/').filter(Boolean);
    if (segments.length !== 2 || segments[0] !== 'games') return null;
    return (
        <Link
            href={`/games?add=${segments[1]}`}
            className={styles.secondaryLink}
        >
            Request this game
        </Link>
    );
}
