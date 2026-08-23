import ManageStories from '~app/(new-layout)/stories/manage/manage-stories';
import { getSession } from '~src/actions/session.action';
import buildMetadata from '~src/utils/metadata';
import styles from '../settings.module.scss';

export default async function StoryModeSettingsPage() {
    const session = await getSession();
    if (!session.id || !session.username) return null;

    return (
        <div className={styles.pane}>
            <header className={styles.paneHeader}>
                <h1 className={styles.paneTitle}>Story Mode</h1>
            </header>
            <ManageStories />
        </div>
    );
}

export const metadata = buildMetadata({
    title: 'Story Mode',
    description: 'Configure Story Mode narration for your live runs.',
    index: false,
    follow: false,
});
