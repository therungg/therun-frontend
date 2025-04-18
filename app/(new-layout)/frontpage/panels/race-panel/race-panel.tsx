import { Panel } from "~app/(new-layout)/components/panel.component";
import { getAllActiveRaces, getPaginatedFinishedRaces } from "~src/lib/races";
import { RaceCard } from "./race-card";
import { Race } from "~app/(old-layout)/races/races.types";

const FRONTPAGE_RACE_COUNT = 3;

export default async function RacePanel() {
    const races = await getAllActiveRaces();

    const pendingRaces = races.filter((race) => race.status === "pending");
    const progressRaces = races.filter((race) => race.status !== "pending");

    let finishedRaces: Race[] = [];
    let finishedRaceCount = undefined;

    if (races.length < FRONTPAGE_RACE_COUNT) {
        const finishedRaceData = await getPaginatedFinishedRaces(
            1,
            FRONTPAGE_RACE_COUNT - races.length,
        );
        finishedRaces = finishedRaceData.items;
        finishedRaceCount = finishedRaceData.totalItems;
    }

    return (
        <Panel
            subtitle="Race against friends"
            title="Races"
            link={{ url: "/races", text: "View All Races" }}
            className="px-3 pb-3"
        >
            {progressRaces.length > 0 && (
                <div className="mt-2">
                    <div className="d-flex justify-content-between">
                        <h5>Ongoing</h5>
                        <span className="text-muted">
                            Total ongoing: {progressRaces.length}
                        </span>
                    </div>
                    {progressRaces.map((race, i) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            className={i > 0 ? "mt-2" : ""}
                        />
                    ))}
                </div>
            )}
            {pendingRaces.length > 0 && (
                <div className="mt-2">
                    <div className="d-flex justify-content-between">
                        <h5>Upcoming</h5>
                        <span className="text-muted">
                            Total upcoming: {pendingRaces.length}
                        </span>
                    </div>
                    {pendingRaces.map((race, i) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            className={i > 0 ? "mt-2" : ""}
                        />
                    ))}
                </div>
            )}
            {finishedRaces.length > 0 && (
                <div className="mt-2">
                    <div className="d-flex justify-content-between">
                        <h5>Finished</h5>
                        <span className="text-muted">
                            Total finished: {finishedRaceCount}
                        </span>
                    </div>
                    {finishedRaces.map((race, i) => (
                        <RaceCard
                            key={race.raceId}
                            race={race}
                            className={i > 0 ? "mt-2" : ""}
                        />
                    ))}
                </div>
            )}
        </Panel>
    );
}
