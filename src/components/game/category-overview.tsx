import { CategoryLeaderboard } from "~app/games/[game]/game.types";
import { Table } from "react-bootstrap";
import { DurationToFormatted } from "../util/datetime";
import {
    GameCategoryLink,
    UserGameCategoryLink,
    UserLink,
} from "../links/links";
import styles from "../css/Game.module.scss";
import { Dispatch } from "react";
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
                    <th className={styles.optionalColumn}>Total playtime</th>
                    <th className={styles.statsHorizontal}>
                        Finished/Total Attempts
                    </th>
                    <th className={styles.statsHorizontal}>Total uploads</th>
                </tr>
            </thead>
            <tbody>
                {categories.map((category) => {
                    return (
                        category.pbLeaderboard[0] && (
                            <tr key={category.categoryName}>
                                <td style={{ whiteSpace: "nowrap" }}>
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
                                <td
                                    className={styles.optionalColumn}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    <DurationToFormatted
                                        duration={
                                            category.stats.totalRunTime
                                                ? category.stats.totalRunTime.toString()
                                                : ""
                                        }
                                    />
                                </td>
                                <td
                                    className={styles.statsHorizontal}
                                    style={{ whiteSpace: "nowrap" }}
                                >
                                    {category.stats.finishedAttemptCount}/
                                    {category.stats.attemptCount} (
                                    {(
                                        (category.stats.finishedAttemptCount /
                                            category.stats.attemptCount) *
                                        100
                                    ).toFixed(2)}
                                    %)
                                </td>
                                <td className={styles.statsHorizontal}>
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
