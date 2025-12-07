"use server";

import { getSession } from "~src/actions/session.action";
import ManageStories from "~app/(old-layout)/stories/manage/manage-stories";

const ManageStoriesPage = async () => {
    const session = await getSession();

    if (!session.id) {
        return (
            <div>
                <h1>Oops</h1>
                Sorry, but you need to be logged in to be able to manage your
                data! Please Login with Twitch in the topbar.
            </div>
        );
    }

    return <ManageStories />;
};

export default ManageStoriesPage;
