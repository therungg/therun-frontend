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
    const pathname = usePathname() ?? '';
    // The profile answers at two shapes — `/<name>` and `/users/<name>` — so
    // the tabs follow whichever one the visitor is on instead of throwing
    // them back to the root form, which a game may have taken.
    const underUsers = pathname.startsWith('/users/');
    const base = underUsers
        ? `/users/${encodeURIComponent(name)}`
        : `/${encodeURIComponent(name)}`;
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
              { label: 'Runs', href: `${base}/stats`, segment: 'stats' },
              {
                  label: 'Activity',
                  href: `${base}/activity`,
                  segment: 'activity',
              },
              { label: 'Races', href: `${base}/races`, segment: 'races' },
              {
                  label: 'Downloads',
                  href: `${base}/splits`,
                  segment: 'splits',
              },
          ];
    // The segment after the name: index 2 at the root, 3 under /users.
    const current = pathname.split('/')[underUsers ? 3 : 2] ?? '';
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
