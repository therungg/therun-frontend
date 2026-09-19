import { type CSSProperties, Suspense } from 'react';
import { Bluesky, Twitch, Twitter, Youtube } from 'react-bootstrap-icons';
import { countries } from '~src/common/countries';
import Link from '~src/components/link';
import { CountryFlag } from '~src/components/user/hover-card/country-flag';
import {
    type SocialNetwork,
    socialLinks,
} from '~src/components/user/hover-card/social-links';
import { userHref } from '~src/lib/user-href';
import type { RunnerProfileHead } from '../../../../types/runner-profile.types';
import { RunnerAvatar } from '../../games/[game]/leaderboard/runner-avatar';
import { EditProfileLink } from './edit-profile-link';
import { LocalTime } from './local-time';
import styles from './sections.module.scss';

const SOCIAL_ICON: Record<SocialNetwork, typeof Twitch> = {
    twitch: Twitch,
    youtube: Youtube,
    twitter: Twitter,
    bluesky: Bluesky,
};

function countryName(code: string | null): string | null {
    if (!code) return null;
    return (countries() as Record<string, string>)[code] ?? code.toUpperCase();
}

/** Who this runner is, on every section page; the name leads back to the profile. */
export function SectionHeader({ head }: { head: RunnerProfileHead }) {
    const { runner } = head;
    const since = runner.runningSince
        ? new Date(runner.runningSince).getUTCFullYear()
        : null;
    const country = countryName(runner.country);
    const aka =
        runner.aka && runner.aka.toLowerCase() !== runner.name.toLowerCase()
            ? runner.aka
            : null;
    // Every account here signed in with Twitch, so the name is a channel;
    // a guest or a deleted account is the exception, not the rule.
    const links = socialLinks(runner.socials, {
        twitchName: runner.guest || runner.deleted ? null : runner.name,
    });
    const bio = runner.bio?.trim() || null;
    const canEdit = !runner.guest && !runner.deleted;

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
                <div className={styles.nameRow}>
                    <h1 className={styles.name}>
                        {runner.guest ? (
                            runner.name
                        ) : (
                            <Link href={userHref(runner.name)}>
                                {runner.name}
                            </Link>
                        )}
                    </h1>
                    {aka ? <span className={styles.aka}>aka {aka}</span> : null}
                </div>
                <ul className={styles.meta}>
                    {runner.pronouns ? <li>{runner.pronouns}</li> : null}
                    {runner.country ? (
                        <li className={styles.country}>
                            <CountryFlag country={runner.country} />
                            {country}
                        </li>
                    ) : null}
                    {runner.timezone ? (
                        <li>
                            <LocalTime timezone={runner.timezone} />
                        </li>
                    ) : null}
                    {since ? <li>Running since {since}</li> : null}
                    {runner.deleted ? <li>Account deleted</li> : null}
                    {runner.guest ? <li>No account on therun</li> : null}
                </ul>
            </div>
            {canEdit ? (
                <div className={styles.headerSide}>
                    <Suspense fallback={null}>
                        <EditProfileLink name={runner.name} />
                    </Suspense>
                </div>
            ) : null}
            {bio ? <p className={styles.bio}>{bio}</p> : null}
            {links.length > 0 ? (
                <ul className={styles.socials}>
                    {links.map((link) => {
                        const Icon = SOCIAL_ICON[link.network];
                        return (
                            <li key={link.network}>
                                <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`${runner.name} on ${link.label}`}
                                    style={
                                        {
                                            '--social-color': link.color,
                                        } as CSSProperties
                                    }
                                >
                                    <Icon size={14} aria-hidden />
                                    {link.label}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </header>
    );
}
