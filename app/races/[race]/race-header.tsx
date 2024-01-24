import { Race } from "~app/races/races.types";
import Link from "next/link";
import React from "react";
import { GameImage } from "~src/components/image/gameimage";
import { UserLink } from "~src/components/links/links";

export const RaceHeader = ({ race }: { race: Race }) => {
    return (
        <div
            className={"bg-body-secondary game-border mh-100 card game-border"}
        >
            <div className={"d-flex"}>
                {race.gameImage && (
                    <GameImage
                        className={"rounded-0 rounded-start"}
                        src={race.gameImage}
                        alt={race.displayGame}
                        height={352 / 2.5}
                        width={264 / 2.5}
                        quality={"hd"}
                    />
                )}
                <div className={"flex-grow-1 flex-shrink-0 px-4 py-3"}>
                    <div className={"h5"}>
                        {race.displayGame} - {race.displayCategory}
                    </div>
                    {race.customName && <div>{race.customName}</div>}
                    <div>
                        Created by <UserLink username={race.creator} />
                    </div>
                    {race.status === "pending" && (
                        <div>
                            {race.readyParticipantCount}/{race.participantCount}{" "}
                            participants ready!
                        </div>
                    )}
                    {race.status !== "pending" && (
                        <div>{race.participantCount} participants</div>
                    )}
                    <div>{race.description}</div>
                    {race.previousRaceId && (
                        <div>
                            Successor of{" "}
                            <Link href={race.previousRaceId}>
                                {race.previousRaceId}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
