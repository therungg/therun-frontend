import { CategoryLeaderboard } from "../../pages/game/[game]";
import { Table } from "react-bootstrap";
import { DurationToFormatted, FromNow } from "../util/datetime";
import { UserLink } from "../links/links";
import React from "react";

interface Props {
    data: CategoryLeaderboard;
}

export const BestRunnersForCategory: React.FC<Props> = ({ data }) => {
    return (
        <div>
            <Table striped bordered responsive hover>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Runner</th>
                        <th>Time</th>
                        <th>Achieved at</th>
                    </tr>
                </thead>
                <tbody>
                    {data.pbLeaderboard.map((leaderboard, n) => (
                        <tr
                            key={`${leaderboard.username}${leaderboard.meta}${leaderboard.stat}`}
                        >
                            <td>{n + 1}</td>
                            <td>
                                <UserLink
                                    url={leaderboard.url}
                                    username={leaderboard.username}
                                />
                            </td>
                            <td style={{ fontWeight: "bolder" }}>
                                <DurationToFormatted
                                    duration={leaderboard.stat as string}
                                />
                            </td>
                            <td>
                                <FromNow time={leaderboard.meta} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
};

export default BestRunnersForCategory;
