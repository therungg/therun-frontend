import React, { memo, useMemo, useRef } from "react";
import { WrappedWithData } from "~app/(old-layout)/[username]/wrapped/wrapped-types";
import { useResizeObserver } from "usehooks-ts";
import CalendarHeatmap from "../../../../../public/js/calendar-heatmap.component";
import { Row } from "react-bootstrap";
import {
    PlayTimePerDayOfWeekGraph,
    PlaytimePerHourGraph,
    PlaytimePerMonthGraph,
} from "~src/components/user/stats";
import { SectionTitle } from "~app/(old-layout)/[username]/wrapped/sections/section-title";
import { SectionBody } from "~app/(old-layout)/[username]/wrapped/sections/section-body";
import { SectionWrapper } from "./section-wrapper";

interface WrappedActivityGraphsProps {
    wrapped: WrappedWithData;
}

export const WrappedActivityGraphs = memo<WrappedActivityGraphsProps>(
    ({ wrapped }) => {
        const activityGraphRef = useRef(null);
        const { width = 0 } = useResizeObserver({
            ref: activityGraphRef,
        });
        const data = useMemo(
            () =>
                Object.entries(wrapped.playtimeData.playtimePerDayMap).map(
                    ([date, stat]) => {
                        return {
                            date,
                            total: stat.total / 1000,
                            details: Object.entries(stat.perGame).map(
                                ([game, gameStat]) => {
                                    return {
                                        name: game,
                                        date,
                                        value: gameStat.total / 1000,
                                    };
                                },
                            ),
                        };
                    },
                ),
            [wrapped.playtimeData.playtimePerDayMap],
        );

        return (
            <SectionWrapper ref={activityGraphRef}>
                <SectionTitle
                    title="We added some cool graphs."
                    extraRemark="Try hovering over them! Pretty neat, right?"
                />
                <SectionBody>
                    <>
                        <div className="d-none d-lg-block mb-3 py-3 game-border border-2 bg-opacity-25 bg-body-secondary rounded-3">
                            <h3 className="fw-normal mb-2">
                                Your heatmap of this year
                            </h3>
                            <div
                                className="playtime-graph"
                                style={{ transform: `scale(.9)` }}
                            >
                                <CalendarHeatmap
                                    width={width}
                                    data={data}
                                    setter={() => {}}
                                    overview="year"
                                />
                            </div>
                        </div>
                        <Row className="row-cols-1 row-cols-xl-3 flex-center display-4 heatmap align-self-stretch">
                            <div className="py-1">
                                <div className="game-border border-2 bg-opacity-25 bg-body-secondary p-1 pt-3 rounded-3">
                                    <PlaytimePerMonthGraph
                                        year={wrapped.year}
                                        playtimePerMonthMap={
                                            wrapped.playtimeData
                                                .playtimePerMonthMap
                                        }
                                    />
                                </div>
                            </div>
                            <div className="py-1">
                                <div className="game-border border-2 bg-opacity-25 bg-body-secondary p-1 pt-3 rounded-3">
                                    <PlayTimePerDayOfWeekGraph
                                        playtimePerDayOfWeekMap={
                                            wrapped.playtimeData
                                                .playtimePerDayOfWeekMap
                                        }
                                    />
                                </div>
                            </div>
                            <div className="py-1">
                                <div className="game-border border-2 bg-opacity-25 bg-body-secondary p-1 pt-3 rounded-3">
                                    <PlaytimePerHourGraph
                                        playtimePerHourMap={
                                            wrapped.playtimeData
                                                .playtimePerHourMap
                                        }
                                    />
                                </div>
                            </div>
                        </Row>
                    </>
                </SectionBody>
            </SectionWrapper>
        );
    },
);
WrappedActivityGraphs.displayName = "WrappedActivityGraphs";
