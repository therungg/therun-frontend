import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { Race } from '~app/(new-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { TrophyIcon } from '~src/icons/trophy-icon';
import styles from './race-detail.module.scss';

export const RaceStats = ({ race }: { race: Race }) => {
    if (
        race.mmrLeaderboards?.length === 0 &&
        race.timeLeaderboards?.length === 0
    ) {
        return;
    }
    return (
        <div className={styles.statsPanel}>
            <h4 className={styles.panelTitle}>Stats</h4>
            <hr className={styles.panelDivider} />
            <Row>
                <Col sm={6} className="mb-3 mb-md-1">
                    <div className={styles.statsSubheading}>Top Ratings</div>
                    {race.mmrLeaderboards.map((stat, i) => {
                        return (
                            <div
                                key={`${stat.user}-mmr`}
                                className={styles.leaderboardEntry}
                            >
                                <TrophyIcon
                                    trophyColor={
                                        i === 0
                                            ? 'gold'
                                            : i === 1
                                              ? 'silver'
                                              : 'bronze'
                                    }
                                />
                                <span className="text-truncate">
                                    <b>{stat.mmr}</b> -{' '}
                                    <UserLink
                                        username={stat.user}
                                        url={`/${stat.user}/races`}
                                    />
                                </span>
                            </div>
                        );
                    })}
                </Col>
                <Col sm={6} className="mb-3 mb-xl-1">
                    <div className={styles.statsSubheading}>
                        Top Times This Month
                    </div>
                    {race.timeLeaderboards.map((stat, i) => {
                        return (
                            <div
                                key={`${stat.user}-time`}
                                className={styles.leaderboardEntry}
                            >
                                <TrophyIcon
                                    trophyColor={
                                        i === 0
                                            ? 'gold'
                                            : i === 1
                                              ? 'silver'
                                              : 'bronze'
                                    }
                                />
                                <span className="text-truncate">
                                    <b>
                                        <DurationToFormatted
                                            duration={stat.time}
                                        />
                                    </b>{' '}
                                    -{' '}
                                    <UserLink
                                        username={stat.user}
                                        url={`/${stat.user}/races`}
                                    />
                                </span>
                            </div>
                        );
                    })}
                </Col>
            </Row>
        </div>
    );
};
