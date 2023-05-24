import React from "react";
import Image from "next/image";
import { Nav } from "react-bootstrap";
import styles from "../css/TwitchLoginButton.module.scss";

interface TwitchUserProps {
    username: string;
    picture: string;
}

export const TwitchUser: React.FunctionComponent<TwitchUserProps> = ({
    username,
    picture,
}) => {
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
};
