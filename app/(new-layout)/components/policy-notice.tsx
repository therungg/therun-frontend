'use client';

import { useEffect, useState } from 'react';
import { XLg } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import {
    OPEN_DATA_LICENCE_DATE,
    OPEN_DATA_LICENCE_START,
} from './open-data-licence';
import styles from './styles/policy-notice.module.scss';

export const POLICY_VERSION = OPEN_DATA_LICENCE_START.slice(0, 10);

const STORAGE_KEY = 'policy-notice-dismissed';

export function PolicyNotice() {
    // Start hidden so server and first client render agree; local storage is
    // only readable after mount.
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(STORAGE_KEY) !== POLICY_VERSION) {
                setVisible(true);
            }
        } catch {
            // Storage blocked (private mode, hardened browser): show it; the
            // dismiss just won't stick, which is the least-wrong outcome.
            setVisible(true);
        }
    }, []);

    const dismiss = () => {
        setVisible(false);
        try {
            window.localStorage.setItem(STORAGE_KEY, POLICY_VERSION);
        } catch {
            // Nothing to do; the notice returns next visit.
        }
    };

    if (!visible) return null;

    return (
        <aside className={styles.notice} aria-label="Policy update">
            <p className={styles.text}>
                Our <Link href="/terms">terms</Link> and{' '}
                <Link href="/privacy-policy">privacy policy</Link> changed on{' '}
                {OPEN_DATA_LICENCE_DATE}. Leaderboard data, your runs included,
                is under CC BY-NC 4.0. In{' '}
                <Link href="/settings/preferences">settings</Link> you can keep
                your name out of exports. Runs from the speedrun.com archive are
                on the site. You can import your own speedrun.com runs in your{' '}
                <Link href="/settings/import">import settings</Link>.
            </p>
            <button
                type="button"
                className={styles.dismiss}
                onClick={dismiss}
                aria-label="Dismiss policy update"
            >
                <XLg size={14} aria-hidden />
            </button>
        </aside>
    );
}
