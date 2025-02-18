import { Race } from "~app/races/races.types";

export const getInProgressRaces = (races: Race[]): Race[] => {
    return races
        .filter((race) => {
            return (
                race.status === "progress" ||
                race.status === "starting" ||
                race.status === "finished"
            );
        })
        .sort((a, b) => {
            return (
                new Date(a.startTime as string).getTime() -
                new Date(b.startTime as string).getTime()
            );
        });
};

export const getUpcomingRaces = (races: Race[]): Race[] => {
    return races
        .filter((race) => {
            return race.status === "pending";
        })
        .sort((a, b) => {
            return (
                new Date(a.startTime as string).getTime() -
                new Date(b.startTime as string).getTime()
            );
        });
};
