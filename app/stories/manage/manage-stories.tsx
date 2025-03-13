"use server";

import ShowRunStory from "~app/stories/manage/show-run-story";
import { getSession } from "~src/actions/session.action";
import { SetStoryPreferences } from "~app/stories/manage/set-story-preferences";
import { getStoryOptions, getStoryPreferencesByUser } from "~src/lib/stories";
import { getLiveRunForUser } from "~src/lib/client/live-runs";
import React from "react";

const ManageStories = async () => {
    const session = await getSession();
    const { username } = session;
    const liveData = await getLiveRunForUser(username);
    const storyPreferences = await getStoryPreferencesByUser(session);
    const allStoryOptions = await getStoryOptions();

    return (
        <>
            <div className="rounded-3 px-4 pt-2 mt-4 pb-2 mb-3 border border-secondary bg-body-secondary text-center">
                <div className="w-100 text-center align-self-center align-content-center flex-center">
                    <div className="w-75">
                        <h3>Story Mode by therun.gg</h3>
                        <div style={{ fontSize: "large" }}>
                            <p>
                                Welcome to <b>Story Mode</b>, {session.username}
                                . Thanks for checking it out!
                            </p>
                            <p>
                                Please note that the Twitch bot will only
                                activate if you have at least <b>14 started</b>{" "}
                                and <b>4 finished</b> attempts for the category.
                            </p>
                            <p>
                                Also, you need to have the LiveSplit component
                                enabled.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <ShowRunStory username={username} liveData={liveData} />
            <SetStoryPreferences
                storyPreferences={storyPreferences}
                user={session}
                storyOptions={allStoryOptions}
            />
        </>
    );
};

export default ManageStories;
