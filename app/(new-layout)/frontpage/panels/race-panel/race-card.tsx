"use client";

import { FaRocket, FaTrophy, FaUser } from "react-icons/fa6";
import { Race } from "~app/(old-layout)/races/races.types";
import styles from "./race-panel.module.scss";
import { CardWithImage } from "~app/(new-layout)/components/card-with-image.component";
import { FC, HTMLAttributes, PropsWithChildren } from "react";
import { RaceTimer } from "~app/(old-layout)/races/[race]/race-timer";
import { useRace } from "~app/(old-layout)/races/hooks/use-race";
import clsx from "clsx";
import { PingAnimation } from "~app/(new-layout)/components/ping-animation.component";
import {
    DurationToFormatted,
    LocalizedTime,
} from "~src/components/util/datetime";
import { sortRaceParticipants } from "~app/(old-layout)/races/[race]/sort-race-participants";

interface RaceCardProps extends HTMLAttributes<HTMLDivElement> {
    race: Race;
}

export const RaceCard: FC<PropsWithChildren<RaceCardProps>> = ({
    race,
    ...props
}) => {
    const imageUrl =
        race.gameImage && race.gameImage !== "noimage"
            ? race.gameImage
            : `/logo_dark_theme_no_text_transparent.png`;

    const { raceState } = useRace(race, []);

    race = raceState;

    const className = clsx(props.className, styles.link);
    props.className = className;

    const firstPlace = sortRaceParticipants(race)[0];
    const firstPlaceFinished =
        firstPlace?.status === "finished" || firstPlace?.status === "confirmed";

    return (
        <div>
            <a href={"/races/" + race.raceId} className={className}>
                <CardWithImage
                    key={race.raceId}
                    imageUrl={imageUrl}
                    imageAlt={race.game}
                    {...props}
                >
                    <div className="d-flex justify-content-between">
                        <div className="fs-larger fw-bold">
                            {race.displayGame}
                        </div>
                        <span>
                            {race.status === "pending" &&
                                race.startMethod === "everyone-ready" &&
                                race.readyParticipantCount.toString() + "/"}
                            {race.participantCount}{" "}
                            <FaUser
                                size={14}
                                className="mb-1 ms-1 text-highlight"
                            />
                        </span>
                    </div>
                    <div className="d-flex justify-content-between">
                        <div className={styles.category}>
                            {race.displayCategory}
                        </div>
                        {firstPlace && (
                            <span className={styles.result}>
                                {firstPlace.user}{" "}
                                {firstPlaceFinished ? (
                                    <span className="font-monospace">
                                        {"- "}
                                        <DurationToFormatted
                                            duration={
                                                firstPlace.finalTime?.toString() as string
                                            }
                                        />{" "}
                                        <FaTrophy
                                            size={14}
                                            className="mb-1 ms-1 text-highlight text-secondary"
                                        />
                                    </span>
                                ) : (
                                    <FaRocket
                                        size={14}
                                        className="ms-1 text-highlight text-secondary"
                                    />
                                )}
                            </span>
                        )}
                        {race.results && (
                            <span className={styles.result}>
                                {race.results[0].name}{" "}
                                <FaTrophy
                                    size={14}
                                    className="ms-1 text-highlight text-secondary"
                                />
                            </span>
                        )}
                    </div>
                    {race.status === "progress" && (
                        <div className="d-flex justify-content-center d-flex mt-2">
                            <div
                                className={clsx(
                                    "px-2 rounded-2",
                                    styles.timerContainer,
                                )}
                            >
                                <span className={styles.timer}>
                                    <div className="d-flex justify-content-center">
                                        <RaceTimer race={race} />
                                        <div className="ms-2 d-flex justify-content-start mt-2">
                                            <PingAnimation />
                                        </div>
                                    </div>
                                </span>
                            </div>
                        </div>
                    )}
                    {race.status === "pending" && (
                        <div className="mt-2 d-flex justify-content-center text-muted d-flex">
                            {race.startMethod === "everyone-ready" && (
                                <span>Waiting for ready up...</span>
                            )}
                            {race.startMethod === "moderator" && (
                                <span>Waiting for moderator to start...</span>
                            )}
                            {race.startMethod === "datetime" && (
                                <span>
                                    Starts on{" "}
                                    <LocalizedTime
                                        date={
                                            new Date(race.willStartAt as string)
                                        }
                                        options={{
                                            year: undefined,
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        }}
                                    />
                                </span>
                            )}
                        </div>
                    )}
                    {race.status === "finished" &&
                        race.results &&
                        race.results.length > 0 && (
                            <div className="d-flex justify-content-center d-flex mt-2">
                                <div className={clsx(styles.timerContainer)}>
                                    <span
                                        className={clsx(
                                            styles.timer,
                                            "fst-italic",
                                        )}
                                    >
                                        <DurationToFormatted
                                            duration={
                                                race.results[0].finalTime?.toString() as string
                                            }
                                        />
                                    </span>
                                </div>
                            </div>
                        )}
                </CardWithImage>
            </a>
        </div>
    );
};
