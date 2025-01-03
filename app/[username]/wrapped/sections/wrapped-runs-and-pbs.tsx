import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import React, { useMemo } from "react";
import { SectionWrapper } from "~app/[username]/wrapped/sections/section-wrapper";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";
import {
    Difference,
    DurationToFormatted,
    getDateAsMonthDay,
} from "~src/components/util/datetime";
import { Col, Row } from "react-bootstrap";

export const WrappedRunsAndPbs = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
    const pbPercentage = (wrapped.totalPbs / wrapped.totalFinishedRuns) * 100;

    interface PB {
        previousPb: number | null;
        game: string;
        category: string;
        pb: {
            startedAt: number;
            endedAt: number;
            time: number;
        };
    }

    const allPbs: PB[] = useMemo(() => {
        const allPbs: PB[] = [];

        wrapped.pbsAndGolds.forEach((run) => {
            run.pbs.forEach((pb, index) => {
                const previousPb =
                    index === 0 ? run.timeBefore : run.pbs[index - 1].time;

                const pbObject: PB = {
                    previousPb,
                    game: run.game,
                    category: run.category,
                    pb,
                };
                allPbs.push(pbObject);
            });
        });

        allPbs.sort((a, b) => {
            if (a.game !== b.game) {
                return a.game.localeCompare(b.game);
            }
            if (a.category !== b.category) {
                return a.category.localeCompare(b.category);
            }

            return a.pb.startedAt - b.pb.startedAt;
        });

        return allPbs;
    }, [wrapped.pbsAndGolds]);

    return (
        <SectionWrapper>
            <SectionTitle
                title={"Here's a list of your PB's this year!"}
                subtitle={`You finished ${wrapped.totalFinishedRuns} runs. ${
                    wrapped.totalPbs
                } - or ${pbPercentage.toFixed(2)}% - of them were a PB.`}
                extraRemark={
                    "We all know speedrunning is about records, not about having fun." +
                    (wrapped.totalPbs > 50
                        ? " You might have to scroll to the right a bit..."
                        : "")
                }
            />
            <SectionBody>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        overflowY: "hidden",
                        maxHeight: "70vh",
                        flexDirection: "column",
                        columnGap: "3rem",
                        minWidth: "50rem",
                    }}
                >
                    {allPbs.map((pb: PB, i) => {
                        const previousRun = i === 0 ? null : allPbs[i - 1];
                        const showGame =
                            previousRun === null ||
                            previousRun.game !== pb.game;
                        const showCategory =
                            showGame || previousRun.category !== pb.category;
                        const endedAt = new Date(pb.pb.endedAt);
                        const nextRun =
                            i === allPbs.length - 1 ? null : allPbs[i + 1];

                        return (
                            <div
                                key={pb.pb.startedAt}
                                style={{
                                    marginBottom:
                                        nextRun && nextRun.game !== pb.game
                                            ? "1rem"
                                            : 0,
                                    flexBasis: showGame ? "100%" : 0,
                                    width: "25rem",
                                }}
                            >
                                {showGame && (
                                    <div className="h3 mb-1">
                                        <b>{pb.game}</b>
                                    </div>
                                )}
                                {showCategory && (
                                    <div className="h4 mb-1 mt-2">
                                        {pb.category}
                                    </div>
                                )}
                                <Row>
                                    <Col
                                        xs={7}
                                        style={{
                                            textAlign: "start",
                                        }}
                                    >
                                        <i
                                            style={{
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {getDateAsMonthDay(endedAt)}
                                        </i>
                                    </Col>
                                    <Col
                                        xs={5}
                                        style={{
                                            textAlign: "end",
                                        }}
                                    >
                                        {pb.previousPb && (
                                            <Difference
                                                inline={true}
                                                two={pb.previousPb.toString()}
                                                one={pb.pb.time.toString()}
                                            />
                                        )}
                                        <span className="ms-3">
                                            <DurationToFormatted
                                                duration={pb.pb.time}
                                            />
                                        </span>
                                    </Col>
                                </Row>
                            </div>
                        );
                    })}
                </div>
            </SectionBody>
        </SectionWrapper>
    );
};
