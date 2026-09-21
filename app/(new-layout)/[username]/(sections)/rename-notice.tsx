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
    from,
}: {
    name: string;
    pending?: boolean;
    /** The name the data is coming from; without it there is nothing to name. */
    from?: string | null;
}) {
    if (!pending || !from) return null;
    const session = await getSession();
    if (session.username?.toLowerCase() !== name.toLowerCase()) return null;
    return (
        <p className={styles.renameNotice}>
            All your data is being transferred from {from} to {name}. This may
            take a bit.
        </p>
    );
}
