"use client";

import { Col } from "react-bootstrap";
import { PatreonBunnyHeartWithoutLink } from "~app/patron/patreon-info";
import { getSession } from "~src/actions/session.action";
import { TwitchLoginButton } from "~src/components/twitch/TwitchLoginButton";
import { getWrappedForUser } from "~src/lib/wrapped";
import React, { useEffect, useState } from "react";
import { User } from "types/session.types";
import { GlobalSearch } from "~src/components/search/global-search.component";

export default function Page() {
    const [session, setSession] = useState<User | null>(null);
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        async function fetchSession() {
            try {
                const sessionData = await getSession();
                setSession(sessionData);

                // If session exists, preload wrapped data
                if (sessionData?.id && sessionData.id !== "") {
                    setHasSession(true);

                    try {
                        await getWrappedForUser(sessionData.user);
                    } catch (wrappedError) {
                        console.error(
                            "Error preloading wrapped data:",
                            wrappedError,
                        );
                    }
                }
                // eslint-disable-next-line
            } catch {}
        }

        fetchSession();
    }, []);

    return (
        <Col width="100%">
            <div className="text-center">
                <h1 className="display-2 mb-4">
                    Your 2024 Recap from The Run is Here!
                </h1>
                <div className="fs-5 mb-5">
                    <p>
                        We've been watching from the sidelines here at The Run,
                        and we've seen the{" "}
                        <b>
                            <i>incredible</i>
                        </b>{" "}
                        amount of dedication you've poured into your favorite
                        speed games.
                    </p>
                    <p>We think this is worth celebrating.</p>
                    <p>
                        We've compiled your 2024 stats into a Recap which you
                        can view and share with others in your community.
                    </p>
                    <p>
                        We hope the Recap can bring you some joy, laughs,
                        intrigue, and - most importantly - pride in yourself and
                        all you have achieved.
                    </p>
                </div>
                <div className="mb-5">
                    {hasSession && session ? (
                        <a
                            href={`/${session.user}/recap`}
                            className="btn btn-lg btn-primary mb-4"
                        >
                            View your 2024 Recap
                        </a>
                    ) : (
                        <>
                            <p className="fs-6 leading-relaxed mb-4">
                                To view your 2024 Recap, please login with
                                Twitch.
                            </p>
                            <TwitchLoginButton url="/api/recap" />
                        </>
                    )}
                </div>
                <div className="mb-3">
                    <p className="fs-6">
                        Or, search your username or any other username below to
                        access the Recap:
                    </p>
                </div>
                <div className="w-auto d-inline-block mb-5">
                    <GlobalSearch filter={["user"]} />
                </div>

                <Col className="justify-content-center">
                    <p className="display-6">Here's to 2025!</p>
                    <PatreonBunnyHeartWithoutLink size={125} />
                    <p className="mt-3">
                        -- Joey and <b>The</b>{" "}
                        <span
                            style={{
                                color: "var(--bs-link-color)",
                                fontWeight: "bold",
                            }}
                        >
                            Run
                        </span>
                    </p>
                </Col>
            </div>
        </Col>
    );
}
