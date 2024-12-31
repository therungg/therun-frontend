import { memo, useMemo } from "react";
import { Row } from "react-bootstrap";
import { WrappedWithData } from "../wrapped-types";
import { SectionTitle } from "./section-title";
import { SectionWrapper } from "./section-wrapper";
import { SectionStatsCard } from "./section-stats-card";

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
            <SectionWrapper>
                <SectionTitle>Stats Overview</SectionTitle>
                <div className="h-100 d-flex flex-column justify-content-center ">
                    <Row className="mb-5">
                        <SectionStatsCard
                            stat={wrapped.totalRuns}
                            statDescription={
                                <>
                                    This year, you started a total of{" "}
                                    <b>{wrapped.totalRuns}</b> runs!
                                </>
                            }
                        />
                        <SectionStatsCard
                            stat={wrapped.totalFinishedRuns}
                            statDescription={
                                <>
                                    Of these <b>{wrapped.totalRuns}</b> runs,
                                    you finished{" "}
                                    <b>{wrapped.totalFinishedRuns}</b>
                                </>
                            }
                        />
                        <SectionStatsCard
                            stat={
                                (wrapped.totalFinishedRuns /
                                    wrapped.totalRuns) *
                                100 *
                                100
                            }
                            statFormatter={(value: number) => {
                                return (value / 100).toFixed(2) + "%";
                            }}
                            statDescription={
                                <>
                                    {" "}
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
                                </>
                            }
                        />
                    </Row>
                    <Row className="mb-5">
                        <SectionStatsCard
                            stat={wrapped.totalGolds}
                            statDescription={
                                <>
                                    Wow! You got <b>{wrapped.totalGolds}</b>{" "}
                                    gold splits this year!
                                </>
                            }
                            style={{
                                background:
                                    "linear-gradient(to right, #d19e1d, #ffd86e, #e3a812)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                        />
                        <SectionStatsCard
                            stat={personalBestCount}
                            statDescription={
                                <>
                                    You managed to get {personalBestCount}{" "}
                                    personal bests!
                                </>
                            }
                        />
                    </Row>
                </div>
            </SectionWrapper>
        );
    },
);
WrappedStatsOverview.displayName = "WrappedStatsOverview";
