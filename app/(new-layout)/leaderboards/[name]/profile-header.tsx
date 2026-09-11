import type { ComponentType } from 'react';
import {
    Discord,
    Facebook,
    Github,
    Globe,
    Instagram,
    Link45deg,
    Mastodon,
    Reddit,
    Threads,
    Tiktok,
    Twitch,
    Twitter,
    TwitterX,
    Youtube,
} from 'react-bootstrap-icons';
import { countries } from '~src/common/countries';
import Link from '~src/components/link';
import { CountryFlag } from '~src/components/user/hover-card/country-flag';
import type {
    LeaderboardsProfileRunner,
    LeaderboardsProfileStanding,
} from '../../../../types/leaderboards-profile.types';
import { RunnerAvatar } from '../../games-v2/[game]/leaderboard/runner-avatar';
import { HeroStats } from './hero-stats';
import styles from './leaderboards-profile.module.scss';

type IconType = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;

const SOCIAL_ICONS: Record<string, IconType> = {
    twitch: Twitch,
    youtube: Youtube,
    twitter: Twitter,
    x: TwitterX,
    bluesky: Globe,
    discord: Discord,
    instagram: Instagram,
    tiktok: Tiktok,
    github: Github,
    mastodon: Mastodon,
    reddit: Reddit,
    threads: Threads,
    facebook: Facebook,
};

const socialHref = (v: string) => (/^https?:\/\//i.test(v) ? v : null);

function countryName(country: string | null): string | null {
    if (!country) return null;
    return (countries() as Record<string, string>)[country] ?? null;
}

export function ProfileHeader({
    runner,
    standing,
}: {
    runner: LeaderboardsProfileRunner;
    standing: LeaderboardsProfileStanding;
}) {
    const guest = runner.userId === null;
    const country = countryName(runner.country);
    // Speedrun links are not shown on the profile.
    const socials = Object.entries(runner.socials)
        .filter(([key]) => !/speedrun/i.test(key))
        .map(([key, value]) => ({ key, href: socialHref(value) }))
        .filter((s): s is { key: string; href: string } => s.href !== null);

    return (
        <header className={styles.header}>
            <div className={styles.avatar}>
                <RunnerAvatar
                    name={runner.name}
                    picture={runner.picture}
                    size="md"
                />
            </div>
            <div className={styles.identity}>
                <h1 className={styles.name}>{runner.name}</h1>
                {runner.pronouns || runner.country ? (
                    <div className={styles.meta}>
                        {runner.pronouns ? (
                            <span>{runner.pronouns}</span>
                        ) : null}
                        {runner.country ? (
                            <span className={styles.country}>
                                <CountryFlag country={runner.country} />
                                {country ?? runner.country.toUpperCase()}
                            </span>
                        ) : null}
                    </div>
                ) : null}
                {socials.length > 0 ? (
                    <div className={styles.socials}>
                        {socials.map(({ key, href }) => {
                            const Icon =
                                SOCIAL_ICONS[key.toLowerCase()] ?? Link45deg;
                            return (
                                <a
                                    key={key}
                                    href={href}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                    aria-label={key}
                                    title={key}
                                >
                                    <Icon size={16} aria-hidden />
                                </a>
                            );
                        })}
                    </div>
                ) : null}
                {runner.deleted ? (
                    <p className={styles.stateNote}>
                        This account was deleted.
                    </p>
                ) : guest ? (
                    <p className={styles.stateNote}>No account on therun.</p>
                ) : null}
            </div>
            {!guest && !runner.deleted ? (
                <div className={styles.headerActions}>
                    <Link
                        href={`/${encodeURIComponent(runner.name)}`}
                        className={styles.actionPill}
                    >
                        Stats profile
                    </Link>
                </div>
            ) : null}
            <HeroStats standing={standing} />
        </header>
    );
}
