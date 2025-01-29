"use server";
import { Col, Row, Table } from "react-bootstrap";
import { RunPreview } from "./run-preview";
import React from "react";
import { type Run } from "../../common/types";
import { getPersonalBestRuns } from "~src/lib/server/get-personal-best-runs";

export const DataHolder = async () => {
    const runs = await getPersonalBestRuns();
    return (
        <Row>
            <Col>
                <Table bordered striped hover responsive>
                    <tbody>
                        {runs
                            .filter(
                                (run) =>
                                    run.personalBestTime != undefined &&
                                    run.personalBestTime != "0",
                            )
                            .map((run: Run) => {
                                return (
                                    <RunPreview
                                        key={`${run.user} ${run.game} ${run.run}`}
                                        run={run}
                                    />
                                );
                            })}
                    </tbody>
                </Table>
            </Col>
        </Row>
    );
};
