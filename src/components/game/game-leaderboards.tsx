import { Count, GameLeaderboard } from "~app/games/[game]/game.types";
import { Col, Nav, Row, Tab, Table } from "react-bootstrap";
import { DurationToFormatted, getFormattedString } from "../util/datetime";
import { ReactElement, useState } from "react";
import { UserLink } from "../links/links";
import searchStyles from "../css/Search.module.scss";
import styles from "../css/Games.module.scss";

export const getLeaderboard = (
    name: string,
    leaderboards: Count[],
    search: string,
    transform?: (
        // eslint-disable-next-line no-unused-vars
        stat: string | number,
        // eslint-disable-next-line no-unused-vars
        key: number
    ) => string | number | ReactElement
) => {
    return (
        <Row>
            <Col>
                <Table bordered striped={search.length == 0} hover responsive>
                    <thead>
                        <tr>
                            <th style={{ width: "14%", textAlign: "center" }}>
                                #
                            </th>
                            <th style={{ width: "38%", textAlign: "center" }}>
                                User
                            </th>
                            <th style={{ width: "38%", textAlign: "center" }}>
                                {name}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboards &&
                            leaderboards.map((leaderboard, key) => {
                                const url = leaderboard.url;

                                if (
                                    transform &&
                                    !transform(leaderboard.stat, key)
                                )
                                    return <></>;

                                return (
                                    <tr
                                        key={
                                            leaderboard.username +
                                            leaderboard.stat +
                                            leaderboard.meta
                                        }
                                        className={
                                            leaderboard.username
                                                .toLowerCase()
                                                .includes(search.toLowerCase())
                                                ? ""
                                                : styles.hiddenLeaderboardRow
                                        }
                                    >
                                        <td style={{ textAlign: "center" }}>
                                            {leaderboard.placing}
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            <UserLink
                                                url={url}
                                                username={leaderboard.username}
                                            />
                                        </td>
                                        <td style={{ textAlign: "center" }}>
                                            {transform
                                                ? transform(
                                                      leaderboard.stat,
                                                      key
                                                  )
                                                : leaderboard.stat.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </Table>
            </Col>
        </Row>
    );
};

export const getStatsTable = (values: Map<string, string>) => {
    return (
        <div style={{ marginTop: "1rem", marginBottom: "2rem" }}>
            <Table>
                <tbody>
                    {Array.from(values).map(([key, value]) => {
                        return (
                            <tr key={key}>
                                <td style={{ paddingLeft: 0 }}>{key}</td>
                                <td
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        paddingRight: "0",
                                    }}
                                >
                                    {value}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Table>
        </div>
    );
};

export const getAverageFromLeaderboard = (counts: Count[]) => {
    if (counts.length < 1) return 0;

    const sum = counts
        .map((count) => parseInt(count.stat))
        .reduce((a, b) => a + b, 0);

    return sum / counts.length;
};

export const GameLeaderboards = ({
    leaderboards,
}: {
    leaderboards: GameLeaderboard;
}) => {
    const [search, setSearch] = useState("");

    const completePercentageLeaderboard = getLeaderboard(
        "Completion %",
        leaderboards.completePercentageLeaderboard,
        search,
        (stat) => {
            return `${((stat as number) * 100).toFixed(2)}%`;
        }
    );
    const playtimeLeaderboard = getLeaderboard(
        "Total Playtime",
        leaderboards.totalRunTimeLeaderboard,
        search,
        (stat) => {
            return (
                <DurationToFormatted
                    duration={stat ? stat.toString() : ""}
                    padded={true}
                />
            );
        }
    );

    return (
        <Tab.Container id="game-tabs" defaultActiveKey="game-playtime">
            <Row>
                <Col lg={3} md={4}>
                    <Nav variant="pills" className="flex-column">
                        <Nav.Item>
                            <Nav.Link eventKey="game-playtime" href="#">
                                Total playtime
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="game-attempts" href="#">
                                Total attempts
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                eventKey="game-finished-attempts"
                                href="#"
                            >
                                Finished attempts
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="game-completion" href="#">
                                Completion %
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="game-uploads" href="#">
                                Total Uploads
                            </Nav.Link>
                        </Nav.Item>
                        <Tab.Content>
                            <Tab.Pane eventKey="game-playtime">
                                {getStatsTable(
                                    new Map<string, string>([
                                        [
                                            "Combined",
                                            getFormattedString(
                                                leaderboards.stats.totalRunTime.toString(),
                                                false,
                                                true
                                            ),
                                        ],
                                        [
                                            "Highest",
                                            getFormattedString(
                                                leaderboards.totalRunTimeLeaderboard[0].stat.toString(),
                                                false,
                                                true
                                            ),
                                        ],
                                        [
                                            "Average",
                                            getFormattedString(
                                                getAverageFromLeaderboard(
                                                    leaderboards.totalRunTimeLeaderboard
                                                ).toString(),
                                                false,
                                                true
                                            ),
                                        ],
                                    ])
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="game-attempts">
                                {getStatsTable(
                                    new Map<string, string>([
                                        [
                                            "Combined",
                                            leaderboards.stats.attemptCount.toLocaleString(),
                                        ],
                                        [
                                            "Highest",
                                            leaderboards.attemptCountLeaderboard[0].stat.toLocaleString(),
                                        ],
                                        [
                                            "Average",
                                            parseInt(
                                                getAverageFromLeaderboard(
                                                    leaderboards.attemptCountLeaderboard
                                                ).toFixed(0)
                                            ).toLocaleString(),
                                        ],
                                    ])
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="game-finished-attempts">
                                {getStatsTable(
                                    new Map<string, string>([
                                        [
                                            "Combined",
                                            leaderboards.stats.finishedAttemptCount.toLocaleString(),
                                        ],
                                        [
                                            "Highest",
                                            leaderboards.finishedAttemptCountLeaderboard[0].stat.toLocaleString(),
                                        ],
                                        [
                                            "Average",
                                            parseInt(
                                                getAverageFromLeaderboard(
                                                    leaderboards.finishedAttemptCountLeaderboard
                                                ).toFixed(0)
                                            ).toLocaleString(),
                                        ],
                                    ])
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="game-completion">
                                {getStatsTable(
                                    new Map<string, string>([
                                        [
                                            "Average %",
                                            `${(
                                                (leaderboards.stats
                                                    .finishedAttemptCount /
                                                    leaderboards.stats
                                                        .attemptCount) *
                                                100
                                            ).toFixed(2)}%`,
                                        ],
                                        [
                                            "Total attempts",
                                            leaderboards.stats.attemptCount.toLocaleString(),
                                        ],
                                        [
                                            "Finished attempts",
                                            leaderboards.stats.finishedAttemptCount.toLocaleString(),
                                        ],
                                    ])
                                )}
                            </Tab.Pane>
                            <Tab.Pane eventKey="game-uploads">
                                {getStatsTable(
                                    new Map<string, string>([
                                        [
                                            "Combined",
                                            leaderboards.stats.uploadCount.toLocaleString(),
                                        ],
                                        [
                                            "Highest",
                                            leaderboards.uploadLeaderboard[0].stat.toLocaleString(),
                                        ],
                                        [
                                            "Average",
                                            parseInt(
                                                getAverageFromLeaderboard(
                                                    leaderboards.uploadLeaderboard
                                                ).toFixed(0)
                                            ).toLocaleString(),
                                        ],
                                    ])
                                )}
                            </Tab.Pane>
                        </Tab.Content>
                    </Nav>
                </Col>
                <Col lg={9} md={8}>
                    <div className="d-flex justify-content-center">
                        <div className="mb-3 input-group">
                            <span
                                className="material-symbols-outlined input-group-text"
                                onClick={() => {
                                    const searchElement =
                                        document.getElementById("gameSearch");
                                    if (
                                        document.activeElement !== searchElement
                                    ) {
                                        searchElement.focus();
                                    }
                                }}
                            >
                                {" "}
                                search{" "}
                            </span>
                            <input
                                type="search"
                                className={`form-control ${searchStyles.search}`}
                                placeholder="Filter by name"
                                style={{ marginBottom: "0" }}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                }}
                                value={search}
                                id="gameSearch"
                            />
                        </div>
                    </div>
                    <Tab.Content>
                        <Tab.Pane eventKey="game-playtime">
                            {playtimeLeaderboard}
                        </Tab.Pane>
                        <Tab.Pane eventKey="game-attempts">
                            {getLeaderboard(
                                "Total Attempts",
                                leaderboards.attemptCountLeaderboard,
                                search
                            )}
                        </Tab.Pane>
                        <Tab.Pane eventKey="game-finished-attempts">
                            {getLeaderboard(
                                "Total Finished Runs",
                                leaderboards.finishedAttemptCountLeaderboard,
                                search
                            )}
                        </Tab.Pane>
                        <Tab.Pane eventKey="game-completion">
                            {completePercentageLeaderboard}
                        </Tab.Pane>
                        <Tab.Pane eventKey="game-uploads">
                            {getLeaderboard(
                                "Total Uploads",
                                leaderboards.uploadLeaderboard,
                                search
                            )}
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
};

export default GameLeaderboards;
