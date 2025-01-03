import React, { memo, useMemo, useRef } from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { useResizeObserver } from "usehooks-ts";
import CalendarHeatmap from "../../../../public/js/calendar-heatmap.component";
import { Col, Row } from "react-bootstrap";
import {
    PlayTimePerDayOfWeekGraph,
    PlaytimePerHourGraph,
    PlaytimePerMonthGraph,
} from "~src/components/user/stats";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";

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
            <div ref={activityGraphRef} className="w-100">
                <SectionTitle
                    title={"Here's your heatmap for this year."}
                    subtitle="Also, we added some cool graphs. Try hovering over them!"
                    extraRemark={"I bet you like that, don't you?"}
                />
                <SectionBody>
                    <div className="w-100">
                        <div className="d-flex align-items-center display-4">
                            <div
                                className="w-100 playtime-graph"
                                style={{
                                    marginTop: "1rem",
                                    marginBottom: "2rem",
                                }}
                            >
                                <CalendarHeatmap
                                    width={width}
                                    data={data}
                                    setter={() => {}}
                                    overview="year"
                                />
                            </div>
                        </div>
                        <div className="d-flex align-items-center display-4 mt-5">
                            <Row className="w-100">
                                <Col>
                                    <PlaytimePerMonthGraph
                                        year={wrapped.year}
                                        playtimePerMonthMap={
                                            wrapped.playtimeData
                                                .playtimePerMonthMap
                                        }
                                    />
                                </Col>
                                <Col>
                                    <PlayTimePerDayOfWeekGraph
                                        playtimePerDayOfWeekMap={
                                            wrapped.playtimeData
                                                .playtimePerDayOfWeekMap
                                        }
                                    />
                                </Col>
                                <Col>
                                    <PlaytimePerHourGraph
                                        playtimePerHourMap={
                                            wrapped.playtimeData
                                                .playtimePerHourMap
                                        }
                                    />
                                </Col>
                            </Row>
                        </div>
                    </div>
                </SectionBody>
            </div>
        );
    },
);
WrappedActivityGraphs.displayName = "WrappedActivityGraphs";
