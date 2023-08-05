import { CategoryLeaderboard } from "~app/games/[game]/game.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import {
    GameCategoryLink,
    UserGameCategoryLink,
    UserLink,
} from "../links/links";
import { Dispatch } from "react";

export const CategoryOverview = ({
    categories,
    game,
    setCurrentCategory,
}: {
    categories: CategoryLeaderboard[];
    game: string;
    setCurrentCategory: Dispatch<any>;
}) => {
    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Best run</th>
                    <th className="d-none d-sm-table-cell">Total playtime</th>
                    <th className="d-none d-md-table-cell">
                        Finished/Total Attempts
                    </th>
                    <th className="d-none d-md-table-cell">Total uploads</th>
                </tr>
            </thead>
            <tbody>
                {categories.map((category) => {
                    return (
                        category.pbLeaderboard[0] && (
                            <tr key={category.categoryName}>
                                <td className="text-nowrap">
                                    <GameCategoryLink
                                        category={category.categoryName}
                                        game={game}
                                    >
                                        <a
                                            href={"#"}
                                            onClick={() => {
                                                setCurrentCategory(
                                                    category.categoryName
                                                );
                                            }}
                                        >
                                            {category.categoryNameDisplay}
                                        </a>
                                    </GameCategoryLink>
                                </td>
                                <td>
                                    <UserGameCategoryLink
                                        category={category.categoryName}
                                        username={
                                            category.pbLeaderboard[0].username
                                        }
                                        game={game}
                                    >
                                        <DurationToFormatted
                                            duration={category.pbLeaderboard[0].stat.toString()}
                                        />
                                    </UserGameCategoryLink>
                                    &nbsp;(
                                    <UserLink
                                        username={
                                            category.pbLeaderboard[0].username
                                        }
                                        url={
                                            category.pbLeaderboard[0].url || ""
                                        }
                                    />
                                    )
                                </td>
                                <td className="d-none d-sm-table-cell text-nowrap">
                                    <DurationToFormatted
                                        duration={
                                            category.stats.totalRunTime
                                                ? category.stats.totalRunTime.toString()
                                                : ""
                                        }
                                    />
                                </td>
                                <td className="d-none d-md-table-cell text-nowrap">
                                    {category.stats.finishedAttemptCount}/
                                    {category.stats.attemptCount} (
                                    {(
                                        (category.stats.finishedAttemptCount /
                                            category.stats.attemptCount) *
                                        100
                                    ).toFixed(2)}
                                    %)
                                </td>
                                <td className="d-none d-md-table-cell">
                                    {category.stats.uploadCount}
                                </td>
                            </tr>
                        )
                    );
                })}
            </tbody>
        </Table>
    );
};
