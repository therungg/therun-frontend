import {
    Race,
    RaceMessage,
    RaceMessageParticipantSplitData,
} from "~app/races/races.types";
import { ResponsiveBump } from "@nivo/bump";

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

        const values = [
            {
                percentage: 100,
                time: 0,
                splitName: "",
            },
        ];

        participantsMap.set(participant.user, values);
    });

    let times = [0];

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

            const percentage = message.data.percentage
                ? Number((message.data.percentage * 100).toFixed(0))
                : 0;

            const time = Number((Number(message.data.time) / 1000).toFixed(0));

            times.push(time);

            if (message.type === "participant-split") {
                current?.push({
                    percentage: 100 - percentage,
                    time,
                    splitName: message.data.splitName,
                });
            } else if (message.type === "participant-finish") {
                current?.push({
                    percentage: 0,
                    time,
                    splitName: "Finish",
                });
            }
            participantsMap.set(message.data.user, current);
        });

    times = times.sort((a, b) => {
        return a - b;
    });

    const firstNivoData = {
        id: "dummy",
        data: times.map((time) => {
            return {
                x: time,
                y: null,
            };
        }),
    };

    const nivoData = [
        firstNivoData,
        ...Array.from(participantsMap.entries())
            .reverse()
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
            <MyResponsiveBump data={nivoData} />
        </div>
    );
};
const MyResponsiveBump = ({ data /* see data tab */ }) => {
    return (
        <ResponsiveBump
            data={data}
            colors={{ scheme: "set1" }}
            lineWidth={2}
            activeLineWidth={5}
            inactiveLineWidth={3}
            inactiveOpacity={0.15}
            pointSize={5}
            activePointSize={16}
            inactivePointSize={5}
            pointColor={{ theme: "background" }}
            pointBorderWidth={3}
            interpolation={"smooth"}
            activePointBorderWidth={1}
            pointBorderColor={{ from: "serie.color" }}
            enableGridX={false}
            enableGridY={false}
            endLabel={false}
            axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Time",
                legendPosition: "middle",
                legendOffset: 32,
                truncateTickAt: 0,
            }}
            axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "Progress",
                legendPosition: "middle",
                legendOffset: -40,
                truncateTickAt: 0,
            }}
            margin={{ top: 40, right: 100, bottom: 40, left: 60 }}
            axisRight={null}
        />
    );
};
