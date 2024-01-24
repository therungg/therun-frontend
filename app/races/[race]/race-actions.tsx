import { CreateNextRace } from "~app/races/[race]/create-next-race";
import { ConfirmFinalTimeForm } from "~app/races/components/forms/confirm-final-time-form";
import { JoinRaceButton } from "~app/races/components/buttons/join-race-button";
import { LeaveRaceButton } from "~app/races/components/buttons/leave-race-button";
import { ReadyRaceButton } from "~app/races/components/buttons/ready-race-button";
import { UnreadyRaceButton } from "~app/races/components/buttons/unready-race-button";
import { FinishRaceButton } from "~app/races/components/buttons/finish-race-button";
import { AbandonRaceButton } from "~app/races/components/buttons/abandon-race-button";
import React from "react";
import { Race } from "~app/races/races.types";
import { User } from "../../../types/session.types";

export const RaceActions = ({ race, user }: { race: Race; user?: User }) => {
    if (!user?.username) return;

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

    const userCreatedRace = race.creator === user?.username;

    if (race.status === "starting") return;
    if (race.status !== "pending" && !userParticipates && !userCreatedRace)
        return;
    if (userConfirmed && !userCreatedRace) return;

    return (
        <div className={"bg-body-secondary d-flex mb-2 card mh-100 p-4 gap-2"}>
            {userFinished && (
                <ConfirmFinalTimeForm
                    raceId={race.raceId}
                    finalTime={loggedinUserParticipation.finalTime as number}
                />
            )}
            {raceIsPending && !userParticipates && (
                <JoinRaceButton raceId={race.raceId} />
            )}
            {raceIsPending && userParticipates && (
                <div className={"d-flex gap-2"}>
                    <LeaveRaceButton raceId={race.raceId} />
                    {!userIsReady && <ReadyRaceButton raceId={race.raceId} />}
                    {userIsReady && <UnreadyRaceButton raceId={race.raceId} />}
                </div>
            )}
            {raceStarted && (userIsReady || userStarted) && (
                <div className={"d-flex gap-2"}>
                    <FinishRaceButton raceId={race.raceId} />
                    <AbandonRaceButton raceId={race.raceId} />
                </div>
            )}
            <CreateNextRace race={race} user={user} />
        </div>
    );
};
