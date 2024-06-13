import { CreateNextRace } from "~app/races/[race]/create-next-race";
import { ConfirmFinalTimeForm } from "~app/races/components/forms/confirm-final-time-form";
import { LeaveRaceButton } from "~app/races/components/buttons/leave-race-button";
import { ReadyRaceButton } from "~app/races/components/buttons/ready-race-button";
import { UnreadyRaceButton } from "~app/races/components/buttons/unready-race-button";
import { FinishRaceButton } from "~app/races/components/buttons/finish-race-button";
import { AbandonRaceButton } from "~app/races/components/buttons/abandon-race-button";
import React from "react";
import { Race } from "~app/races/races.types";
import { User } from "../../../types/session.types";
import { CommentOnRaceForm } from "~app/races/components/forms/race-comment-form";
import { JoinRaceForm } from "~app/races/components/forms/join-race-form";
import { UndoAbandonRaceButton } from "~app/races/components/buttons/undo-abandon-race-button";
import { UndoConfirmButton } from "~app/races/components/buttons/undo-confirm-button";
import { UndoFinishButton } from "~app/races/components/buttons/undo-finish-button";
import { ResetAbandonedRaceButton } from "~app/races/components/buttons/reset-abandoned-race-button";
import { isRaceModerator } from "~src/rbac/confirm-permission";

export const RaceActions = ({ race, user }: { race: Race; user?: User }) => {
    if (!user?.username) return null;

    const raceIsPending = race.status === "pending";
    const raceStarted = race.status === "progress";
    const loggedinUserParticipation = user?.username
        ? race.participants?.find(
              (participant) => participant.user === user.username,
          )
        : null;

    const userParticipates = !!loggedinUserParticipation;

    const userIsReady =
        userParticipates && loggedinUserParticipation.status === "ready";

    const userStarted =
        userParticipates && loggedinUserParticipation.status === "started";

    const userFinished =
        userParticipates &&
        loggedinUserParticipation.status === "finished" &&
        loggedinUserParticipation.finalTime;

    const userConfirmed =
        userParticipates &&
        loggedinUserParticipation.status === "confirmed" &&
        loggedinUserParticipation.finalTime;

    const userAbandoned =
        userParticipates && loggedinUserParticipation.status === "abandoned";

    const userReset =
        userAbandoned &&
        loggedinUserParticipation.liveData &&
        loggedinUserParticipation.liveData.currentSplitIndex === -1;

    const userCreatedRace = race.creator === user?.username;

    if (race.status === "starting") return null;
    if (race.status !== "pending" && !userParticipates && !userCreatedRace)
        return null;
    if (userConfirmed && loggedinUserParticipation.comment && !userCreatedRace)
        return null;

    const everyoneAbandoned = race.participants?.every(
        (participant) => participant.status === "abandoned",
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
