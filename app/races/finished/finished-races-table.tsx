import { PaginatedRaces, Race } from "~app/races/races.types";
import { PaginationContextProvider } from "~src/components/pagination/pagination.context-provider";
import usePagination from "~src/components/pagination/use-pagination";
import { getPaginatedFinishedRaces } from "~src/lib/races";
import React from "react";
import PaginationControl from "~src/components/pagination/pagination-control";
import { Card, Col, Row, Table } from "react-bootstrap";
import { PersonIcon } from "~src/icons/person-icon";
import { UserLink } from "~src/components/links/links";
import { RaceFirstPlace } from "~app/races/components/race-first-place";
import { FromNow } from "~src/components/util/datetime";
import { GameImage } from "~src/components/image/gameimage";
import { useRouter } from "next/navigation";
import styles from "~src/components/css/LiveRun.module.scss";
import { PaginationFetcher } from "~src/components/pagination/pagination.types";

export const FinishedRaceTable = ({
    paginatedRaces,
    paginationFunction = getPaginatedFinishedRaces,
    params,
}: {
    paginatedRaces: PaginatedRaces;
    paginationFunction?: PaginationFetcher<Race>;
    params?: any;
}) => {
    return (
        <PaginationContextProvider>
            <FinishedRaceTableView
                paginatedRaces={paginatedRaces}
                paginationFunction={paginationFunction}
                params={params}
            />
        </PaginationContextProvider>
    );
};

const FinishedRaceTableView = ({
    paginatedRaces,
    paginationFunction = getPaginatedFinishedRaces,
    params,
}: {
    paginatedRaces: PaginatedRaces;
    paginationFunction: PaginationFetcher<Race>;
    params?: any;
}) => {
    const pagination = usePagination<Race>(
        paginatedRaces,
        paginationFunction,
        paginatedRaces.pageSize,
        0,
        params,
    );
    const { isLoading, data } = pagination;
    // Make this a skeleton
    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <FinishedRaces races={data} />
            <PaginationControl {...pagination} />
        </div>
    );
};

const FinishedRaces = ({ races }: { races: Race[] }) => {
    return (
        <>
            <div className={"d-none d-md-block"}>
                <FinishedRacesLarge races={races} />
            </div>
            <div className={"d-md-none"}>
                <FinishedRacesSmall races={races} />
            </div>
        </>
    );
};

const FinishedRacesLarge = ({ races }: { races: Race[] }) => {
    const { push } = useRouter();

    const imageWidth = 60;

    return (
        <Table bordered striped hover responsive>
            <thead>
                <tr>
                    <th colSpan={2}>Game/Category</th>
                    <th className={"d-none d-md-table-cell"}>Participants</th>
                    <th className={"d-none d-md-table-cell"}>Winner</th>
                    <th className={"d-none d-xl-table-cell"}>Started</th>
                    <th className={"d-none d-xl-table-cell"}>Created By</th>
                </tr>
            </thead>
            <tbody>
                {races.map((race) => {
                    return (
                        <tr
                            key={race.raceId}
                            className={"cursor-pointer"}
                            onClick={() => {
                                push(`/races/${race.raceId}`);
                            }}
                        >
                            <td
                                className={"p-0"}
                                style={{ width: `${imageWidth}px` }}
                            >
                                <GameImage
                                    quality={"hd"}
                                    src={race.gameImage}
                                    width={imageWidth}
                                    height={100}
                                />
                            </td>
                            <td className={"py-2 px-3"}>
                                <div
                                    className={"h5 m-0 p-0"}
                                    style={{
                                        color: "var(--bs-link-color)",
                                    }}
                                >
                                    {race.displayGame}
                                </div>
                                {race.displayCategory}
                            </td>
                            <td className={"d-none d-md-table-cell"}>
                                <span className={"text-nowrap"}>
                                    <span className={"me-1"}>
                                        {race.participantCount}
                                    </span>
                                    <PersonIcon />
                                </span>
                            </td>
                            <td className={"d-none d-md-table-cell"}>
                                <RaceFirstPlace race={race} />
                            </td>
                            <td className={"d-none d-xl-table-cell"}>
                                <FromNow time={race.startTime as string} />
                            </td>
                            <td className={"d-none d-xl-table-cell"}>
                                <UserLink username={race.creator} />
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </Table>
    );
};

const FinishedRacesSmall = ({ races }: { races: Race[] }) => {
    return (
        <div>
            {races.map((race) => {
                return (
                    <a
                        key={race.raceId}
                        href={`/races/${race.raceId}`}
                        className={`text-decoration-none`}
                    >
                        <Card
                            className={`game-border h-100 mb-2 ${styles.liveRunContainer}`}
                        >
                            <Row className={`h-100`}>
                                <Col xs={2}>
                                    <Card.Img
                                        className={
                                            "rounded-0 rounded-start me-0 pe-0 h-100 d-inline-block"
                                        }
                                        src={
                                            race.gameImage &&
                                            race.gameImage !== "noimage"
                                                ? race.gameImage
                                                : `/logo_dark_theme_no_text_transparent.png`
                                        }
                                        height={20}
                                        width={5}
                                    />
                                </Col>
                                <Col
                                    xs={10}
                                    className={
                                        "p-2 ps-1 pe-4 d-flex flex-column"
                                    }
                                >
                                    <div className={`px-3 w-100 h-100 `}>
                                        <div
                                            className={
                                                "d-flex justify-content-between gap-2"
                                            }
                                        >
                                            <div
                                                className={
                                                    "h5 m-0 p-0 text-truncate"
                                                }
                                                style={{
                                                    color: "var(--bs-link-color)",
                                                }}
                                            >
                                                {race.displayGame}
                                            </div>
                                            <span className={"text-nowrap"}>
                                                <span className={"me-1"}>
                                                    {race.participantCount}
                                                </span>
                                                <PersonIcon />
                                            </span>
                                        </div>
                                        <div
                                            className={
                                                "d-flex justify-content-between"
                                            }
                                        >
                                            <div
                                                className={
                                                    "fst-italic text-truncate"
                                                }
                                            >
                                                {race.displayCategory}
                                            </div>
                                            <span>
                                                <FromNow
                                                    time={
                                                        race.endTime as string
                                                    }
                                                />
                                            </span>
                                        </div>
                                        <hr className={"mt-1 mb-2"} />
                                        <RaceFirstPlace race={race} />
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </a>
                );
            })}
        </div>
    );
};
