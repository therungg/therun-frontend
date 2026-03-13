import { Metadata } from 'next';
import { getSession } from '~src/actions/session.action';
import { Dragdrop } from '~src/components/Dragdrop/Dragdrop';
import styles from './upload.module.scss';

export const metadata: Metadata = {
    title: 'Upload',
    description: 'Upload your splits',
};

export default async function Upload() {
    const session = await getSession();
    if (!session.id) {
        return (
            <div className={styles.loginRequired}>
                <h1>Oops</h1>
                <p>
                    Sorry, but you need to be logged in to be able to upload
                    splits! Please Login with Twitch in the topbar.
                </p>
            </div>
        );
    }
    return <Dragdrop sessionId={session.id} username={session.username} />;
}
