import Image from 'next/image';
import React from 'react';
import { Nav } from 'react-bootstrap';
import { NameAsPatreon } from '~src/components/patreon/patreon-name';

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
                        unoptimized
                        className="rounded-circle"
                        src={picture as string}
                        alt={username}
                        width={32}
                        height={32}
                    />
                </div>
                <div className="ms-2">
                    <NameAsPatreon name={username} />
                </div>
            </Nav.Item>
        </div>
    );
};
