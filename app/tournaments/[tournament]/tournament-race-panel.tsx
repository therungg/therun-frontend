import { Race } from "~app/races/races.types";
import React from "react";
import Link from "next/link";
import { Button } from "react-bootstrap";
import { DurationToFormatted, FromNow } from "~src/components/util/datetime";

export const TournamentRacePanel = ({ race }: { race: Race }) => {
    if (race.status === "pending") {
        return (
            <div className="game-border bg-body-secondary px-4 py-3 border border-secondary rounded-3 my-3 d-inline-flex">
                <div>
                    <div>
                        A Race
                        {race.prizepool && (
                            <span className="mx-1">
                                with a prize pool of $
                                {(race.prizepool / 100).toFixed(2)}{" "}
                            </span>
                        )}
                        is starting during this tournament!
                    </div>
                    <div>
                        It will start{" "}
                        <FromNow time={new Date(race.willStartAt as string)} />.{" "}
                        So far, {race.participantCount} people have joined.
                    </div>
                    <div>
                        The top seed is {race.participants[0].user}, who has a
                        pb of{" "}
                        <DurationToFormatted
                            duration={race.participants[0].pb}
                        />
                        . Can you beat them?
                    </div>
                    <div>
                        If you finish the race, your time will count toward the
                        LTA as well.
                    </div>
                    <div className="flex-center mt-3">
                        <Link href={`/races/${race.raceId}`} target="_blank">
                            <Button
                                variant="secondary"
                                className="btn-lg px-3 w-160p h-3r fw-medium"
                            >
                                Join the Race!
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (race.status === "progress") {
        return (
            <div className="game-border bg-body-secondary px-4 py-3 border border-secondary rounded-3 my-3 d-inline-flex">
                <div>
                    <div>
                        A Race
                        {race.prizepool && (
                            <span className="mx-1">
                                with a prize pool of $
                                {(race.prizepool / 100).toFixed(2)}{" "}
                            </span>
                        )}
                        is ongoing between participants of this tournament!
                    </div>
                    <div>
                        {race.participants[0].user} is currently in first place.{" "}
                        {race.participants[0].liveData && (
                            <span>
                                Their current split is{" "}
                                {race.participants[0].liveData.currentSplitName}{" "}
                            </span>
                        )}
                    </div>
                    <div className="flex-center mt-3">
                        <Link href={`/races/${race.raceId}`} target="_blank">
                            <Button
                                variant="secondary"
                                className="btn-lg px-3 w-160p h-3r fw-medium"
                            >
                                View the race!
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <></>;
};
