import { Metadata } from "next";
import { Title } from "~src/components/title";

export const metadata: Metadata = {
    title: "About",
    description: "About The Run",
};

export default function About() {
    return (
        <div>
            <Title>About The Run</Title>
            <p>The Run is a free, ad-less statistics tool for speedrunners.</p>
            <h2></h2>
            <h2>Features</h2>
            <ul>
                <li>
                    Each user has their own{" "}
                    <a href={"/KallyNui"} target={"_blank"} rel={"noreferrer"}>
                        {" "}
                        profile
                    </a>
                    , detailing their full stats and an overview of
                    games/categories they run.
                </li>
                <li>
                    For each category a detailed{" "}
                    <a
                        href={"AverageTrey/Super Mario Sunshine/Any%25"}
                        target={"_blank"}
                        rel={"noreferrer"}
                    >
                        dive into their splits
                    </a>
                    :
                    <ul>
                        <li>
                            Full view of splits, including comparisons to SOB,
                            Best Achieved, Average, and alternative splits. Show
                            as total time or split time.
                        </li>
                        <li>
                            Graph to show finished runs over time, or Personal
                            Bests over time.
                        </li>
                        <li>
                            Overview of recent Runs and recent Run Sessions.
                        </li>
                        <li>
                            A detailed Splits Stats page, giving all data needed
                            to analyze splits, including graphs and a
                            consistency score.
                        </li>
                        <li>
                            Comparison tool to select the same splits to a
                            different runner, and compare your splits to theirs.
                        </li>
                    </ul>
                </li>
            </ul>
            <ul>
                <li>
                    An overview of
                    <a href={"/games"} target={"_blank"} rel={"noreferrer"}>
                        {" "}
                        Games
                    </a>
                    , along with the best runners per category.
                </li>
                <li>
                    A detailed{" "}
                    <a
                        href={"/game/Super Mario 64"}
                        target={"_blank"}
                        rel={"noreferrer"}
                    >
                        {" "}
                        Game Page
                    </a>{" "}
                    with stats and leaderboards, which can all be filtered by
                    category.
                </li>
                <li>
                    Automatic uploads through a{" "}
                    <a href={"/upload-key"}>LiveSplit Component </a>
                </li>
                <li>
                    Live Run tracking from the Component on the{" "}
                    <a href={"/live"}>Runs page</a>
                </li>
                <li>
                    A{" "}
                    <a
                        href={
                            "https://dashboard.twitch.tv/extensions/gl1gra1r6ucnkchrswmdsefomfwxai-0.1.0"
                        }
                        target={"_blank"}
                        rel={"noreferrer"}
                    >
                        Twitch Extension{" "}
                    </a>
                    that shows your stats right under your stream.
                </li>
            </ul>
            <ul>
                <li>Handy search option which finds Users or Games.</li>
                <li>Dark mode (use the topbar button, I worked hard on it)</li>
                <li>
                    <a href={"/roadmap"} target={"_blank"} rel={"noreferrer"}>
                        Many more features{" "}
                    </a>{" "}
                    to come in the future!
                </li>
            </ul>
            <h2>How to use</h2>
            <div>
                I tried to make the tool as easy to use as possible. All you
                have to do is:
                <ol>
                    <li>
                        Login with Twitch using the button in the topbar. This
                        way your viewers know how to find you on here as well!
                    </li>
                    <li>
                        Upload your .lss file by going to the{" "}
                        <a href={"/upload"}>Upload</a> page.
                    </li>
                    <li>
                        Wait for 10 to 30 seconds for your splits to be
                        processed. After waiting, go to your profile
                        (therun.gg/YOUR_TWITCH_NAME_HERE) to view your splits!
                    </li>
                    <li>
                        Have fun checking out your data or send your viewers to
                        the page to let them have fun!
                    </li>
                </ol>
            </div>
            <h2>Purpose</h2>
            <ol>
                <li>
                    Making it easier to analyze, learn from, and improve through
                    your splits. It helps speedrunners gain insight into many
                    patterns regarding their runs, and gives them valuable data
                    about their splits, giving them the tools needed to improve
                    their practicing effiency.
                </li>
                <br />
                <li>
                    Improving the speedrunning viewer experience. Very often,
                    viewers will ask about a streamers splits, timesaves,
                    previous runs or gold times. All this data is readily
                    available to them through The Run.
                </li>
                <br />

                <li>
                    Allowing people to keep track of multiple runs at the time
                    through the Live page.
                </li>
            </ol>
            This is a Beta version of the tool, so I would love to have any and
            all feedback. Please tell me what you like, hate, or would want to
            see added!
        </div>
    );
}
