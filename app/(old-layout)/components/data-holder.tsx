'use server';
import React from 'react';
import { Col, Row, Table } from 'react-bootstrap';
import { type Run } from '~src/common/types';
import { getPersonalBestRuns } from '~src/lib/get-personal-best-runs';
import { RunPreview } from './run-preview';

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
                                    run.personalBestTime != '0',
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
