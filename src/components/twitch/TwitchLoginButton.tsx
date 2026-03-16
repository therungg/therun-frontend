'use client';

import React from 'react';
import { Button } from '~src/components/Button/Button';
import { getTwitchOAuthURL } from './twitch-oauth';

interface TwitchLoginButtonProps {
    url?: string;
}

export const TwitchLoginButton: React.FunctionComponent<
    TwitchLoginButtonProps
> = ({ url = '' }) => {
    const loginUrl = getTwitchOAuthURL({ redirect: url });
    return (
        <a href={loginUrl.href} style={{ textDecoration: 'none' }}>
            <Button className="twitch">Login with Twitch</Button>
        </a>
    );
};
