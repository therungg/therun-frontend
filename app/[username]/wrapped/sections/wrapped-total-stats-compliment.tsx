import { memo } from "react";
import { WrappedWithData } from "../wrapped-types";
import { Col, Row } from "react-bootstrap";
import CountUp from "react-countup/build/CountUp";

interface WrappedTotalStatsComplimentProps {
    wrapped: WrappedWithData;
}

export const WrappedTotalStatsCompliment =
    memo<WrappedTotalStatsComplimentProps>(({ wrapped }) => {
        return (
            <div>
                <Row className="mb-5">
                    <Col>
                        <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                            <span className="display-1 fw-semibold text-decoration-underline">
                                <CountUp end={wrapped.totalRuns} duration={4} />
                            </span>
                        </div>
                        <div className="flex-center h4">
                            <div>
                                This year, you started a total of{" "}
                                <b>{wrapped.totalRuns}</b> runs!
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                            <span className="display-1 fw-semibold text-decoration-underline">
                                <CountUp
                                    end={wrapped.totalFinishedRuns}
                                    duration={4}
                                />
                            </span>
                        </div>
                        <div className="flex-center h4">
                            <div>
                                Of these <b>{wrapped.totalRuns}</b> runs, you
                                finished <b>{wrapped.totalFinishedRuns}</b>
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                            <span className="display-1 fw-semibold text-decoration-underline">
                                <CountUp
                                    end={
                                        (wrapped.totalFinishedRuns /
                                            wrapped.totalRuns) *
                                        100 *
                                        100
                                    }
                                    duration={2}
                                    formattingFn={(value: number) => {
                                        return (value / 100).toFixed(2) + "%";
                                    }}
                                />
                            </span>
                        </div>
                        <div className="flex-center h4">
                            <div>
                                That gives you a finish percentage of{" "}
                                <b>
                                    {" "}
                                    {(
                                        (wrapped.totalFinishedRuns /
                                            wrapped.totalRuns) *
                                        100
                                    ).toFixed(2)}
                                    %
                                </b>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    });
WrappedTotalStatsCompliment.displayName = "WrappedTotalStatsCompliment";
