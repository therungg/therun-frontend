'use client';

import { ExclamationTriangle } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import styles from './error.module.scss';

interface Props {
    error: Error & { digest?: string };
    reset: () => void;
}

// Route-level error boundary for /games-v2/manage — a render error anywhere
// under this segment (e.g. a rejection that slips past loadHubRows' own
// per-row Promise.allSettled handling) lands here instead of bubbling to
// global-error. Mirrors [game]/error.tsx's conventions.
export default function ManageHubError({ reset }: Props) {
    return (
        <div className={styles.wrap}>
            <div className={styles.panel}>
                <ExclamationTriangle
                    size={28}
                    className={styles.icon}
                    aria-hidden
                />
                <h1 className={styles.title}>
                    Something went wrong loading this page.
                </h1>
                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.retry}
                        onClick={() => reset()}
                    >
                        Try again
                    </button>
                    <Link href="/" className={styles.quiet}>
                        Back to therun.gg
                    </Link>
                </div>
            </div>
        </div>
    );
}
