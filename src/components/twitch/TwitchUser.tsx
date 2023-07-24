import React from "react";
import Image from "next/image";
import { Nav } from "react-bootstrap";

interface TwitchUserProps {
    username: string;
    picture: string;
}

export const TwitchUser: React.FunctionComponent<TwitchUserProps> = ({
    username,
    picture,
}) => {
    return (
        <div className="ms-lg-2">
            <Nav.Item className="d-flex align-items-center">
                <div className="cursor-pointer">
                    <Image
                        className="rounded-circle"
                        src={picture as string}
                        alt={username}
                        width={32}
                        height={32}
                        style={{
                            maxWidth: "100%",
                            height: "auto",
                        }}
                    />
                </div>
                <div className="ms-2 ">{username}</div>
            </Nav.Item>
        </div>
    );
};
