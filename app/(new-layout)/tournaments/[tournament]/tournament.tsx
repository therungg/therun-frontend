'use client';

import moment from 'moment';
import Link from 'next/link';
import React, { useState } from 'react';
import { User } from 'types/session.types';
import { CategoryLeaderboard } from '~app/(new-layout)/games/[game]/game.types';
import { LiveDataMap } from '~app/(new-layout)/live/live.types';
import { LiveTabContent } from '~app/(new-layout)/tournaments/[tournament]/live/live-tab-content';
import { TournamentTimer } from '~app/(new-layout)/tournaments/[tournament]/tournament-timer';
import { GameLink, UserLink } from '~src/components/links/links';
import {
    Tournament,
    TournamentInfo,
} from '~src/components/tournament/tournament-info';
import infoStyles from '~src/components/tournament/tournament-info-actions.module.scss';
import { TournamentRuns } from '~src/components/tournament/tournament-runs';
import { TournamentStandings } from '~src/components/tournament/tournament-standings';
import TournamentStats from '~src/components/tournament/tournament-stats';
import { DurationToFormatted } from '~src/components/util/datetime';
import { getPeriodNoun } from '~src/lib/tournament-periods';
import {
    canManageAdmins,
    hasCapability,
    isTournamentAdmin,
    lifecycleStatus,
} from '~src/lib/tournament-permissions';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './tournament-detail.module.scss';

type TabKey = 'live' | 'info' | 'runs' | 'standings' | 'stats';

type HeroStatus =
    | 'active'
    | 'upcoming'
    | 'ended'
    | 'locked'
    | 'finalized'
    | 'archived';

const STATUS_LABEL: Record<HeroStatus, string> = {
    active: 'Live',
    upcoming: 'Upcoming',
    ended: 'Ended',
    locked: 'Locked',
    finalized: 'Finalized',
    archived: 'Archived',
};

const STATUS_TONE: Record<HeroStatus, string> = {
    active: 'var(--bs-primary)',
    upcoming: 'var(--bs-info)',
    ended: 'var(--bs-secondary-color)',
    locked: '#f59e0b',
    finalized: 'var(--bs-secondary-color)',
    archived: 'var(--bs-secondary-color)',
};

const STATUS_BG: Record<HeroStatus, string> = {
    active: 'rgba(var(--bs-primary-rgb), 0.12)',
    upcoming: 'rgba(var(--bs-info-rgb), 0.12)',
    ended: 'rgba(var(--bs-secondary-rgb), 0.12)',
    locked: 'rgba(245, 158, 11, 0.12)',
    finalized: 'rgba(var(--bs-secondary-rgb), 0.12)',
    archived: 'rgba(var(--bs-secondary-rgb), 0.12)',
};

function summarizePeriods(
    periods: Tournament['eligiblePeriods'] | undefined,
): string {
    if (!periods?.length) return '—';
    const sorted = [...periods].sort(
        (a, b) => Date.parse(a.startDate) - Date.parse(b.startDate),
    );
    const start = moment(sorted[0].startDate);
    const end = moment(sorted[sorted.length - 1].endDate);
    if (!start.isValid() || !end.isValid()) return '—';
    const sameYear = start.year() === end.year();
    const sameMonth = sameYear && start.month() === end.month();
    const sameDay = sameMonth && start.date() === end.date();
    if (sameDay) return start.format('MMM D, YYYY');
    if (sameMonth) return `${start.format('MMM D')}–${end.format('D, YYYY')}`;
    if (sameYear)
        return `${start.format('MMM D')} – ${end.format('MMM D, YYYY')}`;
    return `${start.format('MMM D, YYYY')} – ${end.format('MMM D, YYYY')}`;
}

export const GenericTournament = ({
    liveDataMap,
    session,
    username,
    tournament,
    tab,
    stats,
    qualifierData,
    standingsTournaments,
}: {
    liveDataMap: LiveDataMap;
    session: User;
    username?: string;
    tournament: Tournament;
    tab: string;
    stats?: unknown;
    qualifierData?: Tournament | null;
    standingsTournaments?: Tournament[] | null;
}) => {
    const gameTime = !!tournament.gameTime;

    let tournamentLeaderboards: CategoryLeaderboard | null = null;
    if (tournament.leaderboards) {
        tournamentLeaderboards =
            gameTime && tournament.leaderboards.gameTime
                ? (tournament.leaderboards
                      .gameTime as unknown as CategoryLeaderboard)
                : (tournament.leaderboards as unknown as CategoryLeaderboard);
    }

    const data = stats as
        | { runList?: unknown[]; stats?: { totalPlayers?: number } }
        | undefined;

    const baseStatus = lifecycleStatus(tournament);
    const now = Date.now();
    const startMs = tournament.startDate
        ? Date.parse(tournament.startDate)
        : NaN;
    const endMs = tournament.endDate ? Date.parse(tournament.endDate) : NaN;
    let status: HeroStatus = baseStatus;
    if (baseStatus === 'active') {
        if (!Number.isNaN(endMs) && endMs < now) status = 'ended';
        else if (!Number.isNaN(startMs) && startMs > now) status = 'upcoming';
    }
    const tournamentHref = `/tournaments/${safeEncodeURI(tournament.name)}`;
    const periodNoun = getPeriodNoun(tournament);

    const canEditSettings = hasCapability(session, tournament, 'edit_settings');
    const canManage =
        isTournamentAdmin(session, tournament) ||
        canManageAdmins(session) ||
        hasCapability(session, tournament, 'manage_staff') ||
        hasCapability(session, tournament, 'manage_participants') ||
        hasCapability(session, tournament, 'manage_runs') ||
        hasCapability(session, tournament, 'lifecycle');

    const recordHolder = tournamentLeaderboards?.pbLeaderboard?.[0];
    const totalParticipants =
        tournamentLeaderboards?.pbLeaderboard?.length ??
        data?.stats?.totalPlayers ??
        null;
    const totalRuns = data?.runList?.length ?? null;

    const heroArt = tournament.logoUrl
        ? `/${tournament.logoUrl}`
        : tournament.gameImage && tournament.gameImage !== 'noimage'
          ? tournament.gameImage
          : '/logo_dark_theme_no_text_transparent.png';

    const allTabs: { key: TabKey; label: string; visible: boolean }[] = [
        { key: 'live', label: 'Live', visible: true },
        { key: 'info', label: 'Info', visible: true },
        { key: 'runs', label: 'Runs', visible: true },
        {
            key: 'standings',
            label: 'Standings',
            visible:
                !!tournament.pointDistribution &&
                !!standingsTournaments &&
                standingsTournaments.length > 0,
        },
        { key: 'stats', label: 'Stats', visible: true },
    ];
    const tabs = allTabs.filter((t) => t.visible);

    const initialTab = (tabs.find((t) => t.key === tab)?.key ??
        'live') as TabKey;
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    const socials = tournament.socials
        ? Object.values(tournament.socials).filter(Boolean)
        : [];

    return (
        <div className={styles.shell}>
            <div className={styles.breadcrumbBar}>
                <Link href="/tournaments" className={styles.breadcrumb}>
                    <span className={styles.breadcrumbArrow}>←</span>
                    All tournaments
                </Link>
                <div className={styles.topActions}>
                    {!tournament.eligibleUsers?.length && (
                        <a
                            href="/livesplit"
                            rel="noreferrer"
                            target="_blank"
                            className={styles.helpLink}
                        >
                            How does this work?
                        </a>
                    )}
                    {canEditSettings && (
                        <Link
                            href={`${tournamentHref}/edit`}
                            className={infoStyles.actionPill}
                        >
                            Edit info
                        </Link>
                    )}
                    {canManage && (
                        <Link
                            href={`${tournamentHref}/manage`}
                            className={`${infoStyles.actionPill} ${infoStyles.actionPillAccent}`}
                        >
                            Manage
                        </Link>
                    )}
                </div>
            </div>

            <div className={styles.hero}>
                <div className={styles.heroArt}>
                    <img src={heroArt} alt={`${tournament.name} art`} />
                </div>
                <div className={styles.heroBody}>
                    <div className={styles.heroEyebrowRow}>
                        <span
                            className={`${styles.heroStatusPill} ${
                                status === 'active'
                                    ? styles.heroStatusActive
                                    : ''
                            }`}
                            style={{
                                background: STATUS_BG[status],
                                color: STATUS_TONE[status],
                            }}
                        >
                            {STATUS_LABEL[status]}
                        </span>
                        {tournament.organizer && (
                            <span className={styles.heroOrganizer}>
                                by {tournament.organizer}
                            </span>
                        )}
                    </div>

                    <h1 className={styles.heroTitle}>
                        {tournament.shortName || tournament.name}
                    </h1>

                    {tournament.eligibleRuns?.[0] && (
                        <div className={styles.heroGameRow}>
                            <span
                                className={`${styles.gameChip} ${styles.gameChipMain}`}
                            >
                                <GameLink
                                    game={tournament.eligibleRuns[0].game}
                                />{' '}
                                — {tournament.eligibleRuns[0].category}
                            </span>
                        </div>
                    )}

                    <div className={styles.heroMetaRow}>
                        <div className={styles.heroTimer}>
                            <TournamentTimer tournament={tournament} />
                        </div>
                        {socials.length > 0 && (
                            <div className={styles.heroSocialRow}>
                                {socials.map((s) => (
                                    <a
                                        key={s.url}
                                        href={s.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.socialIcon}
                                    >
                                        {s.display}: {s.urlDisplay}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {tournament.lockedAt && !tournament.finalizedAt && (
                <div className={`${styles.banner} ${styles.bannerLocked}`}>
                    <span className={styles.bannerIcon}>◐</span>
                    <span className={styles.bannerBody}>
                        <strong>Locked.</strong> New runs will not be matched
                        into this tournament until it's unlocked.
                    </span>
                </div>
            )}
            {tournament.finalizedAt && (
                <div className={`${styles.banner} ${styles.bannerFinalized}`}>
                    <span className={styles.bannerIcon}>◉</span>
                    <span className={styles.bannerBody}>
                        <strong>Finalized.</strong> This tournament is closed.
                        Leaderboards and runs are read-only.
                    </span>
                </div>
            )}
            {tournament.hide && (
                <div className={`${styles.banner} ${styles.bannerArchived}`}>
                    <span className={styles.bannerIcon}>◇</span>
                    <span className={styles.bannerBody}>
                        <strong>Archived.</strong> Hidden from the public list.
                        Direct links still work.
                    </span>
                </div>
            )}

            <div className={styles.statStrip}>
                <div className={styles.statTile}>
                    <span className={styles.statLabel}>Current record</span>
                    {recordHolder ? (
                        <>
                            <span
                                className={`${styles.statValue} ${styles.statValueAccent}`}
                            >
                                <DurationToFormatted
                                    duration={String(recordHolder.stat)}
                                />
                            </span>
                            <span className={styles.statSub}>
                                by <UserLink username={recordHolder.username} />
                            </span>
                        </>
                    ) : (
                        <span className={styles.statValue}>—</span>
                    )}
                </div>
                <div className={styles.statTile}>
                    <span className={styles.statLabel}>Participants</span>
                    <span className={styles.statValue}>
                        {totalParticipants ?? '—'}
                    </span>
                    <span className={styles.statSub}>
                        {tournament.eligibleUsers?.length
                            ? 'Invite-only'
                            : 'Open tournament'}
                    </span>
                </div>
                <div className={styles.statTile}>
                    <span className={styles.statLabel}>Total runs</span>
                    <span className={styles.statValue}>{totalRuns ?? '—'}</span>
                    <span className={styles.statSub}>
                        {tournament.gameTime ? 'In-game time' : 'Real time'}
                    </span>
                </div>
                <div className={styles.statTile}>
                    <span className={styles.statLabel}>
                        {(tournament.eligiblePeriods?.length ?? 0) > 1
                            ? periodNoun.plural[0].toUpperCase() +
                              periodNoun.plural.slice(1)
                            : periodNoun.singular[0].toUpperCase() +
                              periodNoun.singular.slice(1)}
                    </span>
                    <span
                        className={styles.statValue}
                        style={{ fontSize: '1rem', lineHeight: 1.2 }}
                    >
                        {summarizePeriods(tournament.eligiblePeriods)}
                    </span>
                    <span className={styles.statSub}>
                        {(tournament.eligiblePeriods?.length ?? 0) > 1
                            ? `${tournament.eligiblePeriods?.length} ${periodNoun.plural}`
                            : tournament.eligibleRuns?.[0]
                              ? `${tournament.eligibleRuns[0].game} — ${tournament.eligibleRuns[0].category}`
                              : '—'}
                    </span>
                </div>
            </div>

            <nav className={styles.tabBar}>
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        className={
                            activeTab === t.key
                                ? `${styles.tab} ${styles.tabActive}`
                                : styles.tab
                        }
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <div hidden={activeTab !== 'live'}>
                <LiveTabContent
                    tournament={tournament}
                    initialLiveDataMap={liveDataMap}
                    username={username}
                    tournamentLeaderboards={tournamentLeaderboards}
                    qualifierData={qualifierData}
                />
            </div>

            {activeTab === 'info' && <TournamentInfo tournament={tournament} />}

            {activeTab === 'runs' && (
                <div className={styles.section}>
                    <header className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>All runs</h2>
                    </header>
                    <TournamentRuns
                        data={data as { runList: unknown[] }}
                        tournament={tournament}
                        user={session}
                    />
                </div>
            )}

            {activeTab === 'standings' &&
                tournament.pointDistribution &&
                standingsTournaments && (
                    <div className={styles.section}>
                        <header className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Standings</h2>
                        </header>
                        <TournamentStandings
                            tournaments={standingsTournaments}
                        />
                    </div>
                )}

            {activeTab === 'stats' && (
                <TournamentStats
                    data={data as Parameters<typeof TournamentStats>[0]['data']}
                    tournament={tournament}
                    gameTime={!!tournament.gameTime}
                />
            )}
        </div>
    );
};
