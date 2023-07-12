import { StatsData } from "~app/games/[game]/game.types";
import { getFormattedString } from "../../util/datetime";
import React, { useState } from "react";
import { ShowComparison } from "./show-comparison";
import { Run, RunHistory, SplitsHistory } from "~src/common/types";
import { Col, Row } from "react-bootstrap";
import { UserLink } from "../../links/links";
import { getSplitsHistoryUrl } from "~src/lib/get-splits-history";
import { AppContext } from "~src/common/app.context";

// eslint-disable-next-line import/no-commonjs
const levenshtein = require("js-levenshtein");

interface UserData {
    meta: any;
    stats: History;
}

export const CompareSplits = ({
    statsData,
    category,
    username,
    splits,
    run,
    runs,
    gameTime,
}: {
    statsData: StatsData;
    category: string;
    username: string;
    splits: SplitsHistory[];
    run: Run;
    runs: RunHistory[];
    gameTime: boolean;
}) => {
    const { baseUrl = "https://therun.gg" } = React.useContext(AppContext);
    const [currentUser, setCurrentUser] = useState("no-selection");
    const [userData, setUserData] = useState(new Map());
    const [loaded, setLoaded] = useState(true);

    const stats =
        gameTime && statsData.statsGameTime
            ? statsData.statsGameTime
            : statsData.stats;

    let catLeaderboard = stats.categoryLeaderboards.find(
        (leaderboard) => leaderboard.categoryNameDisplay == category
    );

    if (!catLeaderboard) {
        const leven = stats.categoryLeaderboards.map((leaderboard, key) => [
            key,
            levenshtein(category, leaderboard.categoryNameDisplay),
        ]);
        const highest = leven.reduce((prev, current) => {
            return prev[1] < current[1] ? prev : current;
        })[0];
        catLeaderboard = stats.categoryLeaderboards[highest];
    }

    if (!catLeaderboard) return <>Could not find similar runs...</>;

    const currentUserData =
        currentUser != "no-selection" && loaded
            ? userData.get(currentUser)[
                  !gameTime ? "currentRuns" : "runsGameTime"
              ]
            : null;

    // This is really old, should be improved

    return (
        <div>
            <Row>
                <Col>
                    <h2>
                        Compare{" "}
                        {currentUser &&
                            (currentUser != "no-selection" ||
                                currentUserData) &&
                            "to "}
                        {currentUser &&
                            (currentUser != "no-selection" ||
                                currentUserData) && (
                                <UserLink username={currentUser} />
                            )}
                    </h2>
                </Col>
            </Row>
            <select
                className={"form-select"}
                style={{ width: "40%", marginBottom: "1rem" }}
                onChange={async (e) => {
                    const selectedUser = e.currentTarget.value.split(" (")[0];
                    const fullUser = catLeaderboard.pbLeaderboard.find(
                        (l) => l.username == selectedUser
                    );
                    const correctUrl = fullUser.url;
                    setCurrentUser(selectedUser);

                    try {
                        if (!userData.has(selectedUser)) {
                            setLoaded(false);
                            const url = `${baseUrl}/api/users${correctUrl}`;

                            const gamesData: UserData = await (
                                await fetch(url, {
                                    method: "GET",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                })
                            ).json();

                            const currentRuns = await (
                                await fetch(
                                    getSplitsHistoryUrl(
                                        gamesData.meta.historyFilename,
                                        false
                                    ),
                                    {
                                        mode: "cors",
                                    }
                                )
                            ).json();

                            let runsGameTime = null;

                            if (gamesData.meta.hasGameTime) {
                                runsGameTime = await (
                                    await fetch(
                                        getSplitsHistoryUrl(
                                            gamesData.meta.historyFilename,
                                            true
                                        ),
                                        {
                                            mode: "cors",
                                        }
                                    )
                                ).json();
                            }

                            const prevMap = userData;
                            prevMap.set(selectedUser, {
                                meta: gamesData.meta,
                                currentRuns,
                                runsGameTime,
                            });
                            setUserData(prevMap);
                        }
                    } finally {
                        setLoaded(true);
                    }
                }}
            >
                {(currentUser == "no-selection" || !currentUserData) && (
                    <option key={"no-selection"}>
                        Select run to compare to
                    </option>
                )}
                {catLeaderboard.pbLeaderboard
                    .filter((lb) => lb.username != username)
                    .map((lb) => {
                        return (
                            <option
                                key={lb.username + lb.stat}
                                data-url={lb.url}
                            >
                                {lb.username} (
                                {getFormattedString(lb.stat.toString())})
                            </option>
                        );
                    })}
            </select>
            <hr />
            {currentUser != "no-selection" && !loaded && (
                <>Loading data for {currentUser}...</>
            )}
            {currentUserData && (
                <ShowComparison
                    one={splits}
                    two={currentUserData.splits}
                    userOne={username}
                    userTwo={currentUser}
                    runOne={!gameTime ? run : { ...run, ...run.gameTimeData }}
                    runTwo={
                        !gameTime
                            ? userData.get(currentUser).meta
                            : {
                                  ...userData.get(currentUser).meta,
                                  ...userData.get(currentUser).meta
                                      .gameTimeData,
                              }
                    }
                    runsOne={runs}
                    runsTwo={currentUserData.runs}
                />
            )}
        </div>
    );
};
