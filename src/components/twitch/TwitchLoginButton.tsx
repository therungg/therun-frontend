import React from "react";
import { Button, Nav } from "react-bootstrap";
import { getTwitchOAuthURL } from "./twitch-oauth";

interface TwitchLoginButtonProps {
    url?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ url = "" }) => {
    const loginUrl = getTwitchOAuthURL({ redirect: url });
    return (
        <Nav.Link href={loginUrl.href}>
            <Button
                variant={"secondary"}
                style={{
                    backgroundColor: "#9146FF",
                    borderColor: "#9146FF",
                    whiteSpace: "nowrap",
                }}
            >
                Login with Twitch
            </Button>
        </Nav.Link>
    );
};
