'use client';

import React from 'react';
import { Button } from '~src/components/Button/Button';
import Link from '~src/components/link';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { CheckmarkIcon } from '~src/icons/checkmark-icon';
import type { User } from '../../../types/session.types';
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
            <div className={styles.invitePage}>
                <div className={styles.loginPrompt}>
                    To connect your Patreon account, login with Twitch first.
                    <TwitchLoginButton url="/api/change-appearance" />
                </div>
            </div>
        );
    }

    const redirectUri = `${baseUrl || 'https://therun.gg'}%2fchange-appearance`;
    const patreonOAuthUrl = `https://patreon.com/oauth2/authorize?response_type=code&client_id=QLyBxIC3dSTxWEVqx_YJZCJSHHWxyt3LhE8Nue4_aOXmYlMsq9whaL2-VcqyCf1n&scope=identity&redirect_uri=${redirectUri}`;

    return (
        <div className={styles.invitePage}>
            <div className={styles.inviteHeader}>
                <BunnyIcon size={48} />
                <h1>Customize Your Appearance</h1>
                <p className={styles.inviteSubtitle}>
                    Appearance customization is a perk for our supporters.
                    Become a Patron to unlock custom name colors, styles, and
                    more.
                </p>
            </div>

            <div className={styles.perksGrid}>
                <div className={styles.perkItem}>
                    <CheckmarkIcon />
                    <span>Custom name color on the site</span>
                </div>
                <div className={styles.perkItem}>
                    <CheckmarkIcon />
                    <span>Golden rabbit next to your name</span>
                </div>
                <div className={styles.perkItem}>
                    <CheckmarkIcon />
                    <span>Exclusive Discord role &amp; channel</span>
                </div>
                <div className={styles.perkItem}>
                    <CheckmarkIcon />
                    <span>Special shoutout on the site</span>
                </div>
            </div>

            <div className={styles.inviteCardPrimary}>
                <h3>Become a Patron</h3>
                <p>
                    Support therun.gg and unlock visual perks — the site will
                    always be free and without ads.
                </p>
                <Link
                    target="_blank"
                    rel="noreferrer"
                    href="https://patreon.com/therungg"
                >
                    <Button className="btn-lg fw-medium">Go to Patreon</Button>
                </Link>
            </div>

            <div className={styles.alreadyPatron}>
                <p>Already a Patron?</p>
                <Link passHref href={patreonOAuthUrl}>
                    <Button variant="secondary">
                        Link your Patreon account
                    </Button>
                </Link>
            </div>
        </div>
    );
};
