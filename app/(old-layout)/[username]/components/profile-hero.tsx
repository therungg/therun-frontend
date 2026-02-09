'use client';

import { hasFlag } from 'country-flag-icons';
import Image from 'next/image';
import Link from 'next/link';
import type React from 'react';
import {
    Pencil as PencilIcon,
    Twitch as TwitchIcon,
    Twitter as TwitterIcon,
    Youtube as YoutubeIcon,
} from 'react-bootstrap-icons';
import type { User as IUser } from 'types/session.types';
import { PingAnimation } from '~app/(new-layout)/components/ping-animation.component';
import type { LiveRun } from '~app/(old-layout)/live/live.types';
import type { UserStats as UserRaceStats } from '~app/(old-layout)/races/races.types';
import { countries } from '~src/common/countries';
import type { Run } from '~src/common/types';
import { NameAsPatreon } from '~src/components/patreon/patreon-name';
import { CountryIcon } from '~src/components/user/userform';
import { DurationToFormatted } from '~src/components/util/datetime';
import { BlueskyIcon } from '~src/icons/bluesky-icon';
import type { UserData } from '~src/lib/get-session-data';
import { Can, subject } from '~src/rbac/Can.component';
import styles from '../profile.module.scss';

// The API returns more fields than the UserData type declares.
// Extend locally to account for the additional profile fields.
interface ExtendedUserData extends UserData {
    bio?: string;
    country?: string;
    aka?: string;
    socials: UserData['socials'] & { bluesky?: string };
}

interface ProfileHeroProps {
    username: string;
    userData: UserData;
    runs: Run[];
    liveRun?: LiveRun;
    raceStats?: UserRaceStats;
    session: IUser;
    onEditClick: () => void;
}

export const ProfileHero = ({
    username,
    userData,
    runs,
    liveRun,
    raceStats,
    session: _session,
    onEditClick,
}: ProfileHeroProps) => {
    const data = userData as ExtendedUserData;

    const totalGames = new Set(runs.map((r) => r.game)).size;
    const totalPlayTime = runs.reduce((sum, r) => {
        const val = Number.parseInt(r.totalRunTime, 10);
        return Number.isNaN(val) ? sum : sum + val;
    }, 0);
    const totalAttempts = runs.reduce((sum, r) => sum + r.attemptCount, 0);
    const totalFinished = runs.reduce((sum, r) => {
        const val = Number.parseInt(r.finishedAttemptCount, 10);
        return Number.isNaN(val) ? sum : sum + val;
    }, 0);
    const completionPct =
        totalAttempts > 0
            ? ((totalFinished / totalAttempts) * 100).toFixed(0)
            : '0';
    const totalRaces = raceStats?.totalRaces ?? 0;

    const displayName =
        userData.login &&
        userData.login.toLowerCase() !== username.toLowerCase()
            ? userData.login
            : username;

    return (
        <div className={styles.hero}>
            <div className={styles.heroMain}>
                {/* Left: Avatar + Identity */}
                <div className="d-flex gap-3 align-items-start">
                    {userData.picture && (
                        <Image
                            src={userData.picture}
                            alt={username}
                            width={96}
                            height={96}
                            className={styles.avatar}
                            unoptimized
                        />
                    )}
                    <div className={styles.usernameSection}>
                        <div className="d-flex align-items-center gap-2">
                            <h1 className={styles.username}>
                                <NameAsPatreon name={displayName} />
                            </h1>
                            {data.aka && (
                                <span className={styles.metadata}>
                                    ({data.aka})
                                </span>
                            )}
                            {liveRun && (
                                <Link
                                    href={`/live/${username}`}
                                    className={styles.liveBadge}
                                >
                                    <PingAnimation /> LIVE
                                </Link>
                            )}
                        </div>
                        <div className={styles.metadata}>
                            {userData.pronouns && (
                                <span>{userData.pronouns}</span>
                            )}
                            {userData.pronouns && data.country && (
                                <span className={styles.metadataDivider}>
                                    &middot;
                                </span>
                            )}
                            {data.country && hasFlag(data.country) && (
                                <span>
                                    {
                                        countries()[
                                            data.country as keyof ReturnType<
                                                typeof countries
                                            >
                                        ]
                                    }{' '}
                                    <CountryIcon
                                        countryCode={
                                            // biome-ignore lint: CountryIcon has a pre-existing type bug (keyof typeof fn instead of keyof ReturnType<typeof fn>)
                                            data.country as never
                                        }
                                    />
                                </span>
                            )}
                            {userData.timezone && (
                                <>
                                    <span className={styles.metadataDivider}>
                                        &middot;
                                    </span>
                                    <span>{userData.timezone}</span>
                                </>
                            )}
                        </div>
                        {data.bio && (
                            <div className={styles.bio}>{data.bio}</div>
                        )}
                        <div className={styles.socials}>
                            <a
                                href={`https://twitch.tv/${username}`}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.socialLink}
                            >
                                <TwitchIcon size={20} />
                            </a>
                            {userData.socials?.youtube && (
                                <a
                                    href={`https://youtube.com/${userData.socials.youtube}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.socialLink}
                                >
                                    <YoutubeIcon size={20} />
                                </a>
                            )}
                            {userData.socials?.twitter && (
                                <a
                                    href={`https://twitter.com/${userData.socials.twitter}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.socialLink}
                                >
                                    <TwitterIcon size={20} />
                                </a>
                            )}
                            {data.socials?.bluesky && (
                                <a
                                    href={`https://bsky.app/profile/${data.socials.bluesky}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.socialLink}
                                >
                                    <BlueskyIcon />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Stats Strip */}
                <div className={styles.statsStrip}>
                    <StatBox value={totalGames} label="Games" />
                    <StatBox value={runs.length} label="Categories" />
                    <StatBox
                        value={
                            <DurationToFormatted
                                duration={totalPlayTime.toString()}
                            />
                        }
                        label="Played"
                    />
                    <StatBox value={`${completionPct}%`} label="Completion" />
                    {totalRaces > 0 && (
                        <StatBox value={totalRaces} label="Races" />
                    )}
                </div>
            </div>

            {/* Edit button */}
            <Can I="edit" this={subject('user', username)}>
                <button
                    className={styles.editButton}
                    onClick={onEditClick}
                    aria-label="Edit profile"
                    type="button"
                >
                    <PencilIcon size={16} />
                </button>
            </Can>
        </div>
    );
};

const StatBox = ({
    value,
    label,
}: {
    value: React.ReactNode;
    label: string;
}) => (
    <div className={styles.statBox}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
    </div>
);
