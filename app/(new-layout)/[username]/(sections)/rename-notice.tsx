import { getSession } from '~src/actions/session.action';
import styles from './sections.module.scss';

/**
 * Shown only to the runner themself, only while their own rename is still
 * moving their splits, summary and search entry over in the background.
 * `usernameChangePending` rides the head fetch's own cache lifetime — see
 * getRunnerProfileHead in src/lib/runner-profile.ts.
 */
export async function RenameNotice({
    name,
    pending,
}: {
    name: string;
    pending?: boolean;
}) {
    if (!pending) return null;
    const session = await getSession();
    if (session.username?.toLowerCase() !== name.toLowerCase()) return null;
    return (
        <p className={styles.renameNotice}>
            Your history is still moving to your new name. Splits, your summary
            and search will catch up on their own.
        </p>
    );
}
