import moment from "moment";
import { CategoryLeaderboard } from "~app/games/[game]/game.types";
import React from "react";
import { Col, Row, Table } from "react-bootstrap";
import styles from "../css/Game.module.scss";
import { PatreonBunnySvg } from "~src/pages/patron";

export interface Tournament {
    name: string;
    description?: string;
    rules?: string[];
    socials?: {
        twitch?: Social;
        twitter?: Social;
        youtube?: Social;
    };
    startDate: string;
    endDate: string;
    admin: string;
    eligiblePeriods: DateRange[];
    eligibleUsers: string[] | null;
    eligibleRuns: GameCategory[];
    ineligibleUsers: string[] | null;
    moderators: string[] | null;
    url: string;
    pointDistribution?: number[] | null;
    leaderboards?: CategoryLeaderboard;
    gameTime?: boolean;
    shortName?: string;

    logoUrl?: string;
    minimumTimeSeconds?: number;
    forceStream?: string;

    qualifier?: string;
    parentTournamentName?: string;
    parentTournamentSequence?: number;

    game?: string;
    category?: string;
    excludedRuns: ExcludedRun[];
}

interface Social {
    display: string;
    urlDisplay: string;
    url: string;
}

interface DateRange {
    startDate: string;
    endDate: string;
}

interface GameCategory {
    game: string;
    category: string;
}

interface ExcludedRun {
    user: string;
    startedAt: string;
}

//TODO:: This page is ugly and terrible design. There's a lot of cool data on tournaments, so use it properly.
export const TournamentInfo = ({ tournament }: { tournament: Tournament }) => {
    return (
        <div>
            {tournament.description && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        fontSize: "x-large",
                        marginBottom: "1rem",
                    }}
                >
                    {tournament.description}
                </div>
            )}
            <Table
                responsive
                borderless
                className={styles.tableVertical}
                style={{ marginBottom: "2rem" }}
            >
                <tbody>
                    <tr className={styles.tableVerticalHeader}>
                        <th colSpan={2}>Tournament</th>
                    </tr>
                    <tr>
                        <th>Starting at</th>
                        <td>{moment(tournament.startDate).format("LLL")}</td>
                    </tr>
                    <tr>
                        <th>Ending at</th>
                        <td>{moment(tournament.endDate).format("LLL")}</td>
                    </tr>
                    {tournament.socials && (
                        <tr className={styles.tableVerticalHeader}>
                            <th colSpan={2}>Tournament socials</th>
                        </tr>
                    )}
                    {tournament.socials &&
                        Object.values(tournament.socials).map((social) => {
                            return (
                                <>
                                    <tr>
                                        <th key={social.display}>
                                            {social.display}
                                        </th>
                                        <td key={social.display}>
                                            <a
                                                target={"_blank"}
                                                rel={"noreferrer"}
                                                href={social.url}
                                            >
                                                {social.urlDisplay}
                                            </a>
                                        </td>
                                    </tr>
                                </>
                            );
                        })}
                </tbody>
            </Table>
            <Row>
                {tournament.pointDistribution &&
                    tournament.pointDistribution.length > 0 && (
                        <Col xl={3}>
                            <h3>Points</h3>
                            <ul>
                                {tournament.pointDistribution.map(
                                    (points, key) => {
                                        let extension = "th";
                                        if (key === 0) extension = "st";
                                        if (key === 1) extension = "nd";
                                        if (key === 2) extension = "rd";
                                        const displayKey = key + 1 + extension;

                                        return (
                                            <li key={key}>
                                                {displayKey}:{" "}
                                                <span>
                                                    <strong>{points}</strong>{" "}
                                                    points
                                                </span>
                                            </li>
                                        );
                                    }
                                )}
                            </ul>
                        </Col>
                    )}

                {tournament.rules && tournament.rules.length > 0 && (
                    <Col xl={3}>
                        <h3>Rules</h3>
                        <ul>
                            {tournament.rules.map((rule) => {
                                return <li key={rule}>{rule}</li>;
                            })}
                        </ul>
                    </Col>
                )}
                {tournament.moderators && tournament.moderators.length > 0 && (
                    <Col xl={3}>
                        <h3>Moderators</h3>
                        <ul>
                            {tournament.moderators.map((moderator) => {
                                return (
                                    <li key={moderator}>
                                        <a
                                            target={"_blank"}
                                            rel={"noreferrer"}
                                            href={`/${moderator}`}
                                        >
                                            {moderator}
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </Col>
                )}
                {tournament.eligibleUsers &&
                    tournament.eligibleUsers.length > 0 && (
                        <Col xl={3}>
                            <h3>Runners</h3>
                            <ul>
                                {tournament.eligibleUsers.map((moderator) => {
                                    return (
                                        <li key={moderator}>
                                            <a
                                                target={"_blank"}
                                                rel={"noreferrer"}
                                                href={`/${moderator}`}
                                            >
                                                {moderator}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Col>
                    )}
                <Col xl={3}>
                    <h3>Support therun.gg</h3>
                    <PatreonBunnySvg size={100} />
                </Col>
            </Row>
        </div>
    );
};
