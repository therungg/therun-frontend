'use server';

import ManageStories from '~app/(new-layout)/stories/manage/manage-stories';
import { getSession } from '~src/actions/session.action';
import styles from './manage-stories.module.scss';

const ManageStoriesPage = async () => {
    const session = await getSession();

    if (!session.id) {
        return (
            <div className={styles.page}>
                <div className={styles.loginRequired}>
                    <h1>Story Mode</h1>
                    <p>
                        You need to be logged in to manage your Story Mode
                        preferences. Please log in with Twitch in the topbar.
                    </p>
                </div>
            </div>
        );
    }

    return <ManageStories />;
};

export default ManageStoriesPage;
