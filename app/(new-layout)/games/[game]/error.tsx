'use client';

import { ExclamationTriangle } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import styles from './error.module.scss';

interface Props {
    error: Error & { digest?: string };
    reset: () => void;
}

// Route-level error boundary for [game] — a render error anywhere under
// this segment lands here instead of ejecting the shared layout. Static
// markup aside from the mandated 'use client' + reset().
export default function GameError({ reset }: Props) {
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
                    <Link href="/games" className={styles.quiet}>
                        Back to games
                    </Link>
                </div>
            </div>
        </div>
    );
}
