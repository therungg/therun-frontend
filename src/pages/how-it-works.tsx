import { TwitchLoginButton } from "../components/twitch/TwitchLoginButton";

export const HowItWorks = ({ session }) => {
    return (
        <>
            <h2>How it works</h2>
            <p>
                The Run is a 100% free speedrun statistics tool. Read how it
                works below!
            </p>

            <ul className="tilesWrap">
                <li>
                    <h2>01</h2>
                    <h3>Login with Twitch</h3>
                    <p>
                        By logging in with Twitch, Therun.gg can use your
                        username to link your profile. This way, you can go to{" "}
                        <i>therun.gg/YourName</i> to view your stats!
                    </p>
                    {session.username ? (
                        <p>
                            You are already logged in as{" "}
                            <strong>{session.username}</strong>!
                        </p>
                    ) : (
                        <TwitchLoginButton url={"/how-it-works"} />
                    )}
                </li>
                <li>
                    <h2>02</h2>
                    <h3>Upload some splits</h3>
                    <p>You can upload your LiveSplit splits easily.</p>
                    {!session.username ? (
                        <p>Please login first!</p>
                    ) : (
                        <a href={"/upload"}>
                            <button>Upload now!</button>
                        </a>
                    )}
                </li>
                <li>
                    <h2>03</h2>
                    <h3>Check out your stats</h3>
                    <p>
                        After around 30 seconds, your splits will be parsed and
                        available to view!
                    </p>
                    <p>
                        You`&#39;`ll be able to see statistics about your runs,
                        sessions and splits directly!
                    </p>
                    <p>
                        Visit{" "}
                        {session.username ? (
                            <a href={`/${session.username}`}> your page </a>
                        ) : (
                            "your page"
                        )}{" "}
                        to view them.
                    </p>
                    {session.username ? (
                        <a href={`/${session.username}`}>
                            <button>See stats!</button>
                        </a>
                    ) : (
                        <></>
                    )}
                </li>
                <li>
                    <h2>04</h2>
                    <h3>Share your page</h3>
                    <p>
                        Anyone can now visit your page by replacing{" "}
                        <i>twitch.tv</i> with <i>therun.gg</i>! Have fun!
                    </p>
                </li>
            </ul>
        </>
    );
};

export default HowItWorks;
