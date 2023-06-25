"use client";

import React, { useEffect, useState } from "react";
import { TwitchLoginButton } from "~src/components/twitch/TwitchLoginButton";
import styles from "~src/components/css/Appearance.module.scss";
import Link from "next/link";
import { Button } from "react-bootstrap";
import { User } from "../../types/session.types";

export const LoginWithPatreon = ({
    session,
    baseUrl,
}: {
    session: User;
    baseUrl: string;
}) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!session.username) {
        return (
            <div className={styles.pageContainer}>
                To connect your Patreon account, login with Twitch first.
                <div style={{ display: "flex", justifyContent: "center" }}>
                    <TwitchLoginButton url={"/api/change-appearance"} />
                </div>
            </div>
        );
    }

    let base = baseUrl;
    if (!base) {
        base = "https://therun.gg%2Fchange-appearance";
    } else {
        base += "%2fchange-appearance";
    }

    const url = `https://patreon.com/oauth2/authorize?response_type=code&client_id=QLyBxIC3dSTxWEVqx_YJZCJSHHWxyt3LhE8Nue4_aOXmYlMsq9whaL2-VcqyCf1n&scope=identity&redirect_uri=${base}`;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.matchText}>
                To match your Patreon with your therun.gg account, link your
                Patreon account here!
            </div>
            <div className={styles.linkPatreonButtonContainer}>
                <Link passHref href={url} legacyBehavior>
                    <Button>Link with Patreon</Button>
                </Link>
            </div>
        </div>
    );
};
