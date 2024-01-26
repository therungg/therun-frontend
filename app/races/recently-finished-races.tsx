import { Race } from "~app/races/races.types";
import styles from "~src/components/css/LiveRun.module.scss";
import { GameImage } from "~src/components/image/gameimage";
import React from "react";
import { PersonIcon } from "~src/icons/person-icon";
import { RaceFirstPlace } from "~app/races/components/race-first-place";

export const RecentlyFinishedRaces = ({ races }: { races: Race[] }) => {
    return (
        <div
            className={"bg-body-secondary mb-3 game-border px-4 py-3 rounded-3"}
        >
            <span className={"h3"}>Recently Finished Races</span>
            <hr />
            {races.length === 0 && <span>No races upcoming</span>}
            {races.length > 0 &&
                races.map((race) => {
                    return (
                        <RecentlyFinishedRace key={race.raceId} race={race} />
                    );
                })}
        </div>
    );
};

export const RecentlyFinishedRace = ({ race }: { race: Race }) => {
    return (
        <a href={`/races/${race.raceId}`} className={"text-decoration-none"}>
            <div
                key={race.raceId}
                className={`d-flex mb-3 ${styles.liveRunContainer} rounded-3 h-100`}
                style={{ color: "var(--bs-body-color)" }}
            >
                <GameImage
                    alt={`Image for ${race.displayGame}`}
                    src={race.gameImage}
                    quality={"large"}
                    height={64 * 1.3}
                    width={48 * 1.3}
                    className={"rounded-3"}
                />
                <div className={"px-3 w-100 h-100"}>
                    <div className={"d-flex justify-content-between gap-2"}>
                        <div
                            className={"h5 m-0 p-0"}
                            style={{
                                color: "var(--bs-link-color)",
                            }}
                        >
                            {race.displayGame}
                        </div>
                        <span className={"text-nowrap"}>
                            <span className={"me-1"}>
                                {race.participantCount}
                            </span>
                            <PersonIcon />
                        </span>
                    </div>
                    <div className={"d-flex justify-content-between"}>
                        <div className={"fst-italic"}>
                            {race.displayCategory}
                        </div>
                        {/*<span>*/}
                        {/*    <span className={"me-1"}>{race.creator}</span>*/}
                        {/*    <PencilIcon />*/}
                        {/*</span>*/}
                    </div>
                    <RaceFirstPlace race={race} />
                </div>
            </div>
        </a>
    );
};
