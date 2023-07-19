import styles from "../../src/components/css/Home.module.scss";
import uploadKeyStyles from "../../src/components/css/UploadKey.module.scss";
import { getSession } from "~src/actions/session.action";
import { CopyUploadKey } from "./copy-upload-key.component";
import { getBaseUrl } from "~src/actions/base-url.action";
import buildMetadata from "~src/utils/metadata";

export const revalidate = 0;

export default async function UploadKey() {
    const session = await getSession();
    const baseUrl = getBaseUrl();
    const data = await fetch(
        `${baseUrl}/api/users/${session.id}-${session.username}/upload-key`
    );
    const { result } = (await data.json()) as { result: string };
    let content = (
        <div style={{ fontSize: "130%" }}>
            Please log in first to access your Upload Key.
        </div>
    );

    if (session.username) {
        content = (
            <div className={styles.subtitle}>
                <div className={uploadKeyStyles.uploadKeyContainer}>
                    <CopyUploadKey uploadKey={result} />
                </div>
            </div>
        );
    }
    return (
        <div>
            <div className={styles.homeContainer}>
                <h1 className={styles.title}>Upload Key</h1>
                {content}
                <div style={{ marginTop: "4rem" }}>
                    <h2>What can I do with this?</h2>
                    <div style={{ fontSize: "130%" }}>
                        Your upload key allows you to automatically upload your
                        splits right from LiveSplit. Also, your runs-in-progress
                        will be automatically tracked. This means your current
                        run can be shown on your The Run profile, and compared
                        in real time to your history.
                    </div>
                    <div style={{ fontSize: "130%", marginTop: "2rem" }}>
                        Check out the <a href={"/live"}>Live page</a> to see
                        runs in progress!
                    </div>
                    <div style={{ fontSize: "130%", marginTop: "2rem" }}>
                        Treat this key like a password. Anyone who has this key
                        can upload runs to your profile.
                    </div>
                </div>
                <div style={{ marginTop: "4rem" }}>
                    <h2>How does it work?</h2>
                    <div style={{ fontSize: "130%" }}>
                        <div style={{ marginBottom: "2rem" }}>
                            You can install the LiveSplit component in these 4
                            easy steps.
                        </div>
                        <ol>
                            <li>
                                Download{" "}
                                <a
                                    href={
                                        "https://github.com/therungg/LiveSplit.TheRun/releases/latest/download/LiveSplit.TheRun.dll"
                                    }
                                >
                                    the official therun.gg LiveSplit component
                                </a>
                                .
                            </li>
                            <li>
                                Insert the .dll file into your LiveSplit
                                directory under Livesplit/Components
                            </li>
                            <li>
                                Open the layout editor in LiveSplit. Add the
                                component to your layout. It is under the Other
                                dropdown.
                            </li>
                            <li>
                                Open the Layout Settings. There, select the
                                therun.gg tab. Insert your Upload Key.
                            </li>
                        </ol>

                        <div style={{ marginTop: "2rem" }}>
                            Now, you will never have to upload your runs again!
                            In addition, your live runs will show up in real
                            time on your profile, and on the dedicated{" "}
                            <a href={"/live"}>Live page</a>!
                        </div>

                        <div style={{ marginTop: "2rem" }}>
                            The code for the component is freely available on{" "}
                            <a
                                target={"_blank"}
                                rel={"noreferrer"}
                                href={
                                    "https://github.com/therungg/LiveSplit.TheRun"
                                }
                            >
                                GitHub
                            </a>
                            .
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: "4rem" }}>
                    <h2>Troubleshooting</h2>
                    <div style={{ fontSize: "130%" }}>
                        <div>
                            If your splits do not get uploaded or your runs do
                            not show on the live page, here is what you can try:
                        </div>
                        <ul>
                            <li>
                                Verify that the Game and Category fields have
                                been set in LiveSplit
                            </li>
                            <li>
                                Verify that you added the therun.gg layout from
                                the Other tab to your layout in LiveSplit.
                            </li>
                            <li>
                                Try to copy and paste your upload key again.
                                There has been a rare bug where the upload key
                                got overwritten, or maybe the copy-pasting went
                                wrong.
                            </li>
                        </ul>
                        <div>
                            If after all this, it still does not work, please
                            contact me!
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const metadata = buildMetadata({
    title: "Your Upload Key",
    description:
        "Get your upload key to use in The Run's LiveSplit component from here.",
    index: false,
    follow: false,
});
