import { getSession } from "~src/actions/session.action";
import ManageStories from "~app/stories/manage/manage-stories";
import { confirmPermission } from "~src/rbac/confirm-permission";

const ManageStoriesPage = async () => {
    const session = await getSession();

    confirmPermission(session, "view-restricted", "stories");
    confirmPermission(session, "edit", "stories");

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
