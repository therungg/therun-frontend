'use client';

import React, { useState } from 'react';
import { Table } from 'react-bootstrap';
import { RaceMmrStat, RaceTimeStat } from '~app/(old-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { TrophyIcon } from '~src/icons/trophy-icon';

export interface LeaderboardData {
    items: RaceMmrStat[] | RaceTimeStat[];
    key: string;
    title: string;
}

export const CategoryLeaderboards = ({
    leaderboards,
}: {
    leaderboards: LeaderboardData[];
}) => {
    const [currentLeaderboard, setCurrentLeaderboard] = useState(
        leaderboards[0],
    );

    const isMmrLeaderboard = currentLeaderboard.key.includes('mmr');

    return (
        <div>
            <div className="mb-3">
                <select
                    className="form-select"
                    onChange={(e) => {
                        setCurrentLeaderboard(
                            leaderboards.find(
                                (leaderboard) =>
                                    e.target.value === leaderboard.key,
                            ) as LeaderboardData,
                        );
                    }}
                >
                    {leaderboards.map((leaderboard) => {
                        return (
                            <option
                                key={leaderboard.key}
                                title={leaderboard.title}
                                value={leaderboard.key}
                            >
                                {leaderboard.title}
                            </option>
                        );
                    })}
                </select>
            </div>
            <div>
                <Table bordered striped hover responsive>
                    <thead>
                        <tr className="text-center">
                            <th style={{ width: '10%' }}>#</th>
                            <th>User</th>
                            <th>{isMmrLeaderboard ? 'Rating' : 'Time'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentLeaderboard.items.map((leaderboard, i) => {
                            return (
                                <tr
                                    key={`${leaderboard.user}-${currentLeaderboard.key}-${i}`}
                                >
                                    <td>
                                        {i < 3 ? (
                                            <TrophyIcon
                                                trophyColor={
                                                    i === 0
                                                        ? 'gold'
                                                        : i === 1
                                                          ? 'silver'
                                                          : 'bronze'
                                                }
                                            />
                                        ) : (
                                            <span>{i + 1}.</span>
                                        )}
                                    </td>
                                    <td>
                                        <UserLink
                                            username={leaderboard.user}
                                            url={`/${leaderboard.user}/races`}
                                        />
                                    </td>
                                    <td>
                                        {'mmr' in leaderboard ? (
                                            leaderboard.mmr
                                        ) : (
                                            <DurationToFormatted
                                                duration={leaderboard.time}
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>
        </div>
    );
};
