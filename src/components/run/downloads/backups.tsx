'use client';

import { Lock } from 'react-bootstrap-icons';
import type { BackupVersionsResponse } from 'types/backups.types';
import Link from '~src/components/link';
import { DailyList } from './daily-list';
import styles from './downloads.module.scss';
import { RecentList } from './recent-list';

type BackupsState =
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse }
    | { status: 'empty' }
    | { status: 'error' };

interface BackupsProps {
    state: BackupsState;
    filenameBase: string;
    onRetry: () => void;
}

function PaywallBanner() {
    return (
        <div className={styles.paywallBanner}>
            <div className={styles.paywallIcon} aria-hidden="true">
                <Lock size={18} />
            </div>
            <div className={styles.paywallBody}>
                <div className={styles.paywallTitle}>
                    Downloads are a supporter feature
                </div>
                <p className={styles.paywallCopy}>
                    Cloud backups cost therun.gg money to keep around. Become a
                    supporter to unlock downloads.
                </p>
            </div>
            <Link
                href="/support"
                className={`btn btn-primary ${styles.paywallCta}`}
            >
                Support therun.gg
            </Link>
        </div>
    );
}

export function Backups({ state, filenameBase, onRetry }: BackupsProps) {
    return (
        <section>
            <h3 className={styles.sectionLabel}>Backups</h3>

            {state.status === 'loading' && (
                <div className={styles.loadingState}>Loading backups…</div>
            )}

            {state.status === 'error' && (
                <div className={styles.errorState}>
                    <p className={styles.errorMessage}>
                        Couldn't load backups.
                    </p>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onRetry}
                    >
                        Retry
                    </button>
                </div>
            )}

            {state.status === 'empty' && (
                <div className={styles.emptyCard}>
                    <div className={styles.emptyCardTitle}>
                        No backups for this run yet
                    </div>
                    <p className={styles.emptyCardCopy}>
                        Supporters get automatic cloud backups on every upload —
                        one per upload for the past 5, plus a daily snapshot.
                    </p>
                    <Link href="/support" className="btn btn-primary">
                        Support therun.gg
                    </Link>
                </div>
            )}

            {state.status === 'loaded' && (
                <>
                    {!state.data.canDownload && <PaywallBanner />}
                    <RecentList
                        entries={state.data.recent}
                        filenameBase={filenameBase}
                    />
                    <DailyList
                        entries={state.data.daily}
                        filenameBase={filenameBase}
                    />
                </>
            )}
        </section>
    );
}
