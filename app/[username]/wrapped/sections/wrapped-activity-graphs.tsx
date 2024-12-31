import React, { memo, useRef } from "react";
import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { useResizeObserver } from "usehooks-ts";
import CalendarHeatmap from "../../../../public/js/calendar-heatmap.component";
import { Col, Row } from "react-bootstrap";
import {
    PlayTimePerDayOfWeekGraph,
    PlaytimePerHourGraph,
    PlaytimePerMonthGraph,
} from "~src/components/user/stats";

interface WrappedActivityGraphsProps {
    wrapped: WrappedWithData;
}
export const WrappedActivityGraphs = memo<WrappedActivityGraphsProps>(
    ({ wrapped }) => {
        const activityGraphRef = useRef(null);
        const { width = 0 } = useResizeObserver({
            ref: activityGraphRef,
        });
        console.log({ width });
        const data = Object.entries(wrapped.playtimeData.playtimePerDayMap).map(
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
        );

        return (
            <div ref={activityGraphRef} className="w-100">
                <p className="pt-5">
                    <span className="display-4">
                        Here's your heatmap for this year.
                    </span>
                </p>
                <p className="mt-3">
                    <span className="display-6">
                        Also, we added some cool graphs. Try hovering over them!
                    </span>
                </p>
                <p className="mt-1 opacity-25">
                    <span className="fs-small">
                        I bet you like that, don't you?
                    </span>
                </p>
                <div className="flex-center w-100 min-vh-100">
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
                                />
                            </div>
                        </div>
                        <div className="d-flex align-items-center display-4 mt-5">
                            <Row className="w-100">
                                <Col>
                                    <PlaytimePerMonthGraph
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
                </div>
            </div>
        );
    },
);
WrappedActivityGraphs.displayName = "WrappedActivityGraphs";
