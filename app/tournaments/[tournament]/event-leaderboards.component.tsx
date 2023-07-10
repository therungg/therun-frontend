import { getLeaderboard } from "~src/components/game/game-leaderboards";
import { DurationToFormatted } from "~src/components/util/datetime";
import React, { useState } from "react";
import { Tournament } from "~src/components/tournament/tournament-info";
import { PaginatedGameLeaderboard } from "~src/components/game/paginated-game-leaderboard";

export const EventLeaderboards = ({
    tournament,
    gameTime,
    qualifierData,
    tournamentLeaderboards,
}: {
    tournament: Tournament;
    gameTime: boolean;
    qualifierData: any;
    tournamentLeaderboards: any;
}) => {
    const [leaderboard, setLeaderboard] = useState(gameTime ? "pbIGT" : "pb");
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
                    {gameTime && (
                        <option
                            key={"pbIGT"}
                            title={"Tournament PB (IGT)"}
                            value={"pbIGT"}
                        >
                            Tournament PB (loadless)
                        </option>
                    )}

                    <option key={"pb"} title={"Tournament PB"} value={"pb"}>
                        Tournament PB
                    </option>
                    {qualifierData && (
                        <option
                            key={"qualifier"}
                            title={"Qualifier Leaderboard"}
                            value={"qualifier"}
                        >
                            Qualifier Leaderboard
                        </option>
                    )}
                    {tournament.pointDistribution &&
                        tournament.pointDistribution.length > 0 && (
                            <option
                                key={"points"}
                                title={"Qualification Points"}
                                value={"points"}
                            >
                                Qualification Points
                            </option>
                        )}
                    <option
                        key={"attempts"}
                        title={"Total Attempts"}
                        value={"attempts"}
                    >
                        Total Attempts
                    </option>
                    <option
                        key={"finishedAttempts"}
                        title={"Total Finished Attempts"}
                        value={"finishedAttempts"}
                    >
                        Total Finished Attempts
                    </option>

                    <option
                        key={"playtime"}
                        title={"Total Playtime"}
                        value={"playtime"}
                    >
                        Total Playtime
                    </option>
                </select>
            </div>
            {tournamentLeaderboards && (
                <span>
                    {" "}
                    {leaderboard == "pbIGT" && (
                        <PaginatedGameLeaderboard
                            name="Tournament PB (IGT)"
                            leaderboard={tournamentLeaderboards.pbLeaderboard}
                            transform={(stat) => {
                                return (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                    />
                                );
                            }}
                        />
                    )}
                    {leaderboard == "pb" && (
                        <PaginatedGameLeaderboard
                            name="Personal Best"
                            leaderboard={tournament.leaderboards.pbLeaderboard}
                            transform={(stat) => {
                                return (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                    />
                                );
                            }}
                        />
                    )}
                    {tournament.pointDistribution &&
                        tournament.pointDistribution.length > 0 &&
                        leaderboard == "points" && (
                            <div>
                                {getLeaderboard(
                                    "Qualification Points",
                                    tournamentLeaderboards.pbLeaderboard,
                                    "",
                                    (stat, key) => {
                                        if (
                                            tournament.pointDistribution
                                                ?.length -
                                                1 <
                                            key
                                        )
                                            return null;

                                        return tournament.pointDistribution[
                                            key
                                        ];
                                    }
                                )}
                            </div>
                        )}
                    {qualifierData &&
                        qualifierData.leaderboards &&
                        leaderboard == "qualifier" && (
                            <div>
                                {getLeaderboard(
                                    "Qualifier PB",
                                    tournament.gameTime
                                        ? qualifierData.leaderboards.gameTime
                                              .pbLeaderboard
                                        : qualifierData.leaderboards
                                              .pbLeaderboard,
                                    "",
                                    (stat) => {
                                        return (
                                            <DurationToFormatted
                                                duration={stat.toString()}
                                            />
                                        );
                                    }
                                )}
                            </div>
                        )}
                    {leaderboard == "sob" && (
                        <PaginatedGameLeaderboard
                            name="Sum of Bests"
                            leaderboard={
                                tournamentLeaderboards.sumOfBestsLeaderboard
                            }
                            transform={(stat) => {
                                return (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                    />
                                );
                            }}
                        />
                    )}
                    {leaderboard == "attempts" && (
                        <PaginatedGameLeaderboard
                            name="Total Attempts"
                            leaderboard={
                                tournamentLeaderboards.attemptCountLeaderboard
                            }
                            transform={(stat) => {
                                return stat;
                            }}
                        />
                    )}
                    {leaderboard == "finishedAttempts" && (
                        <PaginatedGameLeaderboard
                            name="Finished Attempts"
                            leaderboard={
                                tournamentLeaderboards.finishedAttemptCountLeaderboard
                            }
                            transform={(stat) => {
                                return stat;
                            }}
                        />
                    )}
                    {leaderboard == "playtime" && (
                        <PaginatedGameLeaderboard
                            name="Total Playtime"
                            leaderboard={
                                tournamentLeaderboards.totalRunTimeLeaderboard
                            }
                            transform={(stat) => {
                                return (
                                    <DurationToFormatted
                                        duration={stat.toString()}
                                    />
                                );
                            }}
                        />
                    )}
                </span>
            )}
        </div>
    );
};
