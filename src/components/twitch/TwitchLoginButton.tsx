"use client";

import React from "react";
import { Nav } from "react-bootstrap";
import { getTwitchOAuthURL } from "./twitch-oauth";
import { Button } from "~src/components/Button/Button";

interface TwitchLoginButtonProps {
    url?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ url = "" }) => {
    const loginUrl = getTwitchOAuthURL({ redirect: url });
    return (
        <Nav.Link href={loginUrl.href}>
            <Button className="twitch">Login with Twitch</Button>
        </Nav.Link>
    );
};
