"use client";

import { Suspense, use } from "react";
import { Container } from "react-bootstrap";
import { RunPreview } from "~app/(old-layout)/components/run-preview";
import { Game } from "~app/(old-layout)/games/games.types";
import { Run } from "~src/common/types";
import { getGameGlobal } from "~src/components/game/get-game";
import { UserGameCategoryLink, UserLink } from "~src/components/links/links";
import { DurationToFormatted, FromNow } from "~src/components/util/datetime";

export const LatestPbView = ({ runs }: { runs: Run[] }) => {
    return (
        <Container fluid className="h-100 p-3 rounded-4 overflow-hidden border shadow-sm bg-body">
            {runs.map(run => {
                const gameData = getGameGlobal(run.game);

                return (
                    <Suspense
                        fallback={<div>Loading...</div>}
                    >
                        <LatestPb key={`${run.user}-${run.game}-${run.run}`} run={run} gameData={gameData} />
                    </Suspense>)
            })}
        </Container>
    )
}

export const LatestPb = ({ run, gameData }: { run: Run, gameData: Promise<any> }) => {
    const gameDataUsed = use(gameData);
    const duration = run.hasGameTime
        ? (run.gameTimeData?.personalBest as string)
        : run.personalBest;

    const gameTimeLabel = run.hasGameTime ? <span className="fs-smaller fst-italic"> (IGT)</span> : "";

    return (
        <div className="mb-2 p-1 border-start border-4 border-secondary rounded-2 ">
            <div className="ms-2">
                <div className="fs-large">
                    <UserGameCategoryLink
                        url={run.url}
                        username={run.user}
                        game={run.game}
                        category={run.run}
                    />{" "}
                    in <DurationToFormatted duration={duration} />
                    {gameTimeLabel}
                </div>

                <div className="fs-smaller">
                    <FromNow time={run.personalBestTime} /> by{" "}
                    <UserLink username={run.user} />
                    <br />
                </div>
            </div>
        </div>
    )
}