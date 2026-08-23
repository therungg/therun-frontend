'use client';

import { hasFlag } from 'country-flag-icons';
import Image from 'next/image';
import React from 'react';
import {
    Twitch as TwitchIcon,
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
} from 'react-bootstrap-icons';
import { countries } from '~src/common/countries';
import { BlueskyIcon } from '~src/icons/bluesky-icon';
import { Can, subject } from '~src/rbac/Can.component';
import Link from '../link';
import { NameAsPatreon } from '../patreon/patreon-name';
import { Title } from '../title';

export const Userform = ({ username, userData }) => {
    'use no memo';

    if (userData.socials) {
        if (userData.socials.twitter) {
            const split = userData.socials.twitter.toString().split('.com/');

            userData.socials.twitter = split[split.length - 1];
        }

        if (userData.socials.youtube) {
            let split = userData.socials.youtube.toString().split('.com/');
            if (split.length === 1) {
                split = split[0].split('.be/');
            }
            userData.socials.youtube = split[split.length - 1];
        }
    }

    const form = {
        pronouns: userData.pronouns,
        socials: userData.socials,
        bio: userData.bio,
        country: userData.country,
        aka: userData.aka,
        timezone:
            userData.timezone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    return (
        <div>
            {Display({
                username:
                    userData.login &&
                    userData.login.toLowerCase() !== username.toLowerCase()
                        ? userData.login
                        : username,
                form,
                showTimezone: !!userData.timezone,
            })}

            <Can I="edit" this={subject('user', username)}>
                <div className="mt-3">
                    <Link
                        href="/settings/profile"
                        className="btn btn-outline-secondary btn-sm"
                    >
                        Edit profile
                    </Link>
                </div>
            </Can>
        </div>
    );
};

const Display = ({ username, form, showTimezone = false }) => {
    'use no memo';

    return (
        <div>
            <div className="d-flex column-gap-2 align-items-center">
                <div className="d-flex column-gap-2 ">
                    <Title>
                        <NameAsPatreon name={username} />
                    </Title>
                    {form.aka && (
                        <span>
                            (<b>{form.aka}</b>)
                        </span>
                    )}
                </div>
                <a
                    href={`https://twitch.tv/${username}`}
                    target="_blank"
                    rel="noreferrer"
                >
                    <TwitchIcon size={24} color="#6441a5" />
                </a>
                {form.socials && form.socials.youtube && (
                    <a
                        href={`https://youtube.com/${form.socials.youtube}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <YoutubeIcon size={24} color="red" />
                    </a>
                )}
                {form.socials && form.socials.twitter && (
                    <a
                        href={`https://twitter.com/${form.socials.twitter}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <TwitterIcon size={24} color="#1DA1F2" />
                    </a>
                )}
                {form.socials && form.socials.bluesky && (
                    <a
                        href={`https://bsky.app/profile/${form.socials.bluesky}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <BlueskyIcon />
                    </a>
                )}
            </div>
            {form.pronouns && <div>{form.pronouns}</div>}
            {!!form.country && hasFlag(form.country) && (
                <div>
                    {countries()[form.country]}&nbsp;{' '}
                    <CountryIcon countryCode={form.country} />
                </div>
            )}
            {showTimezone && form.timezone && <div>{form.timezone}</div>}
            {!!form.bio && (
                <div>
                    <i>{form.bio}</i>
                </div>
            )}
        </div>
    );
};

export const CountryIcon = ({
    countryCode,
}: {
    countryCode: keyof typeof countries;
}) => {
    return (
        <Image
            unoptimized
            className="img-fluid"
            width={24}
            height={16}
            alt={countries()[countryCode]}
            src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/${(
                countryCode as string
            ).toLowerCase()}.svg`}
        />
    );
};
