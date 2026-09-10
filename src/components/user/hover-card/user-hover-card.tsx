'use client';

import { useEffect, useState } from 'react';
import {
    Bluesky,
    Trophy,
    Twitch,
    TwitterX,
    Youtube,
} from 'react-bootstrap-icons';
import { nameHue } from '~app/(new-layout)/games-v2/[game]/leaderboard/avatar-hue';
import { relativeDate } from '~app/(new-layout)/games-v2/[game]/leaderboard/relative-date';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import { formatCount, formatHours } from '~src/utils/format-stats';
import type {
    UserCardContext,
    UserCardProfile,
} from '../../../../types/user-card.types';
import { CountryFlag } from './country-flag';
import { type SocialNetwork, socialLinks } from './social-links';
import { loadUserCard, peekUserCard } from './user-card-store';
import styles from './user-hover-card.module.scss';

interface Props {
    username: string;
    /** What the hovered surface already knows. Painted before the fetch lands. */
    context?: UserCardContext;
}

const SOCIAL_ICON: Record<SocialNetwork, typeof Twitch> = {
    twitch: Twitch,
    youtube: Youtube,
    twitter: TwitterX,
    bluesky: Bluesky,
};

/**
 * The runner's own clock ("11:05 PM"), from their profile timezone. Stored
 * free-form, so anything Intl doesn't recognise simply shows nothing.
 */
function localTimeIn(timezone: string | undefined): string | null {
    if (!timezone) return null;
    try {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone,
        }).format(new Date());
    } catch {
        return null;
    }
}

function initials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;
    return name.slice(0, 2);
}

function Avatar({ name, picture }: { name: string; picture?: string | null }) {
    const [failed, setFailed] = useState(false);

    if (picture && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                aria-hidden
                alt=""
                className={styles.avatar}
                src={picture}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <span
            aria-hidden
            className={styles.avatar}
            style={{ backgroundColor: `hsl(${nameHue(name)} 32% 42%)` }}
        >
            {initials(name)}
        </span>
    );
}

export function UserHoverCard({ username, context }: Props) {
    // A runner hovered earlier in the session paints instantly, with no
    // skeleton frame in between.
    const [profile, setProfile] = useState<UserCardProfile | null | undefined>(
        () => peekUserCard(username),
    );

    useEffect(() => {
        if (profile !== undefined) return;

        let live = true;
        loadUserCard(username).then((result) => {
            if (live) setProfile(result);
        });

        return () => {
            live = false;
        };
    }, [username, profile]);

    const card = profile?.card;
    const picture = profile?.picture ?? context?.picture;
    const country = profile?.country ?? context?.country;
    const links = socialLinks(profile?.socials);
    const localTime = localTimeIn(profile?.timezone);
    const finishedRate =
        card && card.attemptCount > 0
            ? Math.round((card.finishedAttemptCount / card.attemptCount) * 100)
            : null;
    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
          })
        : null;

    return (
        <div className={styles.card}>
            <div className={styles.identity}>
                <Avatar name={username} picture={picture} />
                <div className={styles.identityText}>
                    <span className={styles.name}>
                        {username}
                        {country ? <CountryFlag country={country} /> : null}
                        {profile?.aka ? (
                            <span className={styles.aka}>{profile.aka}</span>
                        ) : null}
                    </span>
                    <span className={styles.meta}>
                        {profile?.pronouns ? (
                            <span>{profile.pronouns}</span>
                        ) : null}
                        {localTime ? <span>{localTime} for them</span> : null}
                        {memberSince ? (
                            <span>Runner since {memberSince}</span>
                        ) : null}
                    </span>
                </div>
            </div>

            {profile?.bio ? <p className={styles.bio}>{profile.bio}</p> : null}

            {links.length > 0 ? (
                <div className={styles.socials}>
                    {links.map((link) => {
                        const Icon = SOCIAL_ICON[link.network];
                        return (
                            <a
                                key={link.network}
                                href={link.href}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={styles.social}
                                aria-label={`${username} on ${link.label}`}
                                title={link.label}
                            >
                                <Icon size={13} aria-hidden />
                            </a>
                        );
                    })}
                </div>
            ) : null}

            {context?.rank && context?.timeMs ? (
                <div className={styles.context}>
                    <span className={styles.contextRank}>#{context.rank}</span>
                    <span className={styles.contextLabel}>
                        {context.label ?? 'on this board'}
                    </span>
                    <span className={styles.contextTime}>
                        {formatTimeMs(context.timeMs)}
                    </span>
                </div>
            ) : null}

            {profile === undefined ? (
                <div className={styles.skeleton} aria-hidden>
                    <span />
                    <span />
                    <span />
                </div>
            ) : null}

            {card?.imported ? (
                // No native run data — this runner is on the board only via an
                // import, so the zeroed stats block would read as a broken
                // card. Say what it actually is instead, without naming the
                // source site.
                <p className={styles.imported}>
                    Imported runs only — nothing tracked here yet
                </p>
            ) : null}

            {card && !card.imported ? (
                <>
                    <div className={styles.stats}>
                        <span>
                            <b>{formatCount(card.runCount)}</b> runs
                        </span>
                        <span>
                            <b>{formatCount(card.gameCount)}</b> games
                        </span>
                        <span>
                            <b>{formatHours(card.playtime)}</b> h played
                        </span>
                    </div>

                    {card.attemptCount > 0 ? (
                        <div className={styles.attempts}>
                            <b>{formatCount(card.attemptCount)}</b> attempts
                            {finishedRate != null ? (
                                <span>
                                    {' · '}
                                    <b>{finishedRate}%</b> finished
                                </span>
                            ) : null}
                        </div>
                    ) : null}

                    {card.topRuns.length ? (
                        <ul className={styles.topRuns}>
                            {card.topRuns.map((run) => (
                                <li key={`${run.game}-${run.category}`}>
                                    <span className={styles.runGame}>
                                        {run.game}
                                    </span>
                                    <span className={styles.runCategory}>
                                        {run.category}
                                    </span>
                                    <span className={styles.runTime}>
                                        {run.personalBest === null
                                            ? '—'
                                            : formatTimeMs(run.personalBest)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    {card.latestPb ? (
                        <div className={styles.latest}>
                            <Trophy aria-hidden size={13} />
                            <span className={styles.latestText}>
                                {card.latestPb.game} {card.latestPb.category}
                            </span>
                            <span className={styles.runTime}>
                                {formatTimeMs(card.latestPb.time)}
                            </span>
                            <span className={styles.latestWhen}>
                                {relativeDate(card.latestPb.achievedAt)}
                            </span>
                        </div>
                    ) : null}
                </>
            ) : null}

            {profile === null ? (
                <p className={styles.empty}>No public runs yet.</p>
            ) : null}
        </div>
    );
}
