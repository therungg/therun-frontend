import { CategoryLeaderboard } from "~app/games/[game]/game.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import {
    GameCategoryLink,
    UserGameCategoryLink,
    UserLink,
} from "../links/links";
import { Dispatch, useState } from "react";
import { InfoTooltip } from "../tooltip";

export const CategoryOverview = ({
    categories,
    game,
    setCurrentCategory,
}: {
    categories: CategoryLeaderboard[];
    game: string;
    setCurrentCategory: Dispatch<any>;
}) => {
    const [showAllCategories, setShowAllCategories] = useState(5);

    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>
                        Best run
                        <InfoTooltip
                            title={"Best run"}
                            content={
                                <div>
                                    This is the best time out of all users of
                                    The Run. This may or may not be equivalent
                                    to the world record; if the world record
                                    holder does not use The Run, their time will
                                    not be displayed here.
                                </div>
                            }
                        />
                    </th>
                    <th className="d-none d-sm-table-cell">Total playtime</th>
                    <th className="d-none d-md-table-cell">
                        Finished/Total Attempts
                    </th>
                    <th className="d-none d-md-table-cell">Total uploads</th>
                </tr>
            </thead>
            <tbody>
                {categories.slice(0, showAllCategories).map((category) => {
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
                                                    category.categoryName,
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
            <br />
            {categories.length > 5 ? (
                showAllCategories === 5 ? (
                    <button
                        name="Show More"
                        onClick={() => setShowAllCategories(100)}
                    >
                        Show More Categories
                    </button>
                ) : (
                    <button
                        name="Show Less"
                        onClick={() => setShowAllCategories(5)}
                    >
                        Show Less Categories
                    </button>
                )
            ) : null}
        </Table>
    );
};
