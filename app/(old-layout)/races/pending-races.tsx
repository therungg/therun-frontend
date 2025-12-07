import { Race } from "~app/(old-layout)/races/races.types";
import React from "react";
import { GameImage } from "~src/components/image/gameimage";
import styles from "../../../src/components/css/LiveRun.module.scss";
import { PersonIcon } from "~src/icons/person-icon";
import { PencilIcon } from "~src/icons/pencil-icon";
import { UserLink } from "~src/components/links/links";
import { FromNow } from "~src/components/util/datetime";
import { ClockIcon } from "~src/icons/clock-icon";

export const PendingRaces = ({ races }: { races: Race[] }) => {
    return (
        <div className="bg-body-secondary mb-3 game-border px-4 py-3 rounded-3">
            <span className="h3">Upcoming Races</span>
            <hr />
            {races.length === 0 && <span>No races upcoming</span>}
            {races.length > 0 &&
                races.map((race) => {
                    return <PendingRace key={race.raceId} race={race} />;
                })}
        </div>
    );
};

export const PendingRace = ({ race }: { race: Race }) => {
    return (
        <a href={`/races/${race.raceId}`} className="text-decoration-none">
            <div
                key={race.raceId}
                className={`d-flex mb-3 ${styles.liveRunContainer} rounded-3`}
                style={{ color: "var(--bs-body-color)" }}
            >
                <GameImage
                    alt={`Image for ${race.displayGame}`}
                    src={race.gameImage}
                    quality="large"
                    height={64 * 1.3}
                    width={48 * 1.3}
                    className="rounded-3"
                />
                <div className="px-3 w-100">
                    <div className="d-flex justify-content-between gap-2">
                        <div
                            className="h5 m-0 p-0"
                            style={{
                                color: "var(--bs-link-color)",
                            }}
                        >
                            {race.displayGame}
                        </div>
                        <span className="text-nowrap">
                            <span className="me-1">
                                {race.startMethod !== "datetime" && (
                                    <span>{race.readyParticipantCount}/</span>
                                )}
                                {race.participantCount}
                            </span>
                            <PersonIcon />
                        </span>
                    </div>
                    <div className="d-flex justify-content-between">
                        <div className="fst-italic">{race.displayCategory}</div>
                        <span>
                            <span className="me-2">
                                <UserLink
                                    username={race.creator}
                                    parentIsUrl={true}
                                    icon={false}
                                />
                            </span>
                            <PencilIcon />
                        </span>
                    </div>
                    {race.startMethod === "datetime" && (
                        <div className="d-flex justify-content-between">
                            <div></div>
                            <div>
                                Starts{" "}
                                <FromNow
                                    time={new Date(race.willStartAt as string)}
                                />
                                <ClockIcon color="var(--bs-link-color)" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
};
