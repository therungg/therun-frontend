import Link from 'next/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import styles from './tournament-form.module.scss';

export function PermissionDenied({
    reason,
    tournamentName,
    tournamentHref,
    needsLogin,
}: {
    reason: string;
    tournamentName?: string;
    tournamentHref: string;
    needsLogin?: boolean;
}) {
    return (
        <div className="container py-4" style={{ maxWidth: '720px' }}>
            <Link href={tournamentHref} className={styles.breadcrumb}>
                <span className={styles.breadcrumbArrow}>←</span>
                Back to {tournamentName ?? 'tournament'}
            </Link>
            <div className={styles.hero}>
                <span className={styles.heroEyebrow}>● Restricted</span>
                <h1 className={styles.heroTitle}>
                    {needsLogin ? 'Sign in to continue' : 'No permission'}
                </h1>
                <p className={styles.heroSubtitle}>{reason}</p>
            </div>
            <div className={styles.actions}>
                <span className={styles.actionsHint}>
                    {needsLogin
                        ? 'You need a signed-in session to access this page.'
                        : 'Ask a tournament admin to grant you the required capability.'}
                </span>
                {needsLogin ? (
                    <TwitchLoginButton url={tournamentHref} />
                ) : (
                    <Link
                        href={tournamentHref}
                        className={styles.primaryButton}
                    >
                        Back to tournament
                    </Link>
                )}
            </div>
        </div>
    );
}
