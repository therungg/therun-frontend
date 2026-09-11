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
import { formatDelta } from '~src/components/live/commentary-drawer/format';
import { formatTimeMs } from '~src/lib/run-view/time-format';
import type {
    UserCardContext,
    UserCardLive,
    UserCardProfile,
    UserCardStats,
} from '../../../../types/user-card.types';
import { CountryFlag } from './country-flag';
import { type SocialNetwork, socialLinks } from './social-links';
import { loadUserCard, loadUserLive, peekUserCard } from './user-card-store';
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

/** How many runs the playtime ladder lists. */
const LADDER_LIMIT = 4;

const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
});
const whole = new Intl.NumberFormat('en-US');

/** "7,568 h" — hours read as hours, never as "7.6K h". */
function hoursText(ms: number): string {
    const hours = ms / 3_600_000;
    if (hours < 10) return `${hours.toFixed(1)} h`;
    return `${whole.format(Math.round(hours))} h`;
}

/** Counts past ten thousand go compact ("157.6K"); below that, exact. */
function countText(n: number): string {
    return n >= 10_000 ? compact.format(n) : whole.format(n);
}

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

function LiveStrip({ username, run }: { username: string; run: UserCardLive }) {
    const delta = run.delta == null ? null : formatDelta(run.delta);
    // currentSplitIndex is the split being run, zero-based.
    const splitNumber = Math.min(run.currentSplitIndex + 1, run.splitCount);

    return (
        <a
            href={`/live/${encodeURIComponent(username)}`}
            className={styles.live}
        >
            <span className={styles.liveDot} aria-hidden />
            <span className={styles.liveText}>
                <b>Live</b> {run.game} {run.category}
            </span>
            {run.splitCount > 0 ? (
                <span className={styles.liveSplit}>
                    {splitNumber}/{run.splitCount}
                </span>
            ) : null}
            {delta ? (
                <span
                    className={`${styles.liveDelta} ${
                        delta.tone === 'ahead'
                            ? styles.ahead
                            : delta.tone === 'behind'
                              ? styles.behind
                              : ''
                    }`}
                >
                    {delta.text}
                </span>
            ) : null}
        </a>
    );
}

interface LadderRow {
    key: string;
    label: string;
    /** The game, when the ladder spans games. */
    sub?: string;
    pb: number | null;
    playtime: number;
}

/**
 * One splits file saved under several names shows up as several timer rows
 * with the same PB. A PB is to the millisecond, so an identical PB in the
 * same game is the same run: keep the most played row, drop the rest. The
 * backend already does this; this keeps an older payload honest too. Rows
 * without a PB are never merged.
 */
function dedupeRuns(rows: LadderRow[]): LadderRow[] {
    const seen = new Set<string>();
    return rows.filter((row) => {
        if (row.pb == null) return true;
        const key = `${row.sub ?? ''}#${row.pb}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function ladderRows(card: UserCardStats): LadderRow[] {
    const rows: LadderRow[] = card.game
        ? card.game.categories.map((c, i) => ({
              key: `${c.categorySlug}-${i}`,
              label: c.category,
              pb: c.personalBest ?? c.gameTimePb,
              playtime: c.playtime,
          }))
        : card.topRuns.map((r, i) => ({
              key: `${r.game}-${r.category}-${i}`,
              label: r.category,
              sub: r.game,
              pb: r.personalBest,
              playtime: r.playtime,
          }));

    // Most played first, so the row a repeat collapses into is the one
    // with the most hours.
    return dedupeRuns([...rows].sort((a, b) => b.playtime - a.playtime)).slice(
        0,
        LADDER_LIMIT,
    );
}

/**
 * Where the runner's hours went: one bar per run, sized against their most
 * played run. The card's one strong element — everything else stays quiet.
 */
function Ladder({ card }: { card: UserCardStats }) {
    const rows = ladderRows(card);
    if (rows.length === 0) return null;

    const top = Math.max(...rows.map((r) => r.playtime), 1);
    const game = card.game;

    return (
        <section className={styles.ladder}>
            <div className={styles.ladderHead}>
                <span className={styles.ladderTitle}>
                    {game ? game.gameDisplay : 'Most played'}
                </span>
                <span className={styles.ladderAside}>
                    {game
                        ? game.lastRunAt
                            ? `last ran ${relativeDate(game.lastRunAt)}`
                            : null
                        : `across ${countText(card.gameCount)} ${card.gameCount === 1 ? 'game' : 'games'}`}
                </span>
            </div>
            <ol className={styles.ladderRows}>
                {rows.map((row) => (
                    <li key={row.key} className={styles.ladderRow}>
                        <span className={styles.ladderLabel}>
                            <span className={styles.ladderName}>
                                {row.label}
                            </span>
                            {row.sub ? (
                                <span className={styles.ladderSub}>
                                    {row.sub}
                                </span>
                            ) : null}
                        </span>
                        <span className={styles.ladderPb}>
                            {row.pb == null ? '' : formatTimeMs(row.pb)}
                        </span>
                        <span className={styles.ladderTrack} aria-hidden>
                            <span
                                className={styles.ladderBar}
                                style={{
                                    width: `${Math.max(
                                        (row.playtime / top) * 100,
                                        2,
                                    )}%`,
                                }}
                            />
                        </span>
                        <span className={styles.ladderHours}>
                            {hoursText(row.playtime)}
                        </span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

interface KeyNumber {
    value: string;
    label: string;
}

/**
 * Three numbers that say how much this runner runs. The third is the
 * strongest standing we have for them: first places, else top-ten spots,
 * else races, else games.
 */
function keyNumbers(card: UserCardStats): KeyNumber[] {
    const numbers: KeyNumber[] = [
        { value: hoursText(card.playtime), label: 'played' },
        { value: countText(card.attemptCount), label: 'attempts' },
    ];

    const boards = card.boards;
    const races = card.races;
    if (boards && boards.first > 0) {
        numbers.push({
            value: countText(boards.first),
            label: boards.first === 1 ? 'first place' : 'first places',
        });
    } else if (boards && boards.topTen > 0) {
        numbers.push({
            value: countText(boards.topTen),
            label: 'top-ten spots',
        });
    } else if (races && races.totalRaces > 0) {
        numbers.push({
            value: countText(races.totalRaces),
            label: races.totalRaces === 1 ? 'race' : 'races',
        });
    } else {
        numbers.push({
            value: countText(card.gameCount),
            label: card.gameCount === 1 ? 'game' : 'games',
        });
    }

    return numbers;
}

/** The races line, when races didn't already take the third key number. */
function racesLine(card: UserCardStats): string | null {
    const races = card.races;
    if (!races || races.totalRaces === 0) return null;
    const boards = card.boards;
    const racesIsKeyNumber = !(
        boards &&
        (boards.first > 0 || boards.topTen > 0)
    );
    if (racesIsKeyNumber) {
        return `Finished ${Math.round(races.finishPercentage)}% of their races`;
    }
    return `Raced ${countText(races.totalRaces)} ${
        races.totalRaces === 1 ? 'time' : 'times'
    }, finished ${Math.round(races.finishPercentage)}%`;
}

export function UserHoverCard({ username, context }: Props) {
    const gameSlug = context?.gameSlug;

    // A runner hovered earlier in the session paints instantly, with no
    // skeleton frame in between.
    const [profile, setProfile] = useState<UserCardProfile | null | undefined>(
        () => peekUserCard(username, gameSlug),
    );
    const [liveRun, setLiveRun] = useState<UserCardLive | null>(null);

    useEffect(() => {
        if (profile !== undefined) return;

        let active = true;
        loadUserCard(username, gameSlug).then((result) => {
            if (active) setProfile(result);
        });

        return () => {
            active = false;
        };
    }, [username, gameSlug, profile]);

    // Asked on every open (the store dedupes within a short window), since
    // whether someone is live changes while the page sits open.
    useEffect(() => {
        let active = true;
        loadUserLive(username).then((result) => {
            if (active) setLiveRun(result);
        });

        return () => {
            active = false;
        };
    }, [username]);

    const card = profile?.card;
    const picture = profile?.picture ?? context?.picture;
    const country = profile?.country ?? context?.country;
    const links = socialLinks(profile?.socials);
    const localTime = localTimeIn(profile?.timezone);
    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
          })
        : null;
    const hasRuns = card != null && !card.imported;
    const races = card ? racesLine(card) : null;

    return (
        <div className={styles.card}>
            <header className={styles.identity}>
                <Avatar name={username} picture={picture} />
                <div className={styles.identityText}>
                    <span className={styles.name}>
                        <span className={styles.nameText}>{username}</span>
                        {country ? <CountryFlag country={country} /> : null}
                    </span>
                    {profile?.aka ? (
                        <span className={styles.aka}>{profile.aka}</span>
                    ) : null}
                    <span className={styles.meta}>
                        {profile?.pronouns ? (
                            <span>{profile.pronouns}</span>
                        ) : null}
                        {localTime ? <span>{localTime} there</span> : null}
                        {memberSince ? <span>since {memberSince}</span> : null}
                    </span>
                </div>
            </header>

            {profile?.bio || links.length > 0 ? (
                <div className={styles.about}>
                    {profile?.bio ? (
                        <p className={styles.bio}>{profile.bio}</p>
                    ) : (
                        <span />
                    )}
                    {links.length > 0 ? (
                        <span className={styles.socials}>
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
                        </span>
                    ) : null}
                </div>
            ) : null}

            {liveRun ? <LiveStrip username={username} run={liveRun} /> : null}

            {context?.rank && context?.timeMs ? (
                // The board's own rank mark: the podium ball its rows use,
                // a plain number past third. No box, no edge.
                <div className={styles.context}>
                    <span
                        className={`${styles.medal} ${
                            context.rank === 1
                                ? styles.medalGold
                                : context.rank === 2
                                  ? styles.medalSilver
                                  : context.rank === 3
                                    ? styles.medalBronze
                                    : styles.medalPlain
                        }`}
                    >
                        {context.rank > 3 ? `#${context.rank}` : context.rank}
                    </span>
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
                // import, so zeroed numbers would read as a broken card. Say
                // what it actually is instead, without naming the source site.
                <p className={styles.note}>
                    Imported runs only. Nothing tracked here yet.
                </p>
            ) : null}

            {hasRuns ? (
                <>
                    <dl className={styles.keyNumbers}>
                        {keyNumbers(card).map((n) => (
                            <div key={n.label} className={styles.keyNumber}>
                                <dt>{n.label}</dt>
                                <dd>{n.value}</dd>
                            </div>
                        ))}
                    </dl>

                    <Ladder card={card} />
                </>
            ) : null}

            {card && (card.latestPb || races) ? (
                <footer className={styles.foot}>
                    {card.latestPb ? (
                        <span className={styles.latest}>
                            <Trophy aria-hidden size={12} />
                            <span className={styles.latestText}>
                                Latest PB{' '}
                                <b>{formatTimeMs(card.latestPb.time)}</b> in{' '}
                                {card.latestPb.category}
                            </span>
                            <span className={styles.latestWhen}>
                                {relativeDate(card.latestPb.achievedAt)}
                            </span>
                        </span>
                    ) : null}
                    {races ? (
                        <span className={styles.races}>{races}</span>
                    ) : null}
                </footer>
            ) : null}

            {profile === null ? (
                <p className={styles.note}>No public runs yet.</p>
            ) : null}
        </div>
    );
}
