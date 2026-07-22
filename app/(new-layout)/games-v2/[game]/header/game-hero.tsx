'use client';

import Link from '~src/components/link';
import { DurationToFormatted } from '~src/components/util/datetime';
import { buildSubmitHref } from '~src/lib/board-url';
import type { GameMetadata } from '~src/lib/game-mgmt';
import type {
    QuickStats,
    ResolvedGame,
} from '../../../../../types/leaderboards.types';
import { ClaimCta, type ClaimCtaState } from '../claim/claim-cta';
import styles from '../game-page.module.scss';
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
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <header className={styles.hero}>
            <div className={styles.heroRow}>
                {cover && (
                    <img
                        src={cover}
                        alt={game.display}
                        width={132}
                        height={176}
                        className={styles.heroCover}
                        loading="eager"
                    />
                )}
                <div className={styles.heroText}>
                    <h1 className={styles.heroTitle}>{game.display}</h1>
                    {factsLine && (
                        <p className={styles.heroFactsLine}>{factsLine}</p>
                    )}
                    <p className={styles.heroStatsLine}>
                        <b>{stats.uniqueRunners.toLocaleString()}</b> runners ·{' '}
                        <b>{stats.totalAttemptCount.toLocaleString()}</b>{' '}
                        attempts ·{' '}
                        <b>
                            <DurationToFormatted
                                duration={stats.totalRunTime}
                            />
                        </b>{' '}
                        played
                    </p>
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
                            Discord
                        </a>
                    )}
                    {gameMeta.links.map((link) => (
                        <a
                            key={`${link.label}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.quietChip}
                        >
                            {link.label}
                        </a>
                    ))}
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
