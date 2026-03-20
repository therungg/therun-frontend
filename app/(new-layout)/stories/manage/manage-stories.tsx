'use server';

import React from 'react';
import { SetStoryPreferences } from '~app/(new-layout)/stories/manage/set-story-preferences';
import ShowRunStory from '~app/(new-layout)/stories/manage/show-run-story';
import { getSession } from '~src/actions/session.action';
import { getLiveRunForUser } from '~src/lib/live-runs';
import { getStoryOptions, getStoryPreferencesByUser } from '~src/lib/stories';
import styles from './manage-stories.module.scss';

const ManageStories = async () => {
    const session = await getSession();
    const { username } = session;
    const liveData = await getLiveRunForUser(username);
    const storyPreferences = await getStoryPreferencesByUser(session);
    const allStoryOptions = await getStoryOptions();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.pageTitle}>Story Mode</h1>
                <p className={styles.subtitle}>
                    Configure how therun.gg Twitch bot narrates your runs with
                    live commentary and stats
                </p>
            </div>

            <div className={styles.requirements}>
                <div className={styles.requirementItem}>
                    <span className={styles.requirementIcon}>📋</span>
                    Requires at least <strong>14 started</strong> and{' '}
                    <strong>4 finished</strong> attempts for the category
                </div>
                <div className={styles.requirementItem}>
                    <span className={styles.requirementIcon}>🔗</span>
                    LiveSplit component must be enabled
                </div>
            </div>

            <ShowRunStory username={username} liveData={liveData} />

            <SetStoryPreferences
                storyPreferences={storyPreferences}
                user={session}
                storyOptions={allStoryOptions}
            />
        </div>
    );
};

export default ManageStories;
