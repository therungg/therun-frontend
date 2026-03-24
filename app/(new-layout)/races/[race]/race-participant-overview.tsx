import { useAutoAnimate } from '@formkit/auto-animate/react';
import { getPercentageDoneFromLiverun } from '~app/(new-layout)/races/[race]/get-percentage-done-from-liverun';
import { RaceParticipantTimer } from '~app/(new-layout)/races/[race]/race-timer';
import { sortRaceParticipants } from '~app/(new-layout)/races/[race]/sort-race-participants';
import { RaceParticipantRatingDisplay } from '~app/(new-layout)/races/components/race-participant-rating-display';
import {
    Race,
    RaceParticipantWithLiveData,
    RaceTeam,
} from '~app/(new-layout)/races/races.types';
import { UserLink } from '~src/components/links/links';
import { DurationToFormatted } from '~src/components/util/datetime';
import { TrophyIcon } from '~src/icons/trophy-icon';
import styles from './race-detail.module.scss';

interface RaceParticipantOverviewProps {
    race: Race;
}

export const RaceParticipantOverview = ({
    race,
}: RaceParticipantOverviewProps) => {
    const participants = sortRaceParticipants(race);

    const [parent] = useAutoAnimate({
        duration: 300,
        easing: 'ease-out',
    });

    const firstAbandonedPlacing = participants.findIndex(
        (participant) => participant.status === 'abandoned',
    );

    return (
        <div className={styles.standingsPanel}>
            <span className={styles.panelTitle}>Standings</span>
            <hr className={styles.panelDivider} />
            <table className={styles.standingsTable}>
                <thead>
                    <tr>
                        <th className={styles.placingCell}>#</th>
                        <th className={styles.userCell}>Username</th>
                        <th>Rating</th>
                        <th>%</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody ref={parent}>
                    {participants?.map((participant, i) => {
                        const placing =
                            participant.status === 'abandoned'
                                ? firstAbandonedPlacing + 1
                                : i + 1;
                        const team = race.isTeamRace
                            ? race.teams?.find((t) =>
                                  t.members.includes(participant.user),
                              )
                            : undefined;
                        return (
                            <RaceParticipantItem
                                placing={placing}
                                race={race}
                                key={participant.user}
                                participant={participant}
                                team={team}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export const RaceParticipantItem = ({
    participant,
    race,
    placing,
    team,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
    placing: number;
    team?: RaceTeam;
}) => {
    const percentage = getPercentageDoneFromLiverun(participant);
    return (
        <>
            <tr>
                <td className={styles.placingCell}>
                    {participant.status !== 'abandoned' && `${placing}.`}
                    {participant.status == 'abandoned' && `-`}
                </td>
                <td className={styles.userCell}>
                    {team && (
                        <span
                            style={{
                                display: 'inline-block',
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: team.color,
                                marginRight: '0.25rem',
                                flexShrink: 0,
                            }}
                        />
                    )}
                    <UserLink
                        username={participant.user}
                        url={`/${participant.user}/races`}
                    />
                    {placing === 1 && participant.status === 'confirmed' && (
                        <span className="ms-1">
                            <TrophyIcon />
                        </span>
                    )}
                </td>
                <td>
                    <RaceParticipantRatingDisplay
                        raceParticipant={participant}
                    />
                </td>
                <td>
                    {percentage > 0 && `${percentage.toFixed(0)}%`}
                    {percentage === 0 && '-'}
                </td>
                <td className={styles.timeCell}>
                    <RaceParticipantStatus
                        race={race}
                        participant={participant}
                    />
                </td>
            </tr>
        </>
    );
};

const RaceParticipantStatus = ({
    participant,
    race,
}: {
    participant: RaceParticipantWithLiveData;
    race: Race;
}) => {
    // const abandonedTime =
    //     new Date(participant.abandondedAtDate as string).getTime() -
    //     new Date(race.startTime as string).getTime();
    return (
        <div>
            {(participant.status === 'finished' ||
                participant.status === 'confirmed') && (
                <span className="fst-italic">
                    <DurationToFormatted
                        duration={participant.finalTime?.toString() as string}
                    />
                </span>
            )}
            {participant.status === 'started' && (
                <div suppressHydrationWarning={true}>
                    <RaceParticipantTimer
                        raceParticipant={participant}
                        race={race}
                    />
                </div>
            )}
            {participant.status === 'abandoned' &&
                participant.disqualifiedReason && (
                    <span>
                        Disqualified
                        {/*<DurationToFormatted duration={abandonedTime} />*/}
                    </span>
                )}
            {participant.status === 'abandoned' &&
                !participant.disqualifiedReason && (
                    <span>
                        DNF
                        {/*<DurationToFormatted duration={abandonedTime} />*/}
                    </span>
                )}
            {participant.status === 'ready' && (
                <span>
                    {race.status === 'progress' && <span>In Progress</span>}
                    {race.status === 'pending' && <span>Ready</span>}
                </span>
            )}
        </div>
    );
};
