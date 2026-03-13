import { useAutoAnimate } from '@formkit/auto-animate/react';
import React from 'react';
import { Col, Row } from 'react-bootstrap';
import { Twitch as TwitchIcon } from 'react-bootstrap-icons';
import { getPercentageDoneFromLiverun } from '~app/(new-layout)/races/[race]/get-percentage-done-from-liverun';
import { RaceParticipantTimer } from '~app/(new-layout)/races/[race]/race-timer';
import { readableRaceParticipantStatus } from '~app/(new-layout)/races/[race]/readable-race-status';
import { RaceParticipantRatingDisplay } from '~app/(new-layout)/races/components/race-participant-rating-display';
import {
    Race,
    RaceParticipantWithLiveData,
} from '~app/(new-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import {
    DifferenceFromOne,
    DurationToFormatted,
} from '~src/components/util/datetime';
import styles from './race-detail.module.scss';

interface RaceParticipantDetailProps {
    race: Race;
    setStream: (user: string) => void;
}

export const RaceParticipantDetail = ({
    race,
    setStream,
}: RaceParticipantDetailProps) => {
    return (
        <RaceParticipantDetailPagination race={race} setStream={setStream} />
    );
};

const RaceParticipantDetailPagination = ({
    race,
    setStream,
}: RaceParticipantDetailProps) => {
    const participants = race.participants as RaceParticipantWithLiveData[];

    const [parent] = useAutoAnimate({
        duration: 300,
        easing: 'ease-out',
    });

    return (
        <>
            <Row xs={1} sm={2} xxl={3} className="g-4" ref={parent}>
                {participants.map((participant, i) => {
                    return (
                        <Col
                            key={participant.user}
                            onClick={() => {
                                if (
                                    participant.liveData &&
                                    participant.liveData.streaming
                                ) {
                                    setStream(participant.user);
                                }
                            }}
                        >
                            <RaceParticipantDetailView
                                placing={i + 1}
                                participant={participant}
                                race={race}
                            />
                        </Col>
                    );
                })}
            </Row>
        </>
    );
};

export const RaceParticipantDetailView = ({
    participant,
    placing,
    race,
    isHighlighted = false,
}: {
    participant: RaceParticipantWithLiveData;
    placing: number;
    race: Race;
    isHighlighted?: boolean;
}) => {
    return (
        <div
            className={`${styles.participantCard} ${
                isHighlighted ? styles.participantCardHighlighted : ''
            } ${
                participant.liveData && participant.liveData.streaming
                    ? styles.participantCardStreaming
                    : ''
            }`}
        >
            <div className={styles.participantHeader}>
                <span className={styles.participantName}>
                    <UserLink
                        username={participant.user}
                        parentIsUrl={false}
                        icon={false}
                        url={`/${participant.user}/races`}
                    />
                    {participant.liveData?.streaming && (
                        <span className="ms-1">
                            <TwitchIcon height={22} color="#6441a5" />
                        </span>
                    )}
                </span>
                <span className={styles.participantPlacing}>
                    {participant.status !== 'abandoned' && (
                        <span>#{placing}</span>
                    )}
                    {participant.status === 'abandoned' && <span>-</span>}
                </span>
            </div>
            <div className={styles.participantMeta}>
                <span>
                    {participant.pb && (
                        <span>
                            PB -{' '}
                            <span className="fw-bold">
                                <DurationToFormatted
                                    duration={participant.pb}
                                />
                            </span>
                        </span>
                    )}
                    {!participant.pb && 'No PB'}
                </span>
                <RaceParticipantRatingDisplay raceParticipant={participant} />
                {readableRaceParticipantStatus(participant.status)}
            </div>
            <hr className={styles.participantDivider} />
            <div className={styles.participantBody}>
                <RaceParticipantDetailBody
                    participant={participant}
                    race={race}
                />
            </div>
        </div>
    );
};

const RaceParticipantDetailBody = ({
    participant,
    race,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
}) => {
    const abandonedTime =
        new Date(participant.abandondedAtDate as string).getTime() -
        new Date(race.startTime as string).getTime();

    const percentage = getPercentageDoneFromLiverun(participant);

    return (
        <div className={styles.participantLiveData}>
            <span className={styles.timerDisplay}>
                {participant.status === 'abandoned' &&
                    !participant.disqualified && (
                        <>
                            Abandoned -{' '}
                            <span className="ps-1">
                                <DurationToFormatted duration={abandonedTime} />
                            </span>
                        </>
                    )}
                {participant.status === 'abandoned' &&
                    participant.disqualified && <>Disqualified</>}
                {participant.status !== 'abandoned' && (
                    <RaceParticipantTimer
                        raceParticipant={participant}
                        race={race}
                    />
                )}
            </span>
            <hr className={styles.participantDivider} />
            {participant.liveData && participant.status === 'started' && (
                <>
                    <div className="justify-content-between d-flex">
                        <span>
                            BPT -{' '}
                            <span className="fw-bold">
                                <DurationToFormatted
                                    duration={
                                        participant.liveData
                                            .bestPossibleTime as number
                                    }
                                />
                            </span>
                        </span>
                        <span>
                            <DifferenceFromOne
                                diff={participant.liveData.delta}
                            />
                        </span>
                    </div>
                    <div className="justify-content-between d-flex w-100 flex-grow-1 p-0 m-0">
                        <span className="text-truncate">
                            {participant.liveData.currentSplitIndex + 1}/
                            {participant.liveData.totalSplits} -{' '}
                            {participant.liveData.currentSplitName}
                        </span>
                        <span>{percentage}%</span>
                    </div>
                </>
            )}
            {race.status === 'progress' && participant.status === 'ready' && (
                <div className={styles.awaitingData}>Awaiting Live Data...</div>
            )}
            {participant.comment && !participant.disqualifiedReason && (
                <div className={styles.participantComment}>
                    &quot;{participant.comment}&quot;
                </div>
            )}
            {participant.disqualifiedReason && (
                <div className={styles.participantComment}>
                    DQ by {participant.disqualifiedBy} with reason: &quot;
                    {participant.disqualifiedReason}&quot;
                </div>
            )}
        </div>
    );
};
