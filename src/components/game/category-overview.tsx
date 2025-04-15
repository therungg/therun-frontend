import { CategoryLeaderboard } from "~app/(old-layout)/games/[game]/game.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import {
    GameCategoryLink,
    UserGameCategoryLink,
    UserLink,
} from "../links/links";
import { Dispatch, useState } from "react";
import { InfoTooltip } from "../tooltip";
import { Button } from "~src/components/Button/Button";

export const CategoryOverview = ({
    categories,
    game,
    setCurrentCategory,
}: {
    categories: CategoryLeaderboard[];
    game: string;
    setCurrentCategory: Dispatch<React.SetStateAction<string>>;
}) => {
    const [categoriesCountLimit, setCategoriesCountLimit] = useState(5);
    const MINIMUM_CATEGORIES_LIMIT: number = 5;

    return (
        <Table striped bordered hover responsive>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>
                        Best run
                        <InfoTooltip
                            title="Best run"
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
                {categories.slice(0, categoriesCountLimit).map((category) => {
                    return (
                        category.pbLeaderboard[0] && (
                            <tr key={category.categoryName}>
                                <td className="text-nowrap">
                                    <GameCategoryLink
                                        category={category.categoryName}
                                        game={game}
                                    >
                                        <a
                                            href="#"
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
                                            duration={
                                                category.pbLeaderboard[0].stat
                                            }
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
            {categories.length > MINIMUM_CATEGORIES_LIMIT ? (
                categoriesCountLimit === MINIMUM_CATEGORIES_LIMIT ? (
                    <Button
                        name="Show more categories"
                        className="mt-2"
                        onClick={() =>
                            setCategoriesCountLimit(categories.length)
                        }
                    >
                        Show more categories
                    </Button>
                ) : (
                    <Button
                        name="Show fewer categories"
                        className="mt-2"
                        onClick={() =>
                            setCategoriesCountLimit(MINIMUM_CATEGORIES_LIMIT)
                        }
                    >
                        Show fewer categories
                    </Button>
                )
            ) : null}
        </Table>
    );
};
