import React from "react";
import { Button, Nav } from "react-bootstrap";
import Image from "next/image";
import styles from "../css/TwitchLoginButton.module.scss";
import { AppContext } from "../../common/app.context";

export const clientId = process.env.TWITCH_OAUTH_CLIENT_ID;

export const TwitchLoginButton = ({
    username,
    picture,
    redirect = "",
}: {
    username?: string;
    picture?: string;
    redirect: string;
}) => {
    const { baseUrl = "https://therun.gg" } = React.useContext(AppContext);
    if (username)
        return (
            <div className={styles.userMenu}>
                <Nav.Item>
                    <div>
                        <div>
                            <div className={styles.icon}>
                                <Image
                                    src={picture as string}
                                    alt={username}
                                    width={30}
                                    height={30}
                                    layout={"responsive"}
                                    style={{
                                        maxWidth: "100%",
                                        height: "auto",
                                    }}
                                />
                            </div>
                            <div className={styles.name}>{username}</div>
                        </div>
                    </div>
                </Nav.Item>
            </div>
        );

    const twitchAuthURL = "https://id.twitch.tv/oauth2/authorize";
    const params = new URLSearchParams({
        client_id: clientId || "",
        redirect_uri: baseUrl + redirect,
        response_type: "code",
        scope: "user:read:email+openid",
        claims: {
            id_token: { picture: null },
            userinfo: { preferred_username: null, picture: null },
        },
    });
    const url = new URL(`${twitchAuthURL}?${params}`);
    return (
        <Nav.Link href={url.href}>
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
