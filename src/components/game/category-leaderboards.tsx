import { CategoryLeaderboard } from "~app/games/[game]/game.types";
import { DurationToFormatted, getFormattedString } from "../util/datetime";
import {
    getAverageFromLeaderboard,
    getLeaderboard,
    getStatsTable,
} from "./game-leaderboards";
import { Col, Nav, Row, Tab } from "react-bootstrap";
import { useState } from "react";
import { Search as SearchIcon } from "react-bootstrap-icons";

export const CategoryLeaderboards = ({
    leaderboards,
}: {
    leaderboards: CategoryLeaderboard;
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
            return <DurationToFormatted duration={stat.toString()} />;
        }
    );
    const pbLeaderboard = getLeaderboard(
        "Personal Best",
        leaderboards.pbLeaderboard,
        search,
        (stat) => {
            return <DurationToFormatted duration={stat.toString()} />;
        }
    );
    const sobLeaderboard = getLeaderboard(
        "Sum of bests",
        leaderboards.sumOfBestsLeaderboard,
        search,
        (stat) => {
            return <DurationToFormatted duration={stat.toString()} />;
        }
    );

    if (leaderboards.pbLeaderboard.length < 1) {
        return <div>No leaderboards found... Sorry!</div>;
    }

    return (
        <Tab.Container id="game-tabs" defaultActiveKey="category-pb">
            <Row>
                <Col lg={3} md={4}>
                    <Nav variant="pills" className="flex-column">
                        <Nav.Item>
                            <Nav.Link eventKey="category-pb" href="#">
                                Personal Best
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="category-sob" href="#">
                                Sum of bests
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="category-playtime" href="#">
                                Total playtime
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="category-completion" href="#">
                                Completion %
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="category-uploads" href="#">
                                Total Uploads
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="category-attempts" href="#">
                                Total Attempts
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link
                                eventKey="category-finished-attempts"
                                href="#"
                            >
                                Finished Attempts
                            </Nav.Link>
                        </Nav.Item>
                        <Tab.Content>
                            {leaderboards.pbLeaderboard.length > 0 && (
                                <Tab.Pane eventKey="category-pb">
                                    {getStatsTable(
                                        new Map<string, string>([
                                            [
                                                "Best",
                                                getFormattedString(
                                                    leaderboards.pbLeaderboard[0].stat.toString(),
                                                    false,
                                                    true
                                                ),
                                            ],
                                            [
                                                "Average",
                                                getFormattedString(
                                                    getAverageFromLeaderboard(
                                                        leaderboards.pbLeaderboard
                                                    ).toString(),
                                                    false,
                                                    true
                                                ),
                                            ],
                                        ])
                                    )}
                                </Tab.Pane>
                            )}
                            {leaderboards.sumOfBestsLeaderboard.length > 0 && (
                                <Tab.Pane eventKey="category-sob">
                                    {getStatsTable(
                                        new Map<string, string>([
                                            [
                                                "Best",
                                                getFormattedString(
                                                    leaderboards.sumOfBestsLeaderboard[0].stat.toString(),
                                                    false,
                                                    true
                                                ),
                                            ],
                                            [
                                                "Average",
                                                getFormattedString(
                                                    getAverageFromLeaderboard(
                                                        leaderboards.sumOfBestsLeaderboard
                                                    ).toString(),
                                                    false,
                                                    true
                                                ),
                                            ],
                                        ])
                                    )}
                                </Tab.Pane>
                            )}
                            {leaderboards.totalRunTimeLeaderboard.length >
                                0 && (
                                <Tab.Pane eventKey="category-playtime">
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
                            )}
                            <Tab.Pane eventKey="category-completion">
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
                            {leaderboards.uploadLeaderboard.length > 0 && (
                                <Tab.Pane eventKey="category-uploads">
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
                            )}
                            {leaderboards.attemptCountLeaderboard.length >
                                0 && (
                                <Tab.Pane eventKey="category-attempts">
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
                            )}
                            {leaderboards.finishedAttemptCountLeaderboard
                                .length > 0 && (
                                <Tab.Pane eventKey="category-finished-attempts">
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
                            )}
                        </Tab.Content>
                    </Nav>
                </Col>
                <Col lg={9} md={8}>
                    <div className="d-flex justify-content-center">
                        <div className="mb-3 input-group game-filter-mw">
                            <span
                                className="input-group-text"
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
                                <SearchIcon size={18} />
                            </span>
                            <input
                                type="search"
                                className="form-control"
                                placeholder="Filter by name"
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                }}
                                value={search}
                                id="gameSearch"
                            />
                        </div>
                    </div>
                    <Tab.Content>
                        <Tab.Pane eventKey="category-pb">
                            {pbLeaderboard}
                        </Tab.Pane>
                        <Tab.Pane eventKey="category-sob">
                            {sobLeaderboard}
                        </Tab.Pane>
                        <Tab.Pane eventKey="category-playtime">
                            {playtimeLeaderboard}
                        </Tab.Pane>
                        <Tab.Pane eventKey="category-completion">
                            {completePercentageLeaderboard}
                        </Tab.Pane>
                        <Tab.Pane eventKey="category-uploads">
                            {getLeaderboard(
                                "Total Uploads",
                                leaderboards.uploadLeaderboard,
                                search
                            )}
                        </Tab.Pane>
                        <Tab.Pane eventKey="category-attempts">
                            {getLeaderboard(
                                "Total Attempts",
                                leaderboards.attemptCountLeaderboard,
                                search
                            )}
                        </Tab.Pane>
                        <Tab.Pane eventKey="category-finished-attempts">
                            {getLeaderboard(
                                "Total Finished Runs",
                                leaderboards.finishedAttemptCountLeaderboard,
                                search
                            )}
                        </Tab.Pane>
                    </Tab.Content>
                </Col>
            </Row>
        </Tab.Container>
    );
};

export default CategoryLeaderboards;
