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
    /**
     * Zero-filled daily playtime for the band's last cell (90 days). Empty
     * or absent = no sparkline cell — the band's omit-if-missing rule.
     */
    activity?: number[];
}

/**
 * The band's ambient telemetry: daily playtime as a bare polyline, sized
 * to sit on the numerals' baseline. Decorative summary of the Stats tab's
 * real chart — no axes, no tooltip, aria-hidden.
 */
function Sparkline({ values }: { values: number[] }) {
    const w = 120;
    const h = 30;
    const max = Math.max(...values);
    if (max <= 0) return null;
    const step = w / Math.max(values.length - 1, 1);
    const d = values
        .map(
            (v, i) =>
                `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(
                    h - (v / max) * (h - 2) - 1
                ).toFixed(1)}`,
        )
        .join(' ');
    return (
        <svg
            className={styles.statSpark}
            viewBox={`0 0 ${w} ${h}`}
            width={w}
            height={h}
            aria-hidden
        >
            <path
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
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
    activity,
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
    ]
        .filter(Boolean)
        .join(' · ');

    // Full hero only: the game's scale, promoted to a stat band instead of
    // hiding in the facts line — these numbers are the page's best argument
    // for itself. Same omit-if-zero rule as everywhere else, so a stat-less
    // game renders no band at all rather than a row of zeroes.
    const bandCells =
        variant === 'full'
            ? [
                  {
                      label: 'Runners',
                      value: formatCount(stats.uniqueRunners),
                      show: stats.uniqueRunners > 0,
                  },
                  {
                      label: 'Attempts',
                      value: formatCount(stats.totalAttemptCount),
                      show: stats.totalAttemptCount > 0,
                  },
                  {
                      label: 'Hours played',
                      value: formatHours(stats.totalRunTime),
                      show: stats.totalRunTime > 0,
                  },
                  {
                      label: 'PBs set',
                      value: formatCount(stats.totalPbs),
                      show: stats.totalPbs > 0,
                  },
              ].filter((c) => c.show)
            : [];

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
                        width={variant === 'condensed' ? 64 : 132}
                        height={variant === 'condensed' ? 85 : 176}
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
                    {bandCells.length > 0 && (
                        <div className={styles.statBand}>
                            {bandCells.map((c) => (
                                <div key={c.label} className={styles.statCell}>
                                    <span className={styles.statBandValue}>
                                        {c.value}
                                    </span>
                                    <span className={styles.statBandLabel}>
                                        {c.label}
                                    </span>
                                </div>
                            ))}
                            {variant === 'full' &&
                                activity &&
                                activity.length > 0 && (
                                    <div className={styles.statCell}>
                                        <Sparkline values={activity} />
                                        <span className={styles.statBandLabel}>
                                            Activity · 90d
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
                            href={`/games-v2/${encodeURIComponent(game.name)}/manage`}
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
