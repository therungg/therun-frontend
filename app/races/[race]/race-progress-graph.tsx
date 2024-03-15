import {
    Race,
    RaceMessage,
    RaceMessageParticipantSplitData,
} from "~app/races/races.types";
import { ResponsiveLine, Serie } from "@nivo/line";
import { getFormattedString } from "~src/components/util/datetime";
import { schemeDark2 } from "d3-scale-chromatic";

interface ProgressGraphDataPoint {
    percentage: number;
    time: number;
    splitName: string;
}

export const RaceProgressGraph = ({
    race,
    messages,
}: {
    race: Race;
    messages: RaceMessage[];
}) => {
    if (race.status !== "progress" && race.status !== "finished") return;

    const participantsMap = new Map<string, ProgressGraphDataPoint[]>();

    race.participants?.forEach((participant) => {
        if (!participant.liveData) return;

        participantsMap.set(participant.user, []);
    });

    let maxGraphTimeSeconds = 60 * 60;

    if (race.status === "finished") {
        const finishedParticipants = race.participants?.filter(
            (participant) => participant.finalTime,
        );

        if (finishedParticipants && finishedParticipants.length > 0) {
            maxGraphTimeSeconds =
                (finishedParticipants[finishedParticipants.length - 1]
                    .finalTime as number) / 1000;
        }
    } else {
        const pbs = race.participants
            ?.filter((participant) => !!participant.pb)
            .map((participant) => parseInt(participant.pb) / 1000);

        if (pbs && pbs.length > 0) {
            const highestPb = Math.max(...pbs) * 1.2;
            const minutes = highestPb / 60;
            const nextTenMinutes = Math.ceil(minutes / 10) * 10;
            maxGraphTimeSeconds = nextTenMinutes * 60;
        } else if (race.status === "progress") {
            maxGraphTimeSeconds =
                (new Date().getTime() -
                    new Date(race.startTime as string).getTime()) /
                1000;
        }
    }

    maxGraphTimeSeconds = Math.ceil(maxGraphTimeSeconds);
    const desiredTicks = 10;

    const rawInterval = maxGraphTimeSeconds / desiredTicks;

    // Step 4: Adjust to the nearest 1 or 5 minutes
    let adjustedInterval;
    if (rawInterval <= 60) {
        adjustedInterval = 60; // 1 minute apart if the raw interval is less than or equal to 1
    } else {
        adjustedInterval = Math.ceil(rawInterval / (5 * 60)) * 5 * 60; // Round up to the nearest 5 minutes
    }

    // Step 5: Generate the tick values
    const ticks: number[] = [];
    for (
        let currentTick = 0;
        currentTick <= maxGraphTimeSeconds;
        currentTick += adjustedInterval
    ) {
        ticks.push(currentTick);
    }

    // These must be shown on the graph
    let times = [...ticks.slice(0, ticks.length - 1), maxGraphTimeSeconds];

    const graphTicks = [...times];

    // Todo:: these messages include when someone undoes a split, or finishes on accident. Also, if a race resets, the messages still include it. We should filter them out.
    messages
        .filter(
            (message) =>
                message.type === "participant-split" ||
                message.type === "participant-finish",
        )
        .reverse()
        // @ts-ignore
        .forEach((message: RaceMessage<RaceMessageParticipantSplitData>) => {
            if (
                !message.data ||
                message.data.time === 0 ||
                message.data?.percentage === 0
            )
                return;
            const current = participantsMap.get(message.data.user);
            if (!current) return;

            let percentage = message.data.percentage
                ? Number((message.data.percentage * 100).toFixed(2))
                : 0;

            if (percentage < 0) percentage = 0;
            if (percentage > 100) percentage = 100;

            let time = Number((Number(message.data.time) / 1000).toFixed(0));

            if (time < 0) time = 0;

            times.push(time);

            if (message.type === "participant-split") {
                current?.push({
                    percentage,
                    time,
                    splitName: message.data.splitName,
                });
            } else if (message.type === "participant-finish") {
                current?.push({
                    percentage: 100,
                    time,
                    splitName: "Finish",
                });
            } else if (message.type === "participant-confirm") {
                current?.push({
                    percentage: 100,
                    time,
                    splitName: "Finish",
                });
            }
            participantsMap.set(message.data.user, current);
        });

    // Add this to make the graph move forward in real time, does not work great yet, but looks cool
    // race.participants?.forEach((participant) => {
    //     if (!participant.liveData) return;
    //
    //     const values = participantsMap.get(participant.user);
    //
    //     if (!values) return;
    //
    //     if (participant.status === "started") {
    //         values.push({
    //             percentage:
    //                 (participant.liveData.runPercentageTime ||
    //                     participant.liveData.runPercentageSplits) * 100,
    //             time:
    //                 participant.liveData.currentTime / 1000 +
    //                 (new Date().getTime() -
    //                     participant.liveData.splitStartedAt) /
    //                     1000,
    //             splitName: participant.liveData.currentSplitName,
    //         });
    //     }
    //
    //     participantsMap.set(participant.user, values);
    // });

    times = times.sort((a, b) => {
        return a - b;
    });

    const firstNivoData = {
        id: null,
        data: [
            ...times.map((time) => {
                return {
                    x: time,
                    y: null,
                };
            }),
            ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(
                (percentage) => {
                    return {
                        x: null,
                        y: percentage,
                    };
                },
            ),
        ],
    };

    const nivoData = [
        firstNivoData,
        ...Array.from(participantsMap.entries())
            .reverse()
            .slice(0, 8)
            .map(([username, data]) => {
                return {
                    id: username,
                    data: [
                        ...data.map((dataPoint) => {
                            return {
                                x:
                                    dataPoint.time === null
                                        ? null
                                        : dataPoint.time,
                                y: Number(dataPoint.percentage.toFixed(0)),
                                splitName: dataPoint.splitName,
                            };
                        }),
                        {
                            x: times[times.length - 1],
                            y: null,
                        },
                    ],
                };
            }),
    ];

    return (
        <div style={{ height: "500px" }}>
            <MyResponsiveBump data={nivoData as Serie[]} ticks={graphTicks} />
        </div>
    );
};
const MyResponsiveBump = ({
    data,
    ticks,
}: {
    data: Serie[];
    ticks: number[];
}) => {
    const legendColors = schemeDark2;
    return (
        <ResponsiveLine
            theme={{
                text: {
                    fontSize: 16,
                    fill: "var(--bs-body-color)",
                    color: "var(--bs-body-color)",
                },
                axis: {
                    ticks: {
                        line: {
                            stroke: "var(--bs-body-color)",
                            strokeWidth: 0,
                        },
                    },
                },
                grid: {
                    line: {
                        stroke: "var(--bs-secondary-color)",
                        opacity: 0.2,
                    },
                },
            }}
            data={data}
            colors={{ scheme: "dark2" }}
            lineWidth={0.8}
            pointSize={7}
            pointColor={{ from: "color", modifiers: [] }}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serie.color" }}
            pointLabelYOffset={-12}
            enableTouchCrosshair={true}
            useMesh={true}
            enableGridX={false}
            enableGridY={true}
            curve={"natural"}
            enablePoints={true}
            xScale={{ type: "linear" }}
            yScale={{ type: "linear" }}
            axisTop={null}
            axisRight={null}
            enableCrosshair={true}
            enableArea={false}
            enablePointLabel={false}
            tooltip={({ point }) => {
                const user = point.serieId as string;
                const percentage = point.data.y as string;
                const time = getFormattedString(
                    ((point.data.x as number) * 1000).toString(),
                );

                // @ts-ignore
                const splitName = point.data.splitName as string;

                return (
                    <div
                        className={"game-border p-3 bg-body-secondary rounded"}
                    >
                        {user} - {percentage}% - {time} - {splitName}
                    </div>
                );
            }}
            axisBottom={{
                tickSize: 5,
                tickPadding: 10,
                tickRotation: 23,
                legend: null,
                legendPosition: "middle",
                tickValues: ticks,
                format: (a) => {
                    return getFormattedString((a * 1000).toString());
                },
            }}
            axisLeft={{
                tickSize: 4,
                tickPadding: 10,
                tickRotation: 0,
                legend: null,
                legendPosition: "middle",
                legendOffset: -100,
                truncateTickAt: 0,
                tickValues: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
                format: (a) => {
                    return `${a}%`;
                },
            }}
            legends={[
                {
                    toggleSerie: true,
                    anchor: "top-left",
                    direction: "column",
                    justify: false,
                    translateX: 20,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemDirection: "left-to-right",
                    itemWidth: 80,
                    itemHeight: 20,
                    itemOpacity: 1,
                    symbolSize: 12,
                    symbolShape: "circle",
                    symbolBorderColor: "rgba(0, 0, 0, .5)",
                    data: data
                        .map((dataPoint, i) => {
                            return {
                                label: dataPoint.id,
                                color: legendColors[i],
                                id: dataPoint.id,
                            };
                        })
                        .filter((dataPoint) => !!dataPoint.id)
                        .reverse(),
                    effects: [
                        {
                            on: "hover",
                            style: {
                                itemBackground: "rgba(0, 0, 0, .03)",
                                itemOpacity: 1,
                            },
                        },
                    ],
                },
            ]}
            margin={{ top: 40, right: 100, bottom: 40, left: 60 }}
        />
    );
};
