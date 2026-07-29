'use client';

import { Discord } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { buildSubmitHref } from '~src/lib/board-url';
import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';
import { BackLink } from '../shared/back-link';
import { gameLinkIcon } from '../shared/game-link-icon';
import {
    deriveDeveloper,
    deriveGenres,
    derivePlatforms,
    deriveReleaseYear,
} from './game-facts';

interface Props {
    game: ResolvedGame;
    stats: QuickStats;
    gameMeta: GameMetadata;
    /** Active category slug — submit-link context only, never displayed. */
    categorySlug: string | null;
    /** Active subcategory key — submit-link context only, never displayed. */
    subcategoryKey: string;
    canManage?: boolean;
    canModerate?: boolean;
    claim?: ClaimCtaState | null;
    /**
     * Up-navigation shown above the hero. Set only on drill-down views that
     * have somewhere to go back to — a board reached from the category wall.
     * Omitted on the wall itself and on games whose root *is* the board.
     */
    back?: { href: string; label: string };
    /**
     * Cross-category standings link, shown opposite the back link. Board
     * pages pass it when the game has 2+ featured categories (same
     * suppression rule as ViewTabs — single-category standings is just the
     * board itself).
     */
    standingsHref?: string;
    /**
     * `full` (default) is the spec-sheet hero the category wall and the
     * standings page use, where the game is the subject. `condensed` is for
     * a board page, where the game is context and the category below it is
     * the subject: a small cover and one facts line, no stat band.
     */
    variant?: 'full' | 'condensed';
}

export function GameHero({
    game,
    stats,
    gameMeta,
    categorySlug,
    subcategoryKey,
    canManage,
    canModerate,
    claim,
    back,
    standingsHref,
    variant = 'full',
}: Props) {
    // Carries the current board context (category + subcategory) into the
    // submit form so it preselects both — see submit/page.tsx requirement 1.
    const submitHref = buildSubmitHref(game.name, {
        categorySlug: categorySlug ?? undefined,
        subcategoryKey,
    });
    // Moderator-set cover beats the auto-matched IGDB cover.
    const cover = gameMeta.coverUrl ?? game.image;
    const facts = [
        {
            label: 'Released',
            value: deriveReleaseYear(
                gameMeta.releaseYear,
                gameMeta.firstReleaseDate,
            ),
        },
        {
            label: 'Platform',
            value: derivePlatforms(gameMeta.platforms, gameMeta.igdbPlatforms),
        },
        { label: 'Developer', value: deriveDeveloper(gameMeta.companies) },
        { label: 'Genres', value: deriveGenres(gameMeta.genres) },
    ].filter((f): f is { label: string; value: string } => f.value !== null);

    const factsLine = [
        ...facts.map((f) => f.value),
        gameMeta.seriesDisplay
            ? `Part of the ${gameMeta.seriesDisplay} series`
            : null,
        variant === 'condensed'
            ? `${stats.uniqueRunners.toLocaleString()} runners`
            : null,
        variant === 'condensed' && stats.totalAttemptCount > 0
            ? `${stats.totalAttemptCount.toLocaleString()} attempts`
            : null,
    ]
        .filter(Boolean)
        .join(' · ');

    const hoursPlayed = Math.round(stats.totalRunTime / 3_600_000);

    return (
        <header
            className={
                variant === 'condensed' ? styles.heroCondensed : styles.hero
            }
        >
            {(back || standingsHref) && (
                <div className={styles.heroBack}>
                    {back && <BackLink href={back.href} label={back.label} />}
                    {standingsHref && (
                        <Link href={standingsHref} className={styles.quietLink}>
                            Cross-category standings
                        </Link>
                    )}
                </div>
            )}
            <div className={styles.heroRow}>
                {cover && (
                    <img
                        src={cover}
                        alt={game.display}
                        width={variant === 'condensed' ? 40 : 132}
                        height={variant === 'condensed' ? 53 : 176}
                        className={
                            variant === 'condensed'
                                ? styles.heroCoverSm
                                : styles.heroCover
                        }
                        loading="eager"
                    />
                )}
                <div className={styles.heroText}>
                    {variant === 'condensed' ? (
                        // The board line's <h1> (BoardMasthead) is the page
                        // heading here — the game is context, not the
                        // subject, so its name is not a heading at all and
                        // sits a full visual rank below the category title.
                        <p className={styles.heroTitleCondensed}>
                            {game.display}
                        </p>
                    ) : (
                        <h1 className={styles.heroTitle}>{game.display}</h1>
                    )}
                    {factsLine && (
                        <p className={styles.heroFactsLine}>{factsLine}</p>
                    )}
                    {variant === 'full' && (
                        <div className={styles.heroStatBand}>
                            <div className={styles.heroStat}>
                                <span className={styles.heroStatValue}>
                                    {stats.uniqueRunners.toLocaleString()}
                                </span>
                                <span className={styles.heroStatLabel}>
                                    runners
                                </span>
                            </div>
                            <div className={styles.heroStat}>
                                <span className={styles.heroStatValue}>
                                    {stats.totalAttemptCount.toLocaleString()}
                                </span>
                                <span className={styles.heroStatLabel}>
                                    attempts
                                </span>
                            </div>
                            {hoursPlayed > 0 && (
                                <div className={styles.heroStat}>
                                    <span className={styles.heroStatValue}>
                                        {hoursPlayed.toLocaleString()}
                                    </span>
                                    <span className={styles.heroStatLabel}>
                                        hours played
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className={styles.heroActions}>
                    {claim && !claim.hasModerators && (
                        <ClaimCta claim={claim} gameDisplay={game.display} />
                    )}
                    <Link href={submitHref} className={styles.primaryAction}>
                        Submit a run
                    </Link>
                    {gameMeta.discordUrl && (
                        <a
                            href={gameMeta.discordUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.quietChip}
                        >
                            <Discord size={13} aria-hidden /> Discord
                        </a>
                    )}
                    {gameMeta.links.map((link) => {
                        const LinkIcon = gameLinkIcon(link.label, link.url);
                        return (
                            <a
                                key={`${link.label}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.quietChip}
                            >
                                <LinkIcon size={13} aria-hidden /> {link.label}
                            </a>
                        );
                    })}
                    {(canManage || canModerate) && (
                        <Link
                            href={`/games-v2/${game.name}/manage`}
                            className={styles.quietChip}
                        >
                            {canModerate ? 'Moderate' : 'Manage'}
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
