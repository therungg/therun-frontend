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

    return (
        <header className={styles.hero}>
            <div className={styles.heroTop}>
                {cover && (
                    <img
                        src={cover}
                        alt={game.display}
                        width={96}
                        height={128}
                        className={styles.heroCover}
                        loading="eager"
                    />
                )}
                <div className={styles.heroText}>
                    <h1 className={styles.heroTitle}>{game.display}</h1>
                    {gameMeta.summary && (
                        <p className={styles.heroSummary}>{gameMeta.summary}</p>
                    )}
                    <div className={styles.heroActions}>
                        {claim && !claim.hasModerators && (
                            <ClaimCta
                                claim={claim}
                                gameDisplay={game.display}
                            />
                        )}
                        <Link
                            href={submitHref}
                            className={styles.primaryAction}
                        >
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
                {facts.length > 0 && (
                    <dl className={styles.factsGrid}>
                        {facts.map((f) => (
                            <div key={f.label} className={styles.fact}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
            <div className={styles.heroStrip}>
                <div className={styles.heroStat}>
                    <b>{stats.uniqueRunners.toLocaleString()}</b>
                    <span>Runners</span>
                </div>
                <div className={styles.heroStat}>
                    <b>{stats.totalAttemptCount.toLocaleString()}</b>
                    <span>Attempts</span>
                </div>
                <div className={styles.heroStat}>
                    <b>
                        <DurationToFormatted duration={stats.totalRunTime} />
                    </b>
                    <span>Playtime</span>
                </div>
                {gameMeta.seriesDisplay && (
                    <span className={styles.seriesNote}>
                        Part of the {gameMeta.seriesDisplay} series
                    </span>
                )}
            </div>
        </header>
    );
}
