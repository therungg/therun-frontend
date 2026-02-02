import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import moment from 'moment';
import { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import {
    VictoryAxis,
    VictoryChart,
    VictoryLine,
    VictoryScatter,
    VictoryTheme,
    VictoryTooltip,
} from 'victory';
import { UnderlineTooltip } from '../tooltip';
import { getFormattedString } from '../util/datetime';

// TODO: Centralize charts
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    BarController,
    BarElement,
    CategoryScale,
    Legend,
);

export interface WrHistoryInterface {
    time: string;
    user: string;
    endedAt: string;
    improved: number;
    stoodFor: number;
}

export const WrHistory = ({
    historyData,
    maxEnd,
}: {
    historyData: WrHistoryInterface[];
    maxEnd?: Date;
}) => {
    const maxLength = historyData.worldRecords.length;

    const [lastN, setLastN] = useState(maxLength);

    historyData = historyData.worldRecords.slice(-lastN);
    if (!maxEnd) maxEnd = new Date();

    const availableShapes = [
        'circle',
        'diamond',
        'square',
        'star',
        'triangleUp',
        'triangleDown',
        'plus',
        'circle',
        'diamond',
        'square',
        'star',
        'triangleUp',
        'triangleDown',
        'plus',
        'circle',
        'diamond',
        'square',
        'star',
        'triangleUp',
        'triangleDown',
        'plus',
    ];

    const availableColors = [
        '#006ddb',
        '#ffff6d',
        '#24ff24',
        '#FF2C2CFF',
        '#ff6db6',
        '#009292',
        '#ffb6db',
        '#490092',
        '#b66dff',
        '#6db6ff',
        '#b6dbff',
        '#924900',
        '#db6d00',
        '#000000',
        '#006ddb',
        '#ffff6d',
        '#24ff24',
        '#FF2C2CFF',
        '#ff6db6',
        '#009292',
        '#ffb6db',
        '#490092',
        '#b66dff',
        '#6db6ff',
        '#b6dbff',
        '#924900',
        '#db6d00',
        '#000000',
    ];

    const players = [];

    historyData.forEach((history) => {
        if (!players.find((p) => p.username == history.user)) {
            const index = players.length;
            const shape = availableShapes[index];
            const color = availableColors[index];
            players.push({
                username: history.user,
                shape,
                color,
            });
        }
    });

    const victoryData = historyData.map((history, n) => {
        const data = historyData[n];

        const user = players.find((p) => p.username == data.user);

        return {
            x: new Date(history.endedAt),
            y: parseInt(history.time),
            symbol: user.shape,
        };
    });

    return (
        <div>
            <Row>
                <Col xl={9}>
                    {historyData.length < maxLength &&
                        `Showing last ${historyData.length} from ${maxLength} records`}
                    <VictoryChart
                        padding={{ top: 10, left: 55, right: 0, bottom: 50 }}
                        domainPadding={{ x: [10, 10], y: [10, 10] }}
                    >
                        <VictoryAxis
                            domainPadding={{ x: [0, 0], y: [0, 0] }}
                            style={{
                                tickLabels: {
                                    fontSize: 10,
                                    // TODO: BYE BYE
                                    // eslint-disable-next-line sonarjs/no-duplicate-string
                                    color: 'var(--bs-body-color)',
                                    fill: 'var(--bs-body-color)',
                                },
                                axis: {
                                    stroke: 'var(--bs-body-color)',
                                },
                            }}
                            data={victoryData}
                            dependentAxis
                            tickFormat={(a, b, c) => {
                                if (b == 0 && historyData.length > 1)
                                    a =
                                        historyData[historyData.length - 1]
                                            .time;
                                if (b == c.length - 1 && historyData.length > 0)
                                    a = historyData[0].time;
                                return getFormattedString(a);
                            }}
                        />
                        <VictoryAxis
                            style={{
                                tickLabels: {
                                    fontSize: 10,
                                    color: 'var(--bs-body-color)',
                                    fill: 'var(--bs-body-color)',
                                    angle: 75,
                                    padding: 26,
                                },
                                axis: {
                                    color: 'var(--bs-body-color)',
                                    borderColor: 'var(--bs-body-color)',
                                    fill: 'var(--bs-body-color)',
                                    stroke: 'var(--bs-body-color)',
                                },
                            }}
                            data={victoryData}
                        />

                        {victoryData.map((data, n, object) => {
                            const victoryDataPoint = [data];

                            if (object[n + 1]) {
                                victoryDataPoint.push(object[n + 1]);
                            } else {
                                victoryDataPoint.push({
                                    x: maxEnd,
                                    y: data.y,
                                    symbol: '',
                                });
                            }
                            const currentHistoryData = historyData[n];

                            const user = players.find(
                                (p) => p.username == currentHistoryData.user,
                            );

                            return (
                                <VictoryLine
                                    key={n}
                                    interpolation="stepAfter"
                                    theme={VictoryTheme.material}
                                    data={victoryDataPoint}
                                    style={{
                                        parent: { border: '1px solid' },
                                        data: {
                                            stroke: user.color,
                                            strokeWidth: 1,
                                        },
                                    }}
                                />
                            );
                        })}

                        <VictoryScatter
                            labels={({ index }) => {
                                const wr = historyData[index];
                                return `${wr.user}\n${getFormattedString(
                                    wr.time,
                                )}\n${moment(wr.endedAt).format('L LT')}`;
                            }}
                            labelComponent={
                                <VictoryTooltip
                                    style={{ fontStyle: 10 }}
                                    flyoutPadding={10}
                                />
                            }
                            data={victoryData}
                            size={3.5}
                            style={{
                                data: {
                                    fill: (n) => {
                                        const data = historyData[n.index];

                                        const user = players.find(
                                            (p) => p.username == data.user,
                                        );

                                        return user.color;
                                    },
                                },
                            }}
                        />
                    </VictoryChart>
                </Col>
                <Col xl={3}>
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                        }}
                    >
                        <UnderlineTooltip
                            title="Only show last x Records"
                            content="Allows you to only show the last couple of records. The graph can get unreadable with a large timeframe, so decreasing this number should help."
                            element="Only show last x Records:"
                        />
                        <input
                            type="number"
                            className="form-control w-8r ms-2 bg-body-secondary"
                            onChange={(e) => {
                                let val =
                                    e.target.value > maxLength
                                        ? maxLength
                                        : e.target.value.replace(/\D/g, '');
                                if (val < 1) val = maxLength;
                                setLastN(val);
                            }}
                            value={lastN}
                        />
                    </div>
                    {players.map((player) => {
                        const { username, color, shape } = player;

                        return (
                            <div
                                key={username}
                                style={{
                                    color,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    height: '3rem',
                                }}
                            >
                                <div style={{ fontSize: 'x-large' }}>
                                    {username}
                                </div>
                                <div style={{ height: '3rem', width: '3rem' }}>
                                    <VictoryScatter
                                        padding={0}
                                        width={80}
                                        height={80}
                                        data={[
                                            {
                                                x: 80,
                                                y: 1,
                                                symbol: shape,
                                            },
                                        ]}
                                        size={20}
                                        style={{
                                            data: {
                                                fill: color,
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </Col>
            </Row>
        </div>
    );
};

export default WrHistory;
