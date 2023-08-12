import { Tournament } from "~src/components/tournament/tournament-info";
import React, { useState } from "react";
import { DurationToFormatted } from "~src/components/util/datetime";
import { PaginatedGameLeaderboard } from "~src/components/game/paginated-game-leaderboard";

export const CombinedEventLeaderboards = ({
    tournaments,
}: {
    tournaments: Tournament[];
}) => {
    const [leaderboard, setLeaderboard] = useState(tournaments[0].name);

    return (
        <div>
            <h3>Event leaderboards</h3>
            <div style={{ marginBottom: "1rem" }}>
                <select
                    className={"form-select"}
                    onChange={(e) => {
                        setLeaderboard(e.target.value);
                    }}
                >
                    {tournaments.map((tournament) => {
                        return (
                            <option
                                key={tournament.name}
                                title={tournament.name}
                                value={tournament.name}
                            >
                                {tournament.name}
                            </option>
                        );
                    })}
                </select>
            </div>
            {tournaments.map((tournament) => {
                if (
                    leaderboard !== tournament.name
                    // !tournament.leaderboards?.pbLeaderboard
                )
                    return;

                return (
                    <PaginatedGameLeaderboard
                        key={tournament.name}
                        name={tournament.name}
                        leaderboard={tournament.leaderboards?.pbLeaderboard}
                        transform={(stat) => {
                            return (
                                <DurationToFormatted
                                    duration={stat.toString()}
                                />
                            );
                        }}
                    />
                );
            })}
        </div>
    );
};
