'use client';

import { Discord } from 'react-bootstrap-icons';
import Link from '~src/components/link';
import { buildCurationHref, buildSubmitHref } from '~src/lib/board-url';
import type { GameMetadata } from '~src/lib/game-mgmt';
import { formatCount, formatHours } from '~src/utils/format-stats';
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
        variant === 'condensed' && stats.uniqueRunners > 0
            ? `${formatCount(stats.uniqueRunners)} runners`
            : null,
        variant === 'condensed' && stats.totalAttemptCount > 0
            ? `${formatCount(stats.totalAttemptCount)} attempts`
            : null,
        // Full hero: the former stat band's numbers, folded into the facts
        // line instead of their own row (density pass) — same "omit if
        // missing" rule the band used (hours already guarded on > 0; runners
        // and runs guarded the same way so a stat-less game never renders
        // "0 runners").
        variant === 'full' && stats.uniqueRunners > 0
            ? `${formatCount(stats.uniqueRunners)} runners`
            : null,
        variant === 'full' && stats.totalAttemptCount > 0
            ? `${formatCount(stats.totalAttemptCount)} runs`
            : null,
        variant === 'full' && stats.totalRunTime > 0
            ? `${formatHours(stats.totalRunTime)} h played`
            : null,
    ]
        .filter(Boolean)
        .join(' · ');

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
                        // With the category title line removed from the
                        // plate, the game name is the page heading again —
                        // visually small (the board is identified by the
                        // active category chip and the document title), but
                        // semantically the h1.
                        <h1 className={styles.heroTitleCondensed}>
                            {game.display}
                        </h1>
                    ) : (
                        <h1 className={styles.heroTitle}>{game.display}</h1>
                    )}
                    {factsLine && (
                        <p className={styles.heroFactsLine}>{factsLine}</p>
                    )}
                </div>
                <div className={styles.heroActions}>
                    {claim && !claim.hasModerators && (
                        <ClaimCta claim={claim} gameDisplay={game.display} />
                    )}
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
                            Manage
                        </Link>
                    )}
                    {/* On a board view (categorySlug set), the one-click door
                        to curating exactly this board — category and
                        subcategory ride along. The wall has no board slice,
                        so no chip. */}
                    {(canManage || canModerate) && categorySlug && (
                        <Link
                            href={buildCurationHref(game.name, {
                                categorySlug,
                                subcategoryKey,
                            })}
                            className={styles.quietChip}
                        >
                            Curate board
                        </Link>
                    )}
                    {/* Primary action last — the rightmost slot in the
                        cluster, so quiet chips lead into it. */}
                    <Link href={submitHref} className={styles.primaryAction}>
                        Submit a run
                    </Link>
                </div>
            </div>
        </header>
    );
}
