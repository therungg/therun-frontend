import useSWR from "swr";
import { fetcher } from "../../utils/fetcher";
import React, { useEffect, useState } from "react";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryTooltip } from "victory";
import { getFormattedString } from "../util/datetime";
import { Col, Row } from "react-bootstrap";
import CalendarHeatmap from "../../../public/js/calendar-heatmap.component";
import { scaleLinear } from "d3";

export interface PlaytimeStats {
    total: number;
    playtimePerDayMap: StatMap;
    playtimePerDayOfWeekMap: StatMap;
    playtimePerHourMap: StatMap;
    playtimePerMonthMap: StatMap;
    playtimePerYearMap: StatMap;
}

interface StatMap {
    [key: string]: TotalStat;
}

export interface TotalStat {
    total: number;
    perGame: PerGameStat;
}

interface PerGameStat {
    [game: string]: GameStat;
}

interface GameStat {
    total: number;
    perCategory: PerCategoryStat;
}

interface PerCategoryStat {
    [category: string]: CategoryStat;
}

interface CategoryStat {
    total: number;
}

// TODO: Localize numbers and dates
export const Stats = ({ username }: { username: string }) => {
    const { data, error } = useSWR(`/api/users/${username}/advanced`, fetcher);

    if (error) return <div>Whoops, something went wrong...</div>;

    if (!data) {
        return <div>Loading data...</div>;
    }

    const playtimeStats: PlaytimeStats = data;

    return (
        <div>
            <Row>
                <Col>
                    <h2>Activity Stats</h2>
                </Col>
            </Row>
            <div
                className="playtime-graph"
                style={{ marginTop: "1rem", marginBottom: "2rem" }}
            >
                <PlayTimeTable
                    playtimePerDay={playtimeStats.playtimePerDayMap}
                    playtimePerYear={playtimeStats.playtimePerYearMap}
                    total={playtimeStats.total}
                />
            </div>
            <Row>
                <Col xl={6} lg={12}>
                    <PlayTimePerDayOfWeekGraph
                        playtimePerDayOfWeekMap={
                            playtimeStats.playtimePerDayOfWeekMap
                        }
                    />
                </Col>
                <Col xl={6} lg={12}>
                    <PlaytimePerHourGraph
                        playtimePerHourMap={playtimeStats.playtimePerHourMap}
                    />
                </Col>
            </Row>
        </div>
    );
};

export const PlayTimeTable = ({
    playtimePerDay,
    total,
    playtimePerYear,
}: {
    playtimePerDay: StatMap;
    playtimePerYear: StatMap;
    total: number;
}) => {
    const data = Object.entries(playtimePerDay).map(([date, stat]) => {
        return {
            date,
            total: stat.total / 1000,
            details: Object.entries(stat.perGame).map(([game, gameStat]) => {
                return {
                    name: game,
                    date,
                    value: gameStat.total / 1000,
                };
            }),
        };
    });

    const [loaded, setLoaded] = useState(false);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setLoaded(true);
    }, []);

    return (
        <div>
            <div style={{ display: "flex", marginBottom: "1rem" }}>
                {!!currentYear && (
                    <div>
                        Selected year:{" "}
                        <span style={{ fontSize: "larger" }}>
                            {currentYear}
                        </span>
                    </div>
                )}
                <div style={{ marginLeft: currentYear ? "2rem" : "" }}>
                    Total playtime:{" "}
                    <span style={{ fontSize: "larger" }}>
                        {getFormattedString(total.toString())}
                    </span>
                </div>
                {!!currentYear &&
                    playtimePerYear[currentYear] &&
                    playtimePerYear[currentYear].total && (
                        <div style={{ marginLeft: "2rem" }}>
                            Playtime in {currentYear}:{" "}
                            <span style={{ fontSize: "larger" }}>
                                {getFormattedString(
                                    playtimePerYear[
                                        currentYear
                                    ].total.toString(),
                                )}
                            </span>
                        </div>
                    )}
            </div>
            {loaded && (
                <CalendarHeatmap
                    data={data}
                    setter={setCurrentYear}
                    getter={currentYear}
                />
            )}
        </div>
    );
};

export const PlaytimePerMonthGraph = ({
    playtimePerMonthMap,
    year,
}: {
    playtimePerMonthMap: StatMap;
    year: number;
}) => {
    let max = 0;

    const currentYear = year;
    for (let month = 1; month <= 12; month++) {
        const monthKey = `${currentYear}-${String(month).padStart(2, "0")}`;
        if (
            !Object.prototype.hasOwnProperty.call(playtimePerMonthMap, monthKey)
        ) {
            playtimePerMonthMap[monthKey] = { total: 0, perGame: {} };
        }
    }

    const victoryData = Object.entries(playtimePerMonthMap)
        .map(([day, stat]) => {
            if (stat.total > max) max = stat.total;
            return {
                x: day.split("-")[1],
                y: stat.total,
                fill: "green",
            };
        })
        .sort((a, b) => {
            if (a.x > b.x) return 1;
            return -1;
        });

    const color = scaleLinear()
        .range(["#ffffff", "#27A11B"])
        .domain([-0.15 * max, max]);

    return (
        <div>
            <h3>Playtime per month</h3>
            <VictoryChart
                padding={{ top: 10, left: 0, right: 0, bottom: 70 }}
                domainPadding={{ x: [30, 30], y: [10, 10] }}
            >
                <VictoryAxis
                    style={{
                        tickLabels: {
                            fontSize: 11,
                            // TODO: Get rid of this
                            // eslint-disable-next-line sonarjs/no-duplicate-string
                            color: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            angle: 0,
                            padding: 10,
                        },
                        axis: {
                            color: "var(--bs-body-color)",
                            borderColor: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            stroke: "var(--bs-body-color)",
                        },
                    }}
                    data={victoryData}
                    tickFormat={(a) => {
                        switch (a) {
                            case "01":
                                return "Jan";
                            case "02":
                                return "Feb";
                            case "03":
                                return "Mar";
                            case "04":
                                return "Apr";
                            case "05":
                                return "May";
                            case "06":
                                return "June";
                            case "07":
                                return "July";
                            case "08":
                                return "Aug";
                            case "09":
                                return "Sep";
                            case "10":
                                return "Oct";
                            case "11":
                                return "Nov";
                            case "12":
                                return "Dec";
                            default:
                                return "Monday";
                        }
                    }}
                />
                <VictoryBar
                    style={{
                        data: {
                            fill: (d) => {
                                return color(
                                    d.data &&
                                        d.index !== null &&
                                        d.index !== undefined
                                        ? d.data[d.index as number]._y
                                        : "var(--bs-link-color)",
                                );
                            },
                        },
                    }}
                    data={victoryData}
                    labels={({ index }) => {
                        const key =
                            year + "-" + String(index + 1).padStart(2, "0");

                        const target: TotalStat = playtimePerMonthMap[key];

                        return tooltip(target);
                    }}
                    labelComponent={
                        <VictoryTooltip
                            style={{ fontStyle: 10 }}
                            flyoutPadding={10}
                        />
                    }
                />
            </VictoryChart>
        </div>
    );
};

export const PlayTimePerDayOfWeekGraph = ({
    playtimePerDayOfWeekMap,
}: {
    playtimePerDayOfWeekMap: StatMap;
}) => {
    let max = 0;

    const victoryData = Object.entries(playtimePerDayOfWeekMap).map(
        ([day, stat]) => {
            if (stat.total > max) max = stat.total;
            return {
                x: day,
                y: stat.total,
                fill: "green",
            };
        },
    );

    const color = scaleLinear()
        .range(["#ffffff", "#27A11B"])
        .domain([-0.15 * max, max]);

    return (
        <div>
            <h3>Playtime per day of week</h3>
            <VictoryChart
                padding={{ top: 10, left: 0, right: 0, bottom: 70 }}
                domainPadding={{ x: [30, 30], y: [10, 10] }}
            >
                <VictoryAxis
                    style={{
                        tickLabels: {
                            fontSize: 11,
                            // TODO: Get rid of this

                            color: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            angle: 0,
                            padding: 10,
                        },
                        axis: {
                            color: "var(--bs-body-color)",
                            borderColor: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            stroke: "var(--bs-body-color)",
                        },
                    }}
                    data={victoryData}
                    tickFormat={(a) => {
                        switch (a) {
                            case "0":
                                return "Monday";
                            case "1":
                                return "Tuesday";
                            case "2":
                                return "Wednesday";
                            case "3":
                                return "Thursday";
                            case "4":
                                return "Friday";
                            case "5":
                                return "Saturday";
                            case "6":
                                return "Sunday";
                            default:
                                return "Monday";
                        }
                    }}
                />
                <VictoryBar
                    style={{
                        data: {
                            fill: (d) => {
                                return color(
                                    d.data &&
                                        d.index !== null &&
                                        d.index !== undefined
                                        ? d.data[d.index as number]._y
                                        : "var(--bs-link-color)",
                                );
                            },
                        },
                    }}
                    data={victoryData}
                    labels={({ index }) => {
                        const target: TotalStat =
                            playtimePerDayOfWeekMap[index];

                        return tooltip(target);
                    }}
                    labelComponent={
                        <VictoryTooltip
                            style={{ fontStyle: 10 }}
                            flyoutPadding={10}
                        />
                    }
                />
            </VictoryChart>
        </div>
    );
};

export const PlaytimePerHourGraph = ({
    playtimePerHourMap,
}: {
    playtimePerHourMap: StatMap;
}) => {
    let max = 0;

    const victoryData = Object.entries(playtimePerHourMap).map(
        ([hour, stat]) => {
            if (max < stat.total) max = stat.total;

            return {
                x: hour,
                y: stat.total,
                fill: "green",
            };
        },
    );

    const color = scaleLinear()
        .range(["#ffffff", "#27A11B"])
        .domain([-0.15 * max, max]);

    return (
        <div>
            <h3>Playtime per hour of day</h3>
            <VictoryChart
                padding={{ top: 10, left: 0, right: 0, bottom: 70 }}
                domainPadding={{ x: [30, 30], y: [10, 10] }}
            >
                <VictoryAxis
                    style={{
                        tickLabels: {
                            fontSize: 11,
                            color: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            angle: 0,
                            padding: 10,
                        },
                        axis: {
                            color: "var(--bs-body-color)",
                            borderColor: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            stroke: "var(--bs-body-color)",
                        },
                    }}
                    data={victoryData}
                    tickFormat={(a) => {
                        if (parseInt(a) == 0 || parseInt(a) == 12)
                            a = parseInt(a) + 12;
                        return a < 12
                            ? `${parseInt(a)}`
                            : `${a == 12 ? 12 : a - 12}`;
                    }}
                />

                <VictoryAxis
                    style={{
                        tickLabels: {
                            fontSize: 11,
                            color: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            angle: 0,
                            padding: 25,
                        },
                        axis: {
                            color: "var(--bs-body-color)",
                            borderColor: "var(--bs-body-color)",
                            fill: "var(--bs-body-color)",
                            stroke: "var(--bs-body-color)",
                        },
                    }}
                    data={victoryData}
                    tickFormat={(a) => {
                        if (parseInt(a) == 1) return "AM";
                        if (parseInt(a) == 13) return "PM";
                    }}
                />
                <VictoryBar
                    style={{
                        data: {
                            fill: (d) => {
                                if (
                                    d.data &&
                                    d.index !== null &&
                                    d.index !== undefined
                                ) {
                                    return color(d.data[d.index as number]._y);
                                } else {
                                    return 0;
                                }
                            },
                        },
                    }}
                    data={victoryData}
                    labels={(data) => {
                        const { index } = data;
                        const value = data.data[index]._y;

                        return getFormattedString(value);
                    }}
                    labelComponent={
                        <VictoryTooltip
                            style={{ fontStyle: 10 }}
                            flyoutPadding={10}
                        />
                    }
                />
            </VictoryChart>
        </div>
    );
};

const tooltip = (data: TotalStat): string => {
    if (!data) return "No time";
    return getFormattedString(data.total.toString());
};

export default Stats;
