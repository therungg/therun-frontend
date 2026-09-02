'use client';

import { useEffect, useState } from 'react';
import { XLg } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import styles from './styles/policy-notice.module.scss';

// Bump this when the terms or privacy policy change materially. Anyone who
// dismissed an older version sees the notice again. GDPR and Dutch consumer
// law both want a visible heads-up for material changes; a silent republish
// does not bind existing users to new clauses (user-content licence, the
// speedrun.com import clause, moderation rules).
export const POLICY_VERSION = '2026-09-02';

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
        <div className={styles.notice} role="status">
            <p className={styles.text}>
                We updated our <Link href="/terms">terms</Link> and{' '}
                <Link href="/privacy-policy">privacy policy</Link> on 2
                September 2026. They now cover run imports, user content and
                moderation. By continuing to use the site you agree to them.
            </p>
            <button
                type="button"
                className={styles.dismiss}
                onClick={dismiss}
                aria-label="Dismiss"
            >
                <XLg size={14} aria-hidden />
            </button>
        </div>
    );
}
