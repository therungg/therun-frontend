import ShowRunStory from "~app/stories/manage/show-run-story";
import { getSession } from "~src/actions/session.action";
import { SetStoryPreferences } from "~app/stories/manage/set-story-preferences";
import { getStoryPreferencesByUser } from "~src/lib/stories";
import { getLiveRunForUser } from "~src/lib/live-runs";
import React from "react";

const ManageStories = async () => {
    const session = await getSession();
    const { username } = session;
    const liveData = await getLiveRunForUser(username);
    const storyPreferences = await getStoryPreferencesByUser(session);

    return (
        <>
            <div className="rounded-3 px-4 pt-2 mt-4 pb-2 mb-3 border border-secondary bg-body-secondary text-center">
                <div className="w-100 text-center align-self-center align-content-center flex-center">
                    <div className="w-75">
                        <h3>Story Mode by therun.gg</h3>
                        <div style={{ fontSize: "large" }}>
                            <p>
                                Welcome to the Story Mode beta,{" "}
                                {session.username}. Thanks for checking it out!
                            </p>
                            <h4>About Story Mode</h4>
                            <p>
                                Story Mode is a new feature that generates a
                                story for each of your runs, in real-time! It
                                does this by looking at your live run, and your
                                run history. Story mode is still in beta and
                                very much experimental. It will likely make
                                mistakes, it might break and it will absolutely
                                change. However, it will also improve a lot! I
                                add new stories and adjust the current ones
                                every single day. But I cannot do that without
                                your feedback. Together, we will make this a
                                super fun tool for all speedrunners!
                            </p>
                            <h4>What I need from you</h4>
                            <p>
                                Feedback! While you are trying out the tool, I
                                would like you to give me as much feedback you
                                can. Is the bot fun? Is it accurate? Is it
                                terrible? Is it too repetitive? Does chat like
                                it? Would you like anything added? Missing
                                anything in the configurations? Please give me
                                as much feedback as you can based on these
                                questions through the Discord channel -- that
                                way I can improve the tool!
                            </p>
                            <h4>What now?</h4>
                            <p>
                                Below, you will see your current stories if you
                                are in a Live Run. Underneath, you can configure
                                your Twitch bot! Please enable it and configure
                                accordingly! Thanks so much for trying out my
                                newest tool!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <ShowRunStory username={username} liveData={liveData} />
            <SetStoryPreferences
                storyPreferences={storyPreferences}
                user={session}
            />
        </>
    );
};

export default ManageStories;
