import { GameLeaderboard } from "~app/games/[game]/game.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted, FromNow } from "../util/datetime";
import { UserGameCategoryLink, UserLink } from "../links/links";
import React from "react";

interface Props {
    game: string;
    leaderboards: GameLeaderboard;
    showCategory?: boolean;
}

export const RecentFinishedRuns: React.FC<Props> = ({
    game,
    leaderboards,
    showCategory = true,
}) => {
    const runs = leaderboards.recentRuns.filter(
        (run) =>
            !!run.achievedAt &&
            run.achievedAt !== "null" &&
            run.achievedAt !== "ended.toISOString()"
    );

    const runRows = runs
        .slice(0, 10)
        .map(({ username, achievedAt, time, category }) => (
            <tr key={`${username}-${achievedAt}-${time}-${category}`}>
                <td>
                    <UserGameCategoryLink
                        username={username}
                        category={category}
                        game={game}
                    >
                        <FromNow time={achievedAt} />
                    </UserGameCategoryLink>
                </td>
                {showCategory && <td>{category}</td>}
                <td>
                    <UserLink username={username} />
                </td>
                <td>
                    <DurationToFormatted duration={time} />
                </td>
            </tr>
        ));

    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Time Ago</th>
                    <th>{showCategory && "Category"}</th>
                    {showCategory && <th>Runner</th>}
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>{runRows}</tbody>
        </Table>
    );
};

export default RecentFinishedRuns;
