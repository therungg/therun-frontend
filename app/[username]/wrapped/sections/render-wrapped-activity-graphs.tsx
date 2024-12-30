import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import React from "react";
import CalendarHeatmap from "../../../../public/js/calendar-heatmap.component";
import { Col, Row } from "react-bootstrap";
import {
    PlayTimePerDayOfWeekGraph,
    PlaytimePerHourGraph,
} from "~src/components/user/stats";

export const RenderWrappedActivityGraphs = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
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
        <div>
            <p className="pt-5">
                <span className="display-4">
                    Here's your heatmap for this year.
                </span>
            </p>
            <p className="mt-3">
                <span className="display-6">
                    Also, we added some cool graphs
                </span>
            </p>
            <p className="mt-1 opacity-25">
                <span className="fs-small">You like that, don't you?</span>
            </p>
            <div className="flex-center min-vh-100 overflow-x-hidden">
                <div>
                    <div className="d-flex align-items-center display-4">
                        <div
                            className="playtime-graph"
                            style={{ marginTop: "1rem", marginBottom: "2rem" }}
                        >
                            <CalendarHeatmap data={data} setter={() => {}} />
                        </div>
                    </div>
                    <div className="d-flex align-items-center display-4">
                        <Row className="w-100">
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
                                        wrapped.playtimeData.playtimePerHourMap
                                    }
                                />
                            </Col>
                        </Row>
                    </div>
                </div>
            </div>
        </div>
    );
};
