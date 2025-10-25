import React from 'react';
import { CreateNextRace } from '~app/(old-layout)/races/[race]/create-next-race';
import { AbandonRaceButton } from '~app/(old-layout)/races/components/buttons/abandon-race-button';
import { FinishRaceButton } from '~app/(old-layout)/races/components/buttons/finish-race-button';
import { LeaveRaceButton } from '~app/(old-layout)/races/components/buttons/leave-race-button';
import { ReadyRaceButton } from '~app/(old-layout)/races/components/buttons/ready-race-button';
import { ResetAbandonedRaceButton } from '~app/(old-layout)/races/components/buttons/reset-abandoned-race-button';
import { UndoAbandonRaceButton } from '~app/(old-layout)/races/components/buttons/undo-abandon-race-button';
import { UndoConfirmButton } from '~app/(old-layout)/races/components/buttons/undo-confirm-button';
import { UndoFinishButton } from '~app/(old-layout)/races/components/buttons/undo-finish-button';
import { UnreadyRaceButton } from '~app/(old-layout)/races/components/buttons/unready-race-button';
import { ConfirmFinalTimeForm } from '~app/(old-layout)/races/components/forms/confirm-final-time-form';
import { JoinRaceForm } from '~app/(old-layout)/races/components/forms/join-race-form';
import { CommentOnRaceForm } from '~app/(old-layout)/races/components/forms/race-comment-form';
import { Race } from '~app/(old-layout)/races/races.types';
import { isRaceModerator } from '~src/rbac/confirm-permission';
import { User } from '../../../../types/session.types';

export const RaceActions = ({ race, user }: { race: Race; user?: User }) => {
    if (!user?.username) return null;

    const raceIsPending = race.status === 'pending';
    const raceStarted = race.status === 'progress';
    const loggedinUserParticipation = user?.username
        ? race.participants?.find(
              (participant) => participant.user === user.username,
          )
        : null;

    const userParticipates = !!loggedinUserParticipation;

    const userIsReady =
        userParticipates && loggedinUserParticipation.status === 'ready';

    const userStarted =
        userParticipates && loggedinUserParticipation.status === 'started';

    const userFinished =
        userParticipates &&
        loggedinUserParticipation.status === 'finished' &&
        loggedinUserParticipation.finalTime;

    const userConfirmed =
        userParticipates &&
        loggedinUserParticipation.status === 'confirmed' &&
        loggedinUserParticipation.finalTime;

    const userAbandoned =
        userParticipates && loggedinUserParticipation.status === 'abandoned';

    const userReset =
        userAbandoned &&
        loggedinUserParticipation.liveData &&
        loggedinUserParticipation.liveData.currentSplitIndex === -1;

    const userWasDisqualified =
        userAbandoned && loggedinUserParticipation.disqualifiedReason;

    const userCreatedRace = race.creator === user?.username;

    if (race.status === 'starting') return null;
    if (race.status !== 'pending' && !userParticipates && !userCreatedRace)
        return null;
    if (userConfirmed && loggedinUserParticipation.comment && !userCreatedRace)
        return null;
    if (userWasDisqualified) return null;

    const everyoneAbandoned = race.participants?.every(
        (participant) => participant.status === 'abandoned',
    );

    const raceWasAbandonedMoreThan10MinutesAgo =
        everyoneAbandoned &&
        new Date().getTime() - new Date(race.endTime as string).getTime() >
            1000 * 60 * 10;

    return (
        <div className="rounded-3 px-4 pt-2 pb-4 mb-3 game-border bg-body-secondary">
            <span className="h4 w-100 flex-center">Race actions</span>
            <hr />
            {userFinished && (
                <div className="d-flex">
                    <ConfirmFinalTimeForm
                        raceId={race.raceId}
                        finalTime={
                            loggedinUserParticipation.finalTime as number
                        }
                    />
                </div>
            )}

            {(userFinished || userConfirmed || userAbandoned) &&
                !userWasDisqualified &&
                !loggedinUserParticipation.comment && (
                    <CommentOnRaceForm raceId={race.raceId} />
                )}
            {raceIsPending && !userParticipates && (
                <div className="d-flex">
                    <JoinRaceForm race={race} />
                </div>
            )}
            {raceIsPending && userParticipates && (
                <div>
                    {!userIsReady && (
                        <>
                            <ReadyRaceButton
                                className="w-100 fs-5"
                                raceId={race.raceId}
                            />

                            <LeaveRaceButton
                                className="w-100 fs-5 mt-2"
                                raceId={race.raceId}
                                variant="danger"
                            />
                        </>
                    )}
                    {userIsReady && (
                        <UnreadyRaceButton
                            className="w-100 fs-5"
                            raceId={race.raceId}
                            variant="danger"
                        />
                    )}
                </div>
            )}
            {everyoneAbandoned &&
                isRaceModerator(race, user) &&
                !raceWasAbandonedMoreThan10MinutesAgo && (
                    <ResetAbandonedRaceButton
                        raceId={race.raceId}
                        className="w-100 fs-5 mb-2"
                    />
                )}
            <CreateNextRace race={race} user={user} className="w-100 fs-5" />
            {raceStarted && (userIsReady || userStarted) && (
                <div>
                    <FinishRaceButton
                        raceId={race.raceId}
                        className="w-100 fs-5"
                    />
                    <AbandonRaceButton
                        raceId={race.raceId}
                        className="w-100 fs-5 mt-2"
                        variant="danger"
                    />
                </div>
            )}
            {userReset && raceStarted && (
                <UndoAbandonRaceButton
                    raceId={race.raceId}
                    className="w-100 fs-5"
                />
            )}
            {userFinished && raceStarted && (
                <UndoFinishButton
                    raceId={race.raceId}
                    className="w-100 fs-5"
                    variant="danger"
                />
            )}
            {userConfirmed && raceStarted && (
                <UndoConfirmButton
                    raceId={race.raceId}
                    className="w-100 fs-5"
                    variant="danger"
                />
            )}
        </div>
    );
};
