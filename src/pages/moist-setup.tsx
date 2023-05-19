import styles from "../components/css/Home.module.scss";
import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "../utils/fetcher";

export const MoistSetup = ({ session }) => {
    const [showUploadKey, setShowUploadKey] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const { data, error } = useSWR(
        `/api/users/${session.id}-${session.username}/upload-key`,
        fetcher
    );

    if (error) return <div>Whoops, something went wrong...</div>;

    return (
        <div>
            <div className={styles.homeContainer}>
                <h1 className={styles.title}>
                    Setup for MoistCr1tikal Contest
                </h1>
                {session.username && (
                    <div className={styles.subtitle}>
                        {!data && <div>Loading upload key...</div>}
                        {data && (
                            <div
                                style={{
                                    padding: "1rem",
                                    backgroundColor: "var(--color-secondary)",
                                    border: "1px solid var(--color-tertiary)",
                                }}
                            >
                                {showUploadKey && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {data.result}
                                        <div
                                            style={{
                                                marginLeft: "1rem",
                                                cursor: "pointer",
                                            }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    data.result
                                                );
                                                setCopySuccess(true);
                                                setTimeout(() => {
                                                    setCopySuccess(false);
                                                }, 1500);
                                            }}
                                        >
                                            <Copy />
                                        </div>
                                        {copySuccess && (
                                            <div
                                                style={{
                                                    fontSize: "1.3rem",
                                                    marginLeft: "1rem",
                                                }}
                                            >
                                                Copied to Clipboard!
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!showUploadKey && (
                                    <div
                                        style={{ cursor: "pointer" }}
                                        onClick={() => {
                                            setShowUploadKey(!showUploadKey);
                                            setTimeout(() => {
                                                setShowUploadKey(false);
                                            }, 10000);
                                        }}
                                    >
                                        Click to show Upload Key
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {!session.username && (
                    <div style={{ fontSize: "150%" }}>
                        Please log in first to access your Upload Key.
                    </div>
                )}
                <div style={{ marginTop: "4rem" }}>
                    <h2>What can I do with this?</h2>
                    <div style={{ fontSize: "130%" }}>
                        Your upload key allows you to automatically upload your
                        splits right from LiveSplit. Also, your runs-in-progress
                        will be automatically tracked. This allows you to have
                        advanced stats for your splits, as well as to appear on
                        /moist!
                    </div>
                    <div style={{ fontSize: "130%", marginTop: "2rem" }}>
                        Check out the <a href={"/moist"}>Contest page</a> to see
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
                                        "https://github.com/therungg/LiveSplit.TheRun/releases/download/v0.1.7/LiveSplit.TheRun.dll"
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
};

export const Copy = () => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="36"
            height="36"
            fill="currentColor"
            className="bi bi-clipboard"
            viewBox="0 0 16 16"
        >
            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
        </svg>
    );
};

export default MoistSetup;
