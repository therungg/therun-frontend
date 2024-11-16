"use server";

import ShowRunStory from "~app/stories/manage/show-run-story";
import { getSession } from "~src/actions/session.action";
import { SetStoryPreferences } from "~app/stories/manage/set-story-preferences";
import { getStoryPreferencesByUser } from "~src/lib/stories";
import { getLiveRunForUser } from "~src/lib/live-runs";

const ManageStories = async () => {
    const session = await getSession();
    const { username } = session;
    const liveData = await getLiveRunForUser(username);
    const storyPreferences = await getStoryPreferencesByUser(session);

    return (
        <>
            <h1>Therun.gg Story Mode Dashboard</h1>
            <ShowRunStory username={username} liveData={liveData} />
            <SetStoryPreferences
                storyPreferences={storyPreferences}
                user={session}
            />
        </>
    );
};

export default ManageStories;
