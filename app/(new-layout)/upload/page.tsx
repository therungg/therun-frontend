import { Metadata } from 'next';
import { getSession } from '~src/actions/session.action';
import { Dragdrop } from '~src/components/Dragdrop/Dragdrop';
import Link from '~src/components/link';
import styles from './upload.module.scss';

export const metadata: Metadata = {
    title: 'Upload',
    description: 'Upload your splits',
};

export default async function Upload() {
    const session = await getSession();
    if (!session.id) {
        return (
            <div className={styles.page}>
                <div className={styles.loginRequired}>
                    <h1>Upload Splits</h1>
                    <p>
                        You need to be logged in to upload splits. Please log in
                        with Twitch in the topbar.
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Upload Splits</h1>
                <p className={styles.subtitle}>
                    Upload your .lss file to import runs and stats
                </p>
            </div>

            <div className={styles.infoCard}>
                <div className={styles.infoIcon}>💡</div>
                <div>
                    Install the{' '}
                    <Link href="/livesplit">LiveSplit component</Link> and you
                    will never have to upload manually again. Your runs will
                    sync automatically.
                </div>
            </div>

            <Dragdrop sessionId={session.id} username={session.username} />
        </div>
    );
}
