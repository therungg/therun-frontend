import { getSession } from "~src/actions/session.action";
import { CopyUploadKey } from "./copy-upload-key.component";
import { getBaseUrl } from "~src/actions/base-url.action";
import buildMetadata from "~src/utils/metadata";

export const revalidate = 0;

export default async function Livesplit() {
    const session = await getSession();
    const baseUrl = getBaseUrl();
    const data = await fetch(
        `${baseUrl}/api/users/${session.id}-${session.username}/upload-key`,
    );
    const { result } = (await data.json()) as { result: string };
    let content = (
        <div className="fs-large">
            Please log in first to access your LiveSplit Key.
        </div>
    );

    if (session.username) {
        content = (
            <div className="mt-4 p-3 fw-lighter fs-responsive-larger card bg-body-secondary">
                <CopyUploadKey uploadKey={result} />
            </div>
        );
    }
    return (
        <div className="text-center list-style-inside mb-5 fs-larger">
            <h1 className="fs-responsive-xxx-large fw-medium pt-4">
                LiveSplit Key
            </h1>
            {content}
            <div className="my-5 pt-5">
                <h2>What can I do with this?</h2>
                <p className="mb-4">
                    Your LiveSplit key connects your LiveSplit to therun. Your
                    runs will be tracked live, and your stats will be
                    automatically updated after every run.
                </p>
                <p className="mb-4">
                    Check out the <a href="/live">Live page</a> to see runs in
                    progress!
                </p>
                <p>
                    Treat this key like a password. Anyone who has this key can
                    upload runs to your profile.
                </p>
            </div>
            <div className="mb-5">
                <h2>How does it work?</h2>
                <p className="mb-4">
                    You can install the LiveSplit component in these 2 easy
                    steps.
                </p>
                <ol className="mb-4">
                    <li>
                        Open the layout editor in LiveSplit. Add the component
                        to your layout. It is under the Other dropdown.
                    </li>
                    <li>
                        Open the Layout Settings. There, select the therun.gg
                        tab. Insert your LiveSplit Key. You are done!
                    </li>
                </ol>

                <p className="mb-4">
                    Now, you will never have to upload your runs again! In
                    addition, your live runs will show up in real time on your
                    profile, and on the dedicated <a href="/live">Live page</a>!
                    It also allows you to join Tournaments, or to participate in
                    Races!
                </p>

                <p>
                    The code for the component is freely available on{" "}
                    <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://github.com/therungg/LiveSplit.TheRun"
                    >
                        GitHub
                    </a>
                    .
                </p>
            </div>
            <div>
                <h2>Troubleshooting</h2>
                <p>
                    If your splits do not get uploaded or your runs do not show
                    on the live page, here is what you can try:
                </p>
                <ul>
                    <li>
                        Verify that the Game and Category fields have been set
                        in LiveSplit
                    </li>
                    <li>
                        Verify that you added the therun.gg layout from the
                        Other tab to your layout in LiveSplit.
                    </li>
                </ul>
                <p>
                    If after all this, it still does not work, please contact
                    me!
                </p>
            </div>
        </div>
    );
}

export const metadata = buildMetadata({
    title: "Your LiveSplit Key",
    description:
        "Get your LiveSplit key to use in The Run's LiveSplit component from here.",
    index: false,
    follow: false,
});
