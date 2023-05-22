import React from "react";
import { Button, Nav } from "react-bootstrap";

interface TwitchLoginButtonProps {
    url?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ url = "" }) => {
    return (
        <Nav.Link href={url}>
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
