import { Button, Nav } from "react-bootstrap";
import Image from "next/image";
import { baseUrl } from "../../pages/_app";
import styles from "../css/TwitchLoginButton.module.scss";

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
                                        height: "auto"
                                    }} />
                            </div>
                            <div className={styles.name}>{username}</div>
                        </div>
                    </div>
                </Nav.Item>
            </div>
        );

    let base = baseUrl;

    if (!base) base = "https://therun.gg";

    const url =
        `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${base}${redirect}&response_type=code` +
        `&scope=user:read:email+openid` +
        `&claims={"id_token":{"picture":null},"userinfo":{"preferred_username":null, "picture":null}}`;
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
