'use client';

import {
    ArrowClockwise,
    CalendarCheck,
    CheckCircleFill,
    CloudArrowDown,
    Infinity as InfinityIcon,
    Lock,
} from 'react-bootstrap-icons';
import type { BackupVersionsResponse } from 'types/backups.types';
import Link from '~src/components/link';
import { DailyList } from './daily-list';
import styles from './downloads.module.scss';
import { RecentList } from './recent-list';
import { SectionHeader } from './section-header';

type BackupsState =
    | { status: 'loading' }
    | { status: 'loaded'; data: BackupVersionsResponse }
    | {
          status: 'empty';
          viewerIsSupporter: boolean;
          viewerIsOwner: boolean;
      }
    | { status: 'error' };

interface BackupsProps {
    state: BackupsState;
    filenameBase: string;
    onRetry: () => void;
}

function PaywallBanner({ viewerIsOwner }: { viewerIsOwner: boolean }) {
    return (
        <div className={styles.paywallCard}>
            <div className={styles.paywallHeader}>
                <div className={styles.paywallIcon} aria-hidden="true">
                    <Lock size={18} />
                </div>
                <div className={styles.paywallHeaderBody}>
                    <div className={styles.paywallTitle}>
                        {viewerIsOwner
                            ? 'Unlock cloud backups of your splits'
                            : 'Downloading backups is a supporter feature'}
                    </div>
                    <p className={styles.paywallCopy}>
                        Every time you upload splits to therun.gg, we can keep a
                        versioned copy in the cloud. Supporters can restore any
                        of them with one click.
                    </p>
                </div>
            </div>

            <ul className={styles.tierList}>
                <li className={styles.tierRow}>
                    <span className={styles.tierName}>Tier 1</span>
                    <span className={styles.tierDesc}>
                        Last 5 uploads + daily snapshots kept{' '}
                        <strong>90 days</strong>
                    </span>
                </li>
                <li className={styles.tierRow}>
                    <span className={styles.tierName}>Tier 2</span>
                    <span className={styles.tierDesc}>
                        Last 5 uploads + daily snapshots kept{' '}
                        <strong>180 days</strong>
                    </span>
                </li>
                <li className={`${styles.tierRow} ${styles.tierRowHighlight}`}>
                    <span className={styles.tierName}>Tier 3</span>
                    <span className={styles.tierDesc}>
                        Last 5 uploads + daily snapshots kept{' '}
                        <strong>forever</strong>
                    </span>
                </li>
            </ul>

            <div className={styles.paywallFoot}>
                <span className={styles.paywallFootNote}>
                    Cloud storage isn't free — supporting therun.gg is what
                    keeps these backups around.
                </span>
                <Link
                    href="/support"
                    className={`btn btn-primary ${styles.paywallCta}`}
                >
                    Become a supporter
                </Link>
            </div>
        </div>
    );
}

interface DailyRetention {
    badge: string;
    headline: string;
    body: string;
    forever: boolean;
}

function describeDailyRetention(
    ownerTier: number | null,
    ownerRetentionDays: number | null,
): DailyRetention {
    if (ownerRetentionDays === null && ownerTier !== null && ownerTier >= 3) {
        return {
            badge: 'Tier 3 · kept forever',
            headline: 'Indefinite retention',
            body: 'As a Tier 3 supporter, every daily snapshot of this run stays in the cloud indefinitely — no expiry, no cleanup.',
            forever: true,
        };
    }
    if (ownerRetentionDays && ownerRetentionDays > 0) {
        const tierLabel =
            ownerTier && ownerTier > 0 ? `Tier ${ownerTier} · ` : '';
        return {
            badge: `${tierLabel}kept ${ownerRetentionDays} days`,
            headline: `Kept ${ownerRetentionDays} days from upload`,
            body: `Each new upload stamps that day's snapshot with an expiry ${ownerRetentionDays} days out. Older snapshots delete themselves automatically.`,
            forever: false,
        };
    }
    return {
        badge: 'Daily snapshots',
        headline: 'One snapshot per UTC day',
        body: 'Overwritten on each new upload that day.',
        forever: false,
    };
}

function EmptyBackups({
    viewerIsOwner,
    viewerIsSupporter,
}: {
    viewerIsOwner: boolean;
    viewerIsSupporter: boolean;
}) {
    if (viewerIsOwner) {
        if (viewerIsSupporter) {
            return (
                <div className={styles.emptyCard}>
                    <div className={styles.emptyCardTitle}>
                        No cloud backups for this run yet
                    </div>
                    <p className={styles.emptyCardCopy}>
                        Your next upload of this run will be saved to the cloud
                        automatically.
                    </p>
                </div>
            );
        }
        return (
            <div className={styles.emptyCard}>
                <div className={styles.emptyCardTitle}>
                    Cloud backups aren't enabled for your uploads
                </div>
                <p className={styles.emptyCardCopy}>
                    Cloud backups are a supporter feature. Upgrade and every
                    upload to this run will be saved automatically — the last 5
                    uploads, plus one snapshot per day.
                </p>
                <Link href="/support" className="btn btn-primary">
                    See supporter tiers
                </Link>
            </div>
        );
    }

    // Viewing someone else's run with no backups. No upsell CTA — the viewer
    // subscribing wouldn't create backups for this run, only the owner can.
    return (
        <div className={styles.emptyCard}>
            <div className={styles.emptyCardTitle}>
                No cloud backups for this run
            </div>
            <p className={styles.emptyCardCopy}>
                Cloud backups are a supporter feature — this run's owner would
                need to support therun.gg for backups of their uploads to be
                kept.
            </p>
        </div>
    );
}

export function Backups({ state, filenameBase, onRetry }: BackupsProps) {
    return (
        <section className={styles.section}>
            <SectionHeader
                icon={<CloudArrowDown size={28} />}
                kicker="Version history"
                title="Cloud backups"
                subtitle="Automatic versioned copies of every upload — restore any one with a click."
                tone="accent"
            />

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
                <EmptyBackups
                    viewerIsOwner={state.viewerIsOwner}
                    viewerIsSupporter={state.viewerIsSupporter}
                />
            )}

            {state.status === 'loaded' && (
                <>
                    {!state.data.canDownload && (
                        <PaywallBanner
                            viewerIsOwner={state.data.viewerIsOwner}
                        />
                    )}

                    <LoadedBackups
                        data={state.data}
                        filenameBase={filenameBase}
                    />
                </>
            )}
        </section>
    );
}

function LoadedBackups({
    data,
    filenameBase,
}: {
    data: BackupVersionsResponse;
    filenameBase: string;
}) {
    const daily = describeDailyRetention(
        data.ownerTier,
        data.ownerRetentionDays,
    );

    const recentCount = data.recent.length;
    const dailyCount = data.daily.length;

    return (
        <div className={styles.backupsGrid}>
            <article className={styles.backupColumn}>
                <header className={styles.backupColumnHeader}>
                    <div className={styles.backupColumnIcon} aria-hidden="true">
                        <ArrowClockwise size={18} />
                    </div>
                    <div className={styles.backupColumnHeadBody}>
                        <div className={styles.backupColumnKicker}>
                            Rolling last 5
                        </div>
                        <h4 className={styles.backupColumnTitle}>
                            Recent uploads
                        </h4>
                        <p className={styles.backupColumnSubtitle}>
                            A snapshot of every upload, keeping the five latest.
                            Oldest drops off as a new one comes in — use these
                            to undo the last few saves.
                        </p>
                    </div>
                </header>

                <div className={styles.backupColumnMeta}>
                    <span className={styles.metaPill}>
                        <CheckCircleFill size={11} aria-hidden="true" />
                        {data.canDownload
                            ? 'Always available'
                            : 'Unlocks with supporter'}
                    </span>
                    <span className={styles.metaCount}>
                        {recentCount}{' '}
                        {recentCount === 1 ? 'snapshot' : 'snapshots'}
                    </span>
                </div>

                <div className={styles.backupColumnBody}>
                    <RecentList
                        entries={data.recent}
                        filenameBase={filenameBase}
                    />
                </div>
            </article>

            <article
                className={`${styles.backupColumn} ${
                    daily.forever ? styles.backupColumnHighlight : ''
                }`}
            >
                <header className={styles.backupColumnHeader}>
                    <div className={styles.backupColumnIcon} aria-hidden="true">
                        {daily.forever ? (
                            <InfinityIcon size={20} />
                        ) : (
                            <CalendarCheck size={18} />
                        )}
                    </div>
                    <div className={styles.backupColumnHeadBody}>
                        <div className={styles.backupColumnKicker}>
                            {daily.badge}
                        </div>
                        <h4 className={styles.backupColumnTitle}>
                            Daily snapshots
                        </h4>
                        <p className={styles.backupColumnSubtitle}>
                            One snapshot per UTC day, overwritten on each new
                            upload that day. {daily.body}
                        </p>
                    </div>
                </header>

                <div className={styles.backupColumnMeta}>
                    <span
                        className={`${styles.metaPill} ${
                            daily.forever ? styles.metaPillStrong : ''
                        }`}
                    >
                        {daily.forever ? (
                            <InfinityIcon size={12} aria-hidden="true" />
                        ) : (
                            <CheckCircleFill size={11} aria-hidden="true" />
                        )}
                        {daily.headline}
                    </span>
                    <span className={styles.metaCount}>
                        {dailyCount}{' '}
                        {dailyCount === 1 ? 'snapshot' : 'snapshots'}
                    </span>
                </div>

                <div className={styles.backupColumnBody}>
                    <DailyList
                        entries={data.daily}
                        filenameBase={filenameBase}
                    />
                </div>
            </article>
        </div>
    );
}
