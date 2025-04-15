import { memo } from "react";
import { Row } from "react-bootstrap";
import { WrappedWithData } from "../wrapped-types";
import { SectionTitle } from "./section-title";
import { SectionWrapper } from "./section-wrapper";
import { SectionStatsCard } from "./section-stats-card";
import { SectionBody } from "~app/(old-layout)/[username]/wrapped/sections/section-body";

interface WrappedStatsOverviewProps {
    wrapped: WrappedWithData;
}

export const WrappedStatsOverview = memo<WrappedStatsOverviewProps>(
    ({ wrapped }) => {
        const personalBestCount = wrapped.totalPbs;
        return (
            <SectionWrapper>
                <SectionTitle
                    title="We know you love stats. Let's get right into them!"
                    extraRemark="We couldn't decide which stats to put here – so we put them all"
                />
                <SectionBody>
                    <div className="mb-4 w-100">
                        <SectionStatsCard
                            style={{
                                width: "100%",
                                background:
                                    "linear-gradient(to right, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                            stat={wrapped.totalPlaytime}
                            statFormatter={(a) => {
                                return (
                                    a.toLocaleString() + " hours of playtime"
                                );
                            }}
                            statDescription={
                                <span>
                                    You did runs for{" "}
                                    <b>
                                        {wrapped.totalPlaytime.toLocaleString()}
                                    </b>{" "}
                                    hours in {wrapped.year}. That's about{" "}
                                    <b>
                                        {(wrapped.totalPlaytime / 365).toFixed(
                                            2,
                                        )}
                                    </b>{" "}
                                    hours per day on average!
                                </span>
                            }
                        />
                    </div>
                    <Row className="mb-2 w-100 row-cols-1 row-cols-lg-3 row-gap-5">
                        <SectionStatsCard
                            style={{
                                background:
                                    "linear-gradient(to right, #4f46e5, #6f66e5)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                            stat={wrapped.totalRuns}
                            statDescription={
                                <span>
                                    You started{" "}
                                    <b>{wrapped.totalRuns.toLocaleString()}</b>{" "}
                                    runs
                                </span>
                            }
                        />

                        <SectionStatsCard
                            style={{
                                background:
                                    "linear-gradient(to right, #f97316, #f99386)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                            stat={wrapped.totalFinishedRuns}
                            statDescription={
                                <>
                                    You finished{" "}
                                    <b>
                                        {wrapped.totalFinishedRuns.toLocaleString()}
                                    </b>{" "}
                                    (or{" "}
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

                        <SectionStatsCard
                            stat={personalBestCount}
                            statDescription={
                                <>
                                    And you got a PB{" "}
                                    <b>{personalBestCount.toLocaleString()}</b>{" "}
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
                    </Row>
                    <Row className="mb-2 w-100 row-cols-1 row-cols-lg-3 row-gap-5 counter-align">
                        <SectionStatsCard
                            stat={wrapped.totalSplits}
                            style={{
                                background:
                                    "linear-gradient(to right, #27A11B, #47C11B)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                            statDescription={
                                <>
                                    You completed a split{" "}
                                    <b>
                                        {wrapped.totalSplits.toLocaleString()}
                                    </b>{" "}
                                    times!
                                </>
                            }
                        />

                        <SectionStatsCard
                            stat={wrapped.countResetFirstSplit}
                            statDescription={
                                <>
                                    Forced to reset on the first split{" "}
                                    <b>
                                        {wrapped.countResetFirstSplit.toLocaleString()}
                                    </b>{" "}
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

                        <SectionStatsCard
                            stat={wrapped.totalGolds}
                            statDescription={
                                <>
                                    You got{" "}
                                    <b>{wrapped.totalGolds.toLocaleString()}</b>{" "}
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
                    </Row>
                    <Row className="w-100 row-cols-1 row-cols-lg-3 row-gap-5 counter-align">
                        <SectionStatsCard
                            stat={wrapped.totalGames}
                            statDescription={
                                <>
                                    You ran <b>{wrapped.totalGames}</b> games
                                </>
                            }
                            style={{
                                background:
                                    "linear-gradient(to right, #c0c0c0, #f3f3f3)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                        />
                        <SectionStatsCard
                            stat={wrapped.newGames.length}
                            statDescription={
                                <>
                                    ...<b>{wrapped.newGames.length}</b> of them
                                    for the first time!
                                </>
                            }
                            style={{
                                background:
                                    "linear-gradient(to right, #40e0d0, #73ffff)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                        />
                        <SectionStatsCard
                            stat={wrapped.totalCategories}
                            statDescription={
                                <>
                                    You did runs for a total of{" "}
                                    <b>{wrapped.totalCategories}</b> categories!
                                </>
                            }
                            style={{
                                background:
                                    "linear-gradient(to right, #c154c1, #c174e1)",
                                color: "transparent",
                                backgroundClip: "text",
                            }}
                        />
                    </Row>
                </SectionBody>
            </SectionWrapper>
        );
    },
);
WrappedStatsOverview.displayName = "WrappedStatsOverview";
