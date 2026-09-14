'use client';

import { usePathname } from 'next/navigation';
import Link from '~src/components/link';
import styles from './sections.module.scss';

export function ProfileSubnav({
    name,
    guest,
}: {
    name: string;
    guest: boolean;
}) {
    const pathname = decodeURIComponent(usePathname() ?? '');
    const base = `/${encodeURIComponent(name)}`;
    const items = guest
        ? [
              {
                  label: 'Leaderboards',
                  href: `${base}/leaderboards`,
                  segment: 'leaderboards',
              },
          ]
        : [
              { label: 'Overview', href: base, segment: '' },
              {
                  label: 'Leaderboards',
                  href: `${base}/leaderboards`,
                  segment: 'leaderboards',
              },
              { label: 'Stats', href: `${base}/stats`, segment: 'stats' },
              {
                  label: 'Activity',
                  href: `${base}/activity`,
                  segment: 'activity',
              },
              { label: 'Races', href: `${base}/races`, segment: 'races' },
              { label: 'Splits', href: `${base}/splits`, segment: 'splits' },
          ];
    const current = pathname.split('/')[2] ?? '';
    return (
        <nav className={styles.nav} aria-label="Profile sections">
            {items.map((item) => {
                const active = item.segment === current;
                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={
                            active
                                ? `${styles.navLink} ${styles.navLinkActive}`
                                : styles.navLink
                        }
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
