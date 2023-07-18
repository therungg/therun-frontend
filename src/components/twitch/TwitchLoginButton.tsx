import React from "react";
import { Button, Nav } from "react-bootstrap";
import { getTwitchOAuthURL } from "./twitch-oauth";
import styles from "~src/components/css/TwitchLoginButton.module.scss";

interface TwitchLoginButtonProps {
    url?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ url = "" }) => {
    const loginUrl = getTwitchOAuthURL({ redirect: url });
    return (
        <Nav.Link href={loginUrl.href}>
            <Button className={styles.twitch}>Login with Twitch</Button>
        </Nav.Link>
    );
};
