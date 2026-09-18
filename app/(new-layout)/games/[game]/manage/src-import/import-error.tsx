import Link from '~src/components/link';
import styles from './src-import.module.scss';

/**
 * The backend refuses an import from a moderator whose speedrun.com account
 * is not linked yet, and the refusal says only that the identity is not
 * verified — a moderator who has never seen the sync page has no way to know
 * what to do about it. The message keeps the backend's words and adds the one
 * place that fixes it.
 */
const IDENTITY_MARKER = 'identity not verified';

export function ImportError({ error }: { error: string }) {
    const identity = error.toLowerCase().includes(IDENTITY_MARKER);
    return (
        <p className={styles.error}>
            {error}
            {identity && (
                <>
                    {' '}
                    Link your speedrun.com account under{' '}
                    <Link href="/settings/sync">Settings → Run sync</Link>, then
                    try again.
                </>
            )}
        </p>
    );
}
