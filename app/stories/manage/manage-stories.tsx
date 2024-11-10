"use server";

import ShowRunStory from "~app/stories/manage/show-run-story";
import { getSession } from "~src/actions/session.action";
import { SetStoryPreferences } from "~app/stories/manage/set-story-preferences";
import { getStoryPreferencesByUser } from "~src/lib/stories";

const ManageStories = async () => {
    const { username } = await getSession();
    const storyPreferences = await getStoryPreferencesByUser(username);

    return (
        <>
            <h1>Therun.gg Story Mode</h1>
            <ShowRunStory username={username} />
            <SetStoryPreferences storyPreferences={storyPreferences} />
        </>
    );
};

export default ManageStories;
