'use client';

import React from 'react';
import { Button, Container } from 'react-bootstrap';
import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { User } from '../../../types/session.types';
import styles from './change-appearance.module.scss';

export const LoginWithPatreon = ({
    session,
    baseUrl,
}: {
    session: User;
    baseUrl: string;
}) => {
    if (!session.username) {
        return (
            <Container>
                <div className={styles.loginPrompt}>
                    To connect your Patreon account, login with Twitch first.
                    <TwitchLoginButton url="/api/change-appearance" />
                </div>
            </Container>
        );
    }

    const redirectUri = `${baseUrl || 'https://therun.gg'}%2fchange-appearance`;

    const url = `https://patreon.com/oauth2/authorize?response_type=code&client_id=QLyBxIC3dSTxWEVqx_YJZCJSHHWxyt3LhE8Nue4_aOXmYlMsq9whaL2-VcqyCf1n&scope=identity&redirect_uri=${redirectUri}`;

    return (
        <Container className={styles.loginContainer}>
            <p>
                To match your Patreon with your therun.gg account, link your
                Patreon account here!
            </p>
            <Link passHref href={url}>
                <Button className="patreon">Link with Patreon</Button>
            </Link>
        </Container>
    );
};
