import { GameStats, GlobalStats } from "~app/races/races.types";
import { Col, Row } from "react-bootstrap";
import React, { ReactElement } from "react";
import { DurationToFormatted } from "~src/components/util/datetime";
import { GameImage } from "~src/components/image/gameimage";

export const GlobalRaceStats = ({
    stats,
    gameStats,
}: {
    stats: GlobalStats;
    gameStats: GameStats[];
}) => {
    return (
        <div
            className={"bg-body-secondary mb-3 game-border px-4 py-3 rounded-3"}
        >
            <span className={"h3"}>Race Stats</span>
            <hr />
            <div>
                <ShowStat stat={"Finished Races"} value={stats.totalRaces} />
                <ShowStat
                    stat={"Total Playtime"}
                    value={
                        <DurationToFormatted duration={stats.totalRaceTime} />
                    }
                />
                <ShowStat
                    stat={"Total Participants"}
                    value={stats.totalParticipations}
                />
                <ShowStat
                    stat={"Finish %"}
                    value={`${(stats.finishPercentage * 100).toFixed(2)}%`}
                />
            </div>
            <hr />
            <Row className={"gap-3"}>
                {gameStats.map((gameStat) => {
                    return (
                        <ShowGameStat
                            key={gameStat.value}
                            gameStat={gameStat}
                        />
                    );
                })}
            </Row>
        </div>
    );
};

const ShowStat = ({
    stat,
    value,
}: {
    stat: string;
    value: number | string | ReactElement;
}) => {
    return (
        <Row>
            <Col
                xl={6}
                lg={6}
                md={7}
                sm={7}
                xs={6}
                className={
                    "d-flex align-items-end align-content-end align-self-end"
                }
            >
                <div className={"align-self-end"}>{stat}</div>
            </Col>
            <Col xl={6} lg={6} md={5} sm={5} xs={6}>
                <span className={"fw-bold"}>{value}</span>
            </Col>
        </Row>
    );
};

const ShowGameStat = ({ gameStat }: { gameStat: GameStats }) => {
    return (
        <div key={gameStat.value} className={"d-flex w-100"}>
            <GameImage
                alt={`Image for ${gameStat.image}`}
                src={gameStat.image}
                quality={"large"}
                height={64 * 1.3}
                width={48 * 1.3}
                className={"rounded-2"}
            />
            <div
                className={
                    "px-3 flex-grow-1 d-flex flex-column justify-content-center"
                }
            >
                <div
                    className={"h5 mb-1 p-0"}
                    style={{
                        color: "var(--bs-link-color)",
                    }}
                >
                    {gameStat.displayValue}
                </div>
                <div className={"d-flex justify-content-between"}>
                    {gameStat.totalRaces} races
                    <DurationToFormatted duration={gameStat.totalRaceTime} />
                </div>
            </div>
        </div>
    );
};
