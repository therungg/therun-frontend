'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadWaitingOnYouAction } from '~src/actions/pb-submission.action';
import Link from '~src/components/link';
import { useSession } from '~src/components/session-provider';
import styles from './sections.module.scss';

export function ProfileSubnav({
    name,
    guest,
}: {
    name: string;
    guest: boolean;
}) {
    const pathname = usePathname() ?? '';
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
    const { username } = useSession();
    const own = !guest && username?.toLowerCase() === name.toLowerCase();
    // What is waiting on the runner, counted beside their own Submissions tab.
    const [waiting, setWaiting] = useState<number | null>(null);
    useEffect(() => {
        if (!own) return;
        let live = true;
        loadWaitingOnYouAction(name)
            .then((res) => {
                if (live && res.ok) setWaiting(res.runs.length);
            })
            .catch(() => undefined);
        return () => {
            live = false;
        };
    }, [own, name, pathname]);
    const tabs = own
        ? [
              ...items,
              {
                  label: 'Submissions',
                  href: `${base}/submissions`,
                  segment: 'submissions',
              },
          ]
        : items;
    const current = pathname.split('/')[2] ?? '';
    return (
        <nav className={styles.nav} aria-label="Profile sections">
            {tabs.map((item) => {
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
                        {item.segment === 'submissions' && waiting ? (
                            <span className={styles.navCount}>{waiting}</span>
                        ) : null}
                    </Link>
                );
            })}
        </nav>
    );
}
