"use server";
import React from "react";
import { Col, Row } from "react-bootstrap";
import { RunPreview } from "../run-preview";
import { type Run } from "~src/common/types";
import { getPersonalBestRuns } from "~src/lib/server/get-personal-best-runs";
import { getGameGlobal } from "~src/components/game/get-game";
import { getGlobalUser } from "~src/lib/server/get-global-user";

export const DataHolder = async () => {
    const runs = await getPersonalBestRuns();
    return (
        <Row>
            <Col>
                {runs
                    .filter(
                        (run) =>
                            run.personalBestTime != undefined &&
                            run.personalBestTime != "0",
                    )
                    .map(async (run: Run) => {
                        const gameGlobalData = await getGameGlobal(run.game);
                        const userGlobalData = await getGlobalUser(run.user);

                        return (
                            <RunPreview
                                key={`${run.user} ${run.game} ${run.run}`}
                                run={run}
                                gameGlobalData={gameGlobalData}
                                userGlobalData={userGlobalData}
                            />
                        );
                    })}
            </Col>
        </Row>
    );
};
