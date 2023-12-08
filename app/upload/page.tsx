import { Metadata } from "next";
import { getSession } from "~src/actions/session.action";
import { Dragdrop } from "~src/components/dragdrop";

export const metadata: Metadata = {
    title: "Upload",
    description: "Upload your splits",
};

export default async function Upload() {
    const session = await getSession();
    if (!session.id) {
        return (
            <div>
                <h1>Oops</h1>
                Sorry, but you need to be logged in to be able to upload splits!
                Please Login with Twitch in the topbar.
            </div>
        );
    }
    return <Dragdrop sessionId={session.id} username={session.username} />;
}
