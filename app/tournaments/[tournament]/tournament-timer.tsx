import { Tournament } from "~src/components/tournament/tournament-info";
import Countdown from "react-countdown";
import React from "react";

export const TournamentTimer = ({ tournament }: { tournament: Tournament }) => {
    const now = new Date();

    const eventStarted = now > new Date(tournament.startDate);
    const eventEnded = now > new Date(tournament.endDate);

    const hasHeats =
        tournament.eligiblePeriods && tournament.eligiblePeriods.length > 1;

    let currentHeatIndex = -1;
    let nextHeat = -1;

    if (hasHeats) {
        currentHeatIndex = tournament.eligiblePeriods.findIndex((heat, i) => {
            if (nextHeat === -1 && now < new Date(heat.startDate)) {
                nextHeat = i;
            } else if (now < new Date(heat.endDate)) {
                return true;
            }

            return false;
        });
    }
    const renderCountdown = ({ days, hours, minutes, completed }) => {
        if (completed) {
            return <span>Now</span>;
        }

        const dayString = parseInt(days) > 0 ? `${days}d, ` : "";
        const hourString =
            parseInt(hours) > 0 || parseInt(days) > 0 ? `${hours}h ` : "";

        const minuteString = `${minutes}m`;

        return (
            <span>
                in {dayString}
                {hourString}
                {minuteString}
            </span>
        );
    };

    if (!eventStarted) {
        return (
            <>
                Event starts{" "}
                <Countdown
                    date={new Date(tournament.startDate)}
                    renderer={renderCountdown}
                />
                !
            </>
        );
    }

    if (eventEnded) {
        return <>Event ended!</>;
    }

    // If we get here, event is in progress

    if (hasHeats) {
        if (currentHeatIndex !== -1) {
            return (
                <>
                    Day {currentHeatIndex + 1}/
                    {tournament.eligiblePeriods.length} ends{" "}
                    <Countdown
                        date={
                            new Date(
                                tournament.eligiblePeriods[
                                    currentHeatIndex
                                ].endDate,
                            )
                        }
                        renderer={renderCountdown}
                    />
                </>
            );
        } else {
            return (
                <>
                    Day {nextHeat + 1}/{tournament.eligiblePeriods.length}{" "}
                    starts{" "}
                    <Countdown
                        date={
                            new Date(
                                tournament.eligiblePeriods[nextHeat].startDate,
                            )
                        }
                        renderer={renderCountdown}
                    />
                    !
                </>
            );
        }
    }

    return (
        <>
            Event ends{" "}
            <Countdown
                date={new Date(tournament.endDate)}
                renderer={renderCountdown}
            />
            !
        </>
    );
};
