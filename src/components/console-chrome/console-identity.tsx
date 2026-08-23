import { hasFlag } from 'country-flag-icons';
import { countries } from '~src/common/countries';
import Link from '~src/components/link';
import type { User } from '../../../types/session.types';
import styles from './console.module.scss';

/**
 * Identity masthead for the settings console header — avatar + username +
 * country + notable role badges + a link out to the public profile. Renders
 * into ConsoleChrome's optional `header.identity` slot; the manage/admin
 * console passes no identity and keeps its eyebrow+title header unchanged.
 *
 * Server component: everything here comes from the already-loaded session,
 * so there is no client state and no extra fetch.
 */
export function ConsoleIdentity({ user }: { user: User }) {
    const username = user.username;
    const profileHref = `/${encodeURIComponent(username)}`;
    const badges = roleBadges(user.roles, user.moderatedGames);
    const country = user.country;
    const countryName =
        country && (countries() as Record<string, string>)[country];

    return (
        <div className={styles.identity}>
            {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    className={styles.identityAvatar}
                    src={user.picture}
                    alt=""
                    width={56}
                    height={56}
                    loading="eager"
                />
            ) : (
                <span
                    className={styles.identityAvatar}
                    data-fallback
                    aria-hidden="true"
                >
                    {username.charAt(0)}
                </span>
            )}

            <div className={styles.identityBody}>
                <div className={styles.identityEyebrow}>Settings</div>
                <h1 className={styles.identityName}>
                    <Link
                        href={profileHref}
                        className={styles.identityNameLink}
                    >
                        {username}
                    </Link>
                </h1>
                <div className={styles.identityMeta}>
                    {country && hasFlag(country) && (
                        <span className={styles.identityFlag}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                alt={countryName || country}
                                title={countryName || country}
                                loading="lazy"
                                src={`https://raw.githubusercontent.com/hampusborgos/country-flags/main/svg/${country.toLowerCase()}.svg`}
                            />
                            {countryName || country}
                        </span>
                    )}
                    {badges.map((b) => (
                        <span
                            key={b.label}
                            className={styles.identityBadge}
                            data-tone={b.tone}
                        >
                            {b.label}
                        </span>
                    ))}
                </div>
            </div>

            <Link href={profileHref} className={styles.identityProfileLink}>
                View public profile
            </Link>
        </div>
    );
}

type Badge = { label: string; tone: 'gold' | 'primary' | 'muted' };

/**
 * Curate the raw role list into a few human-readable badges — showing the
 * raw role strings (`patreon2`, `role-admin`) would read as debug output.
 * Supporter collapses the patreon tiers; moderator covers both the role and
 * having any moderated games.
 */
function roleBadges(
    roles: string[] | undefined,
    moderatedGames: string[] | undefined,
): Badge[] {
    const set = new Set(roles ?? []);
    const badges: Badge[] = [];

    if (set.has('admin')) badges.push({ label: 'Admin', tone: 'primary' });
    if (
        set.has('moderator') ||
        set.has('board-admin') ||
        (moderatedGames?.length ?? 0) > 0
    )
        badges.push({ label: 'Moderator', tone: 'muted' });
    if ([...set].some((r) => r.startsWith('patreon')))
        badges.push({ label: 'Supporter', tone: 'gold' });

    return badges;
}
