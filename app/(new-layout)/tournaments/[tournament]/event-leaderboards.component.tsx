import React, { useMemo, useState } from 'react';
import { CategoryLeaderboard } from '~app/(new-layout)/games/[game]/game.types';
import { Tournament } from '~src/components/tournament/tournament-info';
import { DurationToFormatted } from '~src/components/util/datetime';
import { LeaderboardRow, PrettyLeaderboard } from './pretty-leaderboard';
import styles from './tournament-detail.module.scss';

type ViewKey =
    | 'pbIGT'
    | 'pb'
    | 'qualifier'
    | 'points'
    | 'attempts'
    | 'finishedAttempts'
    | 'playtime';

const formatDuration = (stat: string | number) => (
    <DurationToFormatted duration={stat.toString()} />
);
const formatNumber = (stat: string | number) =>
    typeof stat === 'number' ? stat.toLocaleString() : stat;

export const EventLeaderboards = ({
    tournament,
    gameTime,
    qualifierData,
    tournamentLeaderboards,
}: {
    tournament: Tournament;
    gameTime: boolean;
    qualifierData?: Tournament | null;
    tournamentLeaderboards: CategoryLeaderboard;
}) => {
    const [view, setView] = useState<ViewKey>(gameTime ? 'pbIGT' : 'pb');

    const views = useMemo(() => {
        const out: { key: ViewKey; label: string }[] = [];
        if (gameTime)
            out.push({ key: 'pbIGT', label: 'Tournament PB (loadless)' });
        out.push({ key: 'pb', label: 'Tournament PB' });
        if (qualifierData) out.push({ key: 'qualifier', label: 'Qualifier' });
        if (tournament.pointDistribution?.length)
            out.push({ key: 'points', label: 'Points' });
        out.push({ key: 'attempts', label: 'Attempts' });
        out.push({ key: 'finishedAttempts', label: 'Finished attempts' });
        out.push({ key: 'playtime', label: 'Playtime' });
        return out;
    }, [gameTime, qualifierData, tournament.pointDistribution]);

    if (!tournamentLeaderboards) {
        return (
            <div className={styles.lbWrap}>
                <div className={styles.lbEmpty}>No leaderboard data yet.</div>
            </div>
        );
    }

    let rows: LeaderboardRow[] | undefined;
    let formatStat: (stat: string | number, key: number) => React.ReactNode =
        formatDuration;
    let statLabel = '';

    switch (view) {
        case 'pbIGT':
            rows = tournamentLeaderboards.pbLeaderboard;
            statLabel = 'Tournament PB (IGT)';
            break;
        case 'pb':
            rows = tournament.leaderboards?.pbLeaderboard;
            statLabel = 'Tournament PB';
            break;
        case 'qualifier': {
            const lb = qualifierData?.leaderboards;
            rows = (
                tournament.gameTime
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (lb as any)?.gameTime?.pbLeaderboard
                    : lb?.pbLeaderboard
            ) as LeaderboardRow[] | undefined;
            statLabel = 'Qualifier';
            break;
        }
        case 'points':
            rows = tournamentLeaderboards.pbLeaderboard;
            formatStat = (_stat, key) => {
                const points = tournament.pointDistribution?.[key];
                return points ?? 0;
            };
            statLabel = 'Points';
            break;
        case 'attempts':
            rows = tournamentLeaderboards.attemptCountLeaderboard;
            formatStat = formatNumber;
            statLabel = 'Attempts';
            break;
        case 'finishedAttempts':
            rows = tournamentLeaderboards.finishedAttemptCountLeaderboard;
            formatStat = formatNumber;
            statLabel = 'Finished';
            break;
        case 'playtime':
            rows = tournamentLeaderboards.totalRunTimeLeaderboard;
            statLabel = 'Playtime';
            break;
    }

    return (
        <div className={styles.eventLeaderboards}>
            <div className={styles.lbTabs} role="tablist">
                {views.map((v) => (
                    <button
                        key={v.key}
                        type="button"
                        role="tab"
                        aria-selected={view === v.key}
                        className={`${styles.lbTab} ${
                            view === v.key ? styles.lbTabActive : ''
                        }`}
                        onClick={() => setView(v.key)}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            <PrettyLeaderboard
                rows={rows}
                formatStat={formatStat}
                statLabel={statLabel}
            />
        </div>
    );
};
