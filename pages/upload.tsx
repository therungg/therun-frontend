import { Dragdrop } from "../components/dragdrop";

export const Upload = ({ session }) => {
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
};

export default Upload;
