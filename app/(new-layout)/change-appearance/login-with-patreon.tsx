'use client';

import React from 'react';
import { PatreonBunnySvg } from '~app/(new-layout)/patron/patreon-info';
import { Button } from '~src/components/Button/Button';
import Link from '~src/components/link';
import { buildPatronStyle } from '~src/components/patreon/patron-style';
import { TwitchLoginButton } from '~src/components/twitch/TwitchLoginButton';
import { BunnyIcon } from '~src/icons/bunny-icon';
import { CheckmarkIcon } from '~src/icons/checkmark-icon';
import type { PatronPreferences } from '../../../types/patreon.types';
import type { User } from '../../../types/session.types';
import styles from './change-appearance.module.scss';

const DEMO_PREFS: PatronPreferences = {
    hide: false,
    featureInScrollbar: false,
    featureOnOverview: true,
    showIcon: true,
    customColor: null,
    customGradient: {
        dark: ['#9333ea', '#ec4899', '#f97316'],
        light: ['#7c3aed', '#db2777', '#ea580c'],
    },
    bold: true,
    italic: false,
    gradientAngle: { dark: 90, light: 90 },
    gradientAnimated: true,
};

const TIER_FEATURES = [
    {
        tier: 'Tier 1',
        items: ['Custom solid colors', 'Color presets', 'Display preferences'],
    },
    {
        tier: 'Tier 2',
        items: ['Everything in Tier 1', 'Custom gradients', 'Gradient presets'],
    },
    {
        tier: 'Tier 3',
        items: [
            'Everything in Tier 2',
            'Bold & italic',
            'Animated gradients',
            'Gradient angle control',
        ],
    },
];

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

    const demoStyle = buildPatronStyle(DEMO_PREFS, 3, 'dark');

    return (
        <div className={styles.invitePage}>
            <div className={styles.inviteHeader}>
                <BunnyIcon size={48} />
                <h1>Make your name unforgettable</h1>
                <p className={styles.inviteSubtitle}>
                    Support therun.gg and stand out on every leaderboard,
                    profile, and run — animated gradients, custom colors, bold
                    styles, and more.
                </p>
            </div>

            <div className={styles.inviteColumns}>
                {/* Left: live preview */}
                <div className={styles.invitePreviewCol}>
                    <div className={styles.invitePreviewDark}>
                        <span style={demoStyle}>{session.username}</span>
                        <span className={styles.invitePreviewBunny}>
                            <PatreonBunnySvg />
                        </span>
                    </div>
                    <p className={styles.invitePreviewCaption}>
                        Animated gradient · Bold · Patreon icon
                    </p>
                </div>

                {/* Right: perks + CTA */}
                <div className={styles.inviteCtaCol}>
                    <div className={styles.perksGrid}>
                        <div className={styles.perkItem}>
                            <CheckmarkIcon />
                            <span>
                                Custom name color across the entire site
                            </span>
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
                            Support therun.gg and unlock visual perks — the site
                            will always be free and without ads.
                        </p>
                        <Link
                            target="_blank"
                            rel="noreferrer"
                            href="https://patreon.com/therungg"
                        >
                            <Button className="btn-lg fw-medium">
                                Go to Patreon
                            </Button>
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
            </div>

            {/* Tier breakdown */}
            <div className={styles.inviteTiers}>
                <div className={styles.inviteTiersHeading}>
                    What&apos;s included
                </div>
                <div className={styles.inviteTiersGrid}>
                    {TIER_FEATURES.map(({ tier, items }) => (
                        <div key={tier} className={styles.inviteTierCol}>
                            <div className={styles.inviteTierName}>{tier}</div>
                            <ul className={styles.inviteTierList}>
                                {items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
