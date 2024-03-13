import { UserStats } from "~app/races/races.types";
import React from "react";
import { DurationToFormatted } from "~src/components/util/datetime";
import styles from "~src/components/css/LiveRun.module.scss";
import Image from "next/image";

export const UserRaceStatsByGame = ({ stats }: { stats: UserStats[][] }) => {
    return (
        <div>
            {stats.map((categories, i) => {
                return <UserRaceStatsForGame key={i} stats={categories} />;
            })}
        </div>
    );
};

const UserRaceStatsForGame = ({ stats }: { stats: UserStats[] }) => {
    const useStat = stats[0];
    const game = useStat.displayValue.split("#")[0];
    const favoriteCategory = useStat.displayValue.split("#")[1];
    return (
        <div>
            <div
                key={useStat.displayValue}
                className={`mb-3 rounded-3 w-100 game-border bg-body-secondary`}
                style={{ color: "var(--bs-body-color)" }}
            >
                <div className={`d-flex`}>
                    <Image
                        alt={`Image for ${useStat.displayValue}`}
                        src={useStat.image}
                        height={64 * 2.3}
                        width={48 * 2.3}
                        className={`${
                            stats.length > 1
                                ? "rounded-top-3 rounded-end-0"
                                : "rounded-3"
                        }`}
                    />
                    <div className={"w-100"}>
                        <div className={"px-3 w-100"}>
                            <div
                                className={
                                    "d-flex w-100 h5 pt-2 text-truncate mb-0"
                                }
                            >
                                <a href={`/races/stats/${encodeURI(game)}`}>
                                    {game}
                                </a>
                            </div>
                            <div className={"fst-italic"}>
                                {favoriteCategory}
                            </div>
                        </div>
                        <hr className={"m-0 p-0 mt-1 mb-2"} />
                        <a
                            href={`/races/stats/${encodeURI(game)}/${encodeURI(
                                favoriteCategory,
                            )}`}
                            className={"text-decoration-none"}
                            style={{ color: "inherit" }}
                        >
                            <ShowUserCategoryStats category={useStat} />
                        </a>
                    </div>
                </div>
                <div className={`h-100`}>
                    {stats.slice(1, stats.length).map((category) => {
                        const categoryName =
                            category.displayValue.split("#")[1];
                        return (
                            <div
                                key={game + category.displayValue}
                                className={`border-top h-100 ${styles.liveRunContainer}`}
                            >
                                <a
                                    href={`/races/stats/${encodeURI(
                                        game,
                                    )}/${encodeURI(categoryName)}`}
                                    className={"text-decoration-none"}
                                    style={{ color: "inherit" }}
                                >
                                    <div className={"d-flex h-100"}>
                                        <div
                                            className={
                                                "ps-2 d-flex align-items-center border-end"
                                            }
                                        >
                                            <span
                                                className={"text-truncate"}
                                                style={{
                                                    width: "6.34rem",
                                                }}
                                            >
                                                {categoryName}
                                            </span>
                                        </div>
                                        <div
                                            className={`w-100 ${styles.liveRunContainer}`}
                                        >
                                            <ShowUserCategoryStats
                                                category={category}
                                            />
                                        </div>
                                    </div>
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export const ShowUserCategoryStats = ({
    category,
}: {
    category: UserStats;
}) => {
    return (
        <div
            className={`d-flex justify-content-between px-3 my-1 ${styles.liveRunContainer}`}
        >
            <div>
                <div>
                    Races: <b>{category.totalRaces}</b>
                </div>
                <div>
                    Finished: <b>{category.totalFinishedRaces}</b>
                </div>
                <div>
                    Time:{" "}
                    <b>
                        <DurationToFormatted
                            duration={category.totalRaceTime}
                        />
                    </b>
                </div>
            </div>
            <div>
                <div className={"d-flex justify-content-end"}>
                    Rating:{" "}
                    <b className={"px-1"}>{category.rankings[0].score}</b> - #
                    {category.rankings[0].rank + 1}
                </div>
                <div className={"d-flex justify-content-end"}>
                    Best Time:
                    <b className={"px-1"}>
                        <DurationToFormatted
                            duration={category.rankings[1].score}
                        />
                    </b>
                    - #{category.rankings[1].rank + 1}
                </div>
                {category.rankings[2].score && (
                    <div className={"d-flex justify-content-end"}>
                        This Month:
                        <b className={"px-1"}>
                            <DurationToFormatted
                                duration={category.rankings[2].score}
                            />
                        </b>
                        - #{category.rankings[2].rank + 1}
                    </div>
                )}
            </div>
        </div>
    );
};
