'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { XLg } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { useSession } from '~src/components/session-provider';
import styles from './styles/policy-notice.module.scss';

const IMPORT_PATH = '/settings/import';
const STORAGE_KEY = 'src-import-notice-dismissed';

export function SrcImportNotice() {
    const { username } = useSession();
    const pathname = usePathname();
    // Start hidden so server and first client render agree; local storage is
    // only readable after mount.
    const [dismissed, setDismissed] = useState(true);

    useEffect(() => {
        try {
            setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
        } catch {
            setDismissed(false);
        }
    }, []);

    const dismiss = () => {
        setDismissed(true);
        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // Nothing to do; the notice returns next visit.
        }
    };

    if (!username || dismissed || pathname === IMPORT_PATH) return null;

    return (
        <div className={styles.notice} role="status">
            <p className={styles.text}>
                Due to speedrun.com's recent terms of use changes, we are not
                allowed to import your data from speedrun.com automatically. To
                import all your runs from speedrun.com to therun,{' '}
                <Link href={IMPORT_PATH}>click here</Link>.
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
