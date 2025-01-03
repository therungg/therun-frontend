import { memo } from "react";
import { Col, Row } from "react-bootstrap";
import { WrappedWithData } from "../wrapped-types";
import { SectionTitle } from "./section-title";
import { SectionWrapper } from "./section-wrapper";
import { SectionStatsCard } from "./section-stats-card";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";

interface WrappedStatsOverviewProps {
    wrapped: WrappedWithData;
}

export const WrappedStatsOverview = memo<WrappedStatsOverviewProps>(
    ({ wrapped }) => {
        const personalBestCount = wrapped.totalPbs;
        return (
            <SectionWrapper>
                <SectionTitle
                    title="We know you love stats. Let's get right into it!"
                    extraRemark="We couldn't decide which stats to put here -- so we put them all"
                />
                <SectionBody>
                    <Row className="mb-4">
                        <Col md={12} lg={4}>
                            <SectionStatsCard
                                stat={wrapped.totalRuns}
                                statDescription={
                                    <span>
                                        You started <b>{wrapped.totalRuns}</b>{" "}
                                        runs
                                    </span>
                                }
                            />
                        </Col>
                        <Col md={12} lg={4}>
                            <SectionStatsCard
                                stat={wrapped.totalFinishedRuns}
                                statDescription={
                                    <>
                                        You finished{" "}
                                        <b>{wrapped.totalFinishedRuns}</b> (or{" "}
                                        <b>
                                            {(
                                                (wrapped.totalFinishedRuns /
                                                    wrapped.totalRuns) *
                                                100
                                            ).toFixed(2)}
                                            %
                                        </b>
                                        ) of them
                                    </>
                                }
                            />
                        </Col>
                        <Col md={12} lg={4}>
                            <SectionStatsCard
                                stat={personalBestCount}
                                statDescription={
                                    <>
                                        And you got a PB {personalBestCount}{" "}
                                        times!
                                    </>
                                }
                                style={{
                                    background:
                                        "linear-gradient(to right, #80FF72, #7EE8FA)",
                                    color: "transparent",
                                    backgroundClip: "text",
                                }}
                            />
                        </Col>
                    </Row>
                    <Row className="mb-4">
                        <Col md={12} lg={4}>
                            <SectionStatsCard
                                stat={wrapped.totalSplits}
                                statDescription={
                                    <>
                                        You hit your split hotkey{" "}
                                        <b>{wrapped.totalSplits}</b> times!
                                    </>
                                }
                            />
                        </Col>
                        <Col md={12} lg={4}>
                            <SectionStatsCard
                                stat={wrapped.countResetFirstSplit}
                                statDescription={
                                    <>
                                        Forced to reset on the first split{" "}
                                        <b>{wrapped.countResetFirstSplit}</b>{" "}
                                        times...
                                    </>
                                }
                                style={{
                                    background:
                                        "linear-gradient(to right, #E01C34, #CCABB0)",
                                    color: "transparent",
                                    backgroundClip: "text",
                                }}
                            />
                        </Col>
                        <Col md={12} lg={4}>
                            <SectionStatsCard
                                stat={wrapped.totalGolds}
                                statDescription={
                                    <>
                                        You got <b>{wrapped.totalGolds}</b> gold
                                        splits this year!
                                    </>
                                }
                                style={{
                                    background:
                                        "linear-gradient(to right, #d19e1d, #ffd86e, #e3a812)",
                                    color: "transparent",
                                    backgroundClip: "text",
                                }}
                            />
                        </Col>
                    </Row>
                    <Row className="mb-4">
                        <Col md={12} lg={6}>
                            <SectionStatsCard
                                stat={wrapped.totalGames}
                                statDescription={
                                    <>
                                        You ran <b>{wrapped.totalGames}</b>{" "}
                                        games, <b>{wrapped.newGames.length}</b>{" "}
                                        of them for the first time!
                                    </>
                                }
                            />
                        </Col>
                        <Col md={12} lg={6}>
                            <SectionStatsCard
                                stat={wrapped.totalCategories}
                                statDescription={
                                    <>
                                        You did runs for a total of{" "}
                                        <b>{wrapped.totalCategories}</b>{" "}
                                        categories!
                                    </>
                                }
                            />
                        </Col>
                    </Row>
                </SectionBody>
            </SectionWrapper>
        );
    },
);
WrappedStatsOverview.displayName = "WrappedStatsOverview";
