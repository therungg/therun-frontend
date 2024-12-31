import { memo, useMemo } from "react";
import { Col, Row } from "react-bootstrap";
import { WrappedWithData } from "../wrapped-types";
import { WrappedCounter } from "../wrapped-counter";

interface WrappedStatsOverviewProps {
    wrapped: WrappedWithData;
}

export const WrappedStatsOverview = memo<WrappedStatsOverviewProps>(
    ({ wrapped }) => {
        const personalBestCount = useMemo(() => {
            return wrapped.pbsAndGolds.reduce((result, entry) => {
                return result + (entry.pbs.length ?? 0);
            }, 0);
        }, [wrapped.pbsAndGolds]);
        return (
            <div>
                <Row>
                    <h2>Stats Overview</h2>
                </Row>
                <Row className="mb-5">
                    <Col>
                        <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                            <span className="display-1 fw-semibold text-decoration-underline">
                                <WrappedCounter
                                    id="total-runs-count"
                                    end={wrapped.totalRuns}
                                />
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
                                <WrappedCounter
                                    id="total-finished-runs-count"
                                    end={wrapped.totalFinishedRuns}
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
                                <WrappedCounter
                                    id="total-finished-runs-percentage"
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
                <Row className="mb-5">
                    <Col>
                        <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                            <span className="display-1 fw-semibold text-decoration-underline">
                                <WrappedCounter
                                    id="total-golds-count"
                                    end={wrapped.totalGolds}
                                    style={{
                                        background:
                                            "linear-gradient(to right, #d19e1d, #ffd86e, #e3a812)",
                                        color: "transparent",
                                        backgroundClip: "text",
                                    }}
                                />
                            </span>
                        </div>
                        <div className="flex-center h4">
                            <div>
                                Wow! You got <b>{wrapped.totalGolds}</b> gold
                                splits this year!
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                            <span className="display-1 fw-semibold text-decoration-underline">
                                <WrappedCounter
                                    id="total-pbs-count"
                                    end={personalBestCount}
                                />
                            </span>
                        </div>
                        <div className="flex-center h4">
                            <div>
                                You managed to get {personalBestCount} personal
                                bests!
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    },
);
WrappedStatsOverview.displayName = "WrappedStatsOverview";
