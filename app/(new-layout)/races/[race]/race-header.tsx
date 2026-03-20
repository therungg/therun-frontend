import React from 'react';
import { RaceParticipantStatusOverview } from '~app/(new-layout)/races/components/race-participant-status-overview';
import { RacePlacings } from '~app/(new-layout)/races/components/race-placings';
import {
    Race,
    RaceParticipantWithLiveData,
} from '~app/(new-layout)/races/races.types';
import { LocalizedTime } from '~src/components/util/datetime';
import { PersonIcon } from '~src/icons/person-icon';
import { safeEncodeURI } from '~src/utils/uri';
import styles from './race-detail.module.scss';

export const RaceHeader = ({ race }: { race: Race }) => {
    return (
        <div
            className={styles.raceHeader}
            data-aborted={race.status === 'aborted'}
        >
            <div className={styles.raceHeaderLayout}>
                <img
                    className={styles.raceHeaderImg}
                    src={
                        race.gameImage && race.gameImage !== 'noimage'
                            ? race.gameImage
                            : `/logo_dark_theme_no_text_transparent.png`
                    }
                    alt={race.displayGame}
                />
                <div className={styles.raceHeaderBody}>
                    <div className={styles.titleRow}>
                        <a
                            className={styles.gameLink}
                            href={`/races/stats/${safeEncodeURI(
                                race.displayGame,
                            )}`}
                        >
                            {race.displayGame}
                        </a>
                        <span className={styles.participantCount}>
                            <span className="me-1">
                                {race.participantCount}
                            </span>
                            <PersonIcon />
                        </span>
                    </div>

                    <div className={styles.categoryRow}>
                        <div className={styles.categoryText}>
                            {race.displayCategory}
                        </div>
                        {race.status === 'aborted' && (
                            <div className={styles.abortedBadge}>
                                Race was aborted
                            </div>
                        )}
                        {race.status !== 'aborted' && !race.ranked && (
                            <div className={styles.unrankedBadge}>Unranked</div>
                        )}
                    </div>

                    {race.customName && (
                        <div className={styles.customName}>
                            {race.customName}
                        </div>
                    )}
                    {race.description && (
                        <div className={styles.description}>
                            {race.description}
                        </div>
                    )}
                    <div className={styles.headerFooter}>
                        <div>
                            <RaceParticipantStatusOverview
                                participants={
                                    race.participants as RaceParticipantWithLiveData[]
                                }
                            />
                        </div>

                        <div className={styles.headerFooterRight}>
                            {race.status === 'pending' &&
                                race.willStartAt &&
                                race.startMethod === 'datetime' && (
                                    <span suppressHydrationWarning={true}>
                                        Start time:{' '}
                                        <LocalizedTime
                                            date={new Date(race.willStartAt)}
                                        />
                                    </span>
                                )}
                            <RacePlacings race={race} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
