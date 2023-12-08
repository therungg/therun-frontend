"use client";

import React from "react";
import { TwitchLoginButton } from "~src/components/twitch/TwitchLoginButton";
import Link from "next/link";
import { Button, Container, Row } from "react-bootstrap";
import { User } from "../../types/session.types";

export const LoginWithPatreon = ({
    session,
    baseUrl,
}: {
    session: User;
    baseUrl: string;
}) => {
    if (!session.username) {
        return (
            <Container>
                <Row className="justify-content-center mt-3 g-3">
                    To connect your Patreon account, login with Twitch first.
                    <p className="d-flex justify-content-center">
                        <TwitchLoginButton url={"/api/change-appearance"} />
                    </p>
                </Row>
            </Container>
        );
    }

    const redirectUri = `${baseUrl || "https://therun.gg"}%2fchange-appearance`;

    const url = `https://patreon.com/oauth2/authorize?response_type=code&client_id=QLyBxIC3dSTxWEVqx_YJZCJSHHWxyt3LhE8Nue4_aOXmYlMsq9whaL2-VcqyCf1n&scope=identity&redirect_uri=${redirectUri}`;

    return (
        <Container className="text-center">
            <p className="mb-3">
                To match your Patreon with your therun.gg account, link your
                Patreon account here!
            </p>
            <Link passHref href={url}>
                <Button className="patreon">Link with Patreon</Button>
            </Link>
        </Container>
    );
};
