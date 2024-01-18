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
import { RaceParticipantsMap } from "~app/races/[race]/race-view";

export const RaceActions = ({
    race,
    user,
    raceParticipantsMap,
}: {
    race: Race;
    user?: User;
    raceParticipantsMap: RaceParticipantsMap;
}) => {
    const raceIsPending =
        race.status === "pending" || race.status === "starting";
    const raceStarted = race.status === "progress";
    const userParticipates = user && raceParticipantsMap.has(user.username);

    const userIsReady =
        userParticipates &&
        raceParticipantsMap.get(user?.username)?.status === "ready";

    const userStarted =
        userParticipates &&
        raceParticipantsMap.get(user?.username)?.status === "started";

    const userFinished =
        userParticipates &&
        raceParticipantsMap.get(user?.username)?.status === "finished" &&
        raceParticipantsMap.get(user?.username)?.finalTime;
    return (
        <div>
            <CreateNextRace race={race} user={user} />
            {userFinished && (
                <ConfirmFinalTimeForm
                    raceId={race.raceId}
                    finalTime={
                        raceParticipantsMap.get(user?.username)
                            ?.finalTime as number
                    }
                />
            )}
            {raceIsPending && !userParticipates && (
                <JoinRaceButton raceId={race.raceId} />
            )}
            {raceIsPending && userParticipates && (
                <div>
                    <LeaveRaceButton raceId={race.raceId} />
                    {!userIsReady && <ReadyRaceButton raceId={race.raceId} />}
                    {userIsReady && <UnreadyRaceButton raceId={race.raceId} />}
                </div>
            )}
            {raceStarted && (userIsReady || userStarted) && (
                <div>
                    <FinishRaceButton raceId={race.raceId} />
                    <AbandonRaceButton raceId={race.raceId} />
                </div>
            )}
        </div>
    );
};
