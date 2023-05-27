import { GetServerSideProps, GetServerSidePropsContext } from "next";
import { Title } from "../../components/title";
import { Col, Image, Row, Tab, Tabs } from "react-bootstrap";
import { CategoryOverview } from "../../components/game/category-overview";
import { RecentFinishedRuns } from "../../components/game/recent-finished-runs";
import GameLeaderboards from "../../components/game/game-leaderboards";
import { GameStats } from "../../components/game/game-stats";
import React, { useEffect, useState } from "react";
import { GametimeForm } from "../../components/gametime/gametime-form";
import { BestRunnersForCategory } from "../../components/game/best-runners-for-category";
import { CategoryLeaderboards } from "../../components/game/category-leaderboards";
import Link from "next/link";
import styles from "../../components/css/Game.module.scss";
import CategoryRecordHistory from "../../components/game/category-record-history";
import useSWR from "swr";
import LiveRunsForGame from "../../components/game/live-runs-for-game";
import { fetcher } from "../../utils/fetcher";

export interface StatsData {
    data: {
        game: GameMetaData;
        category?: GameMetaData;
    };
    stats: Stats;
    statsGameTime?: Stats;
}

export interface GameMetaData {
    active: boolean;
    display: string;
}

export interface Stats {
    gameLeaderboard: GameLeaderboard;
    categoryLeaderboards: CategoryLeaderboard[];
    userData: any;
}

export interface GameLeaderboard {
    uploadLeaderboard: Count[];
    attemptCountLeaderboard: Count[];
    finishedAttemptCountLeaderboard: Count[];
    totalRunTimeLeaderboard: Count[];
    recentRuns: TimeAndAchievedAt[];
    completePercentageLeaderboard: Count[];
    stats: CumulativeGameStat;
}

export interface CategoryLeaderboard extends GameLeaderboard {
    pbLeaderboard: Count[];
    sumOfBestsLeaderboard: Count[];
    consistencyScoreLeaderboard: Count[];
    categoryName: string;
    categoryNameDisplay: string;

    gameTime?: CategoryLeaderboard;
}

export interface CumulativeGameStat {
    uploadCount: number;
    attemptCount: number;
    finishedAttemptCount: number;
    totalRunTime: number;
    completePercentage: number;
    username?: string;
}

export interface Count {
    username: string;
    stat: number | string;
    meta?: any;
    game?: string;
    category?: string;
    url?: string;
}

interface TimeAndAchievedAt {
    time: string;
    achievedAt: string;
    username: string;
    category: string;
}

export const Game = ({ game }: { game: string }) => {
    const [useGameTime, setUseGameTime] = useState(false);

    const [currentCategory, setCurrentCategory] = useState("all-categories");
    const [stats, setStats] = useState(null);
    const [hasGameTime, setHasGameTime] = useState(false);
    const [sortedCategories, setSortedCategories] = useState([]);

    const { data, error } = useSWR(
        `/api/games/${encodeURIComponent(game)}`,
        fetcher,
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    useEffect(() => {
        if (data && data.global) {
            const forceRealTime = !!data.global.forceRealTime;
            const newHasGameTime = !!data.statsGameTime;

            setHasGameTime(newHasGameTime);
            setUseGameTime(
                newHasGameTime &&
                    !forceRealTime &&
                    data.statsGameTime.categoryLeaderboards.length >
                        data.stats.categoryLeaderboards.length * 0.9
            );

            const newStats: Stats = (
                useGameTime ? data.statsGameTime : data.stats
            ) as Stats;
            setStats(newStats);

            const newSortedCategories = newStats.categoryLeaderboards
                .slice()
                .sort((a, b) => {
                    return a.stats.totalRunTime < b.stats.totalRunTime ? 1 : -1;
                });
            setSortedCategories(newSortedCategories);
            setCurrentCategory(
                newSortedCategories.length === 1
                    ? newSortedCategories[0].categoryName
                    : "all-categories"
            );
        }
    }, [data]);

    useEffect(() => {
        if (data && data.global) {
            const newStats: Stats = (
                useGameTime ? data.statsGameTime : data.stats
            ) as Stats;
            setStats(newStats);

            const newSortedCategories = newStats.categoryLeaderboards
                .slice()
                .sort((a, b) => {
                    return a.stats.totalRunTime < b.stats.totalRunTime ? 1 : -1;
                });
            setSortedCategories(newSortedCategories);
        }
    }, [useGameTime]);

    if (error) {
        return <div>An error occurred. Please contact me!</div>;
    }

    if (data == undefined || !stats) {
        return (
            <div>
                <h1>{game}</h1>
                Loading data... Hold on!
            </div>
        );
    }

    if (!stats) {
        return (
            <div>
                This game has no categories... Something weird happened. If you
                found this game through the search function, It is likely that
                this game had only one runner and they deleted their runs.
                Sorry!
            </div>
        );
    }

    const currentCategoryLeaderboard = stats.categoryLeaderboards.find(
        (leaderboard) => leaderboard.categoryName == currentCategory
    ) as CategoryLeaderboard;
    const globalData = data.global;

    if (!data) {
        return (
            <>
                <h1>Game</h1>
                Unfortunately, Nobody has uploaded runs for this game yet, or
                the upload is not processed yet. If you have uploaded runs for
                the game, but this page still shows, please{" "}
                <Link href={"/contact"}>contact me!</Link>
            </>
        );
    }

    return (
        <>
            <Row className={styles.gameHeader}>
                <Col xs={9}>
                    <div className={styles.gameImage}>
                        {globalData.image && globalData.image != "noimage" && (
                            <Image
                                alt={"game-image"}
                                src={globalData.image}
                                height={80}
                            />
                        )}
                    </div>
                    <div className={styles.gameTitleContainer}>
                        <Title>
                            {currentCategory === "all-categories" ? (
                                data.data.game.display
                            ) : (
                                <a
                                    href={"#"}
                                    onClick={() => {
                                        setCurrentCategory("all-categories");
                                    }}
                                >
                                    {data.data.game.display}
                                </a>
                            )}
                            {currentCategory !== "all-categories" &&
                                ` - ${
                                    sortedCategories.find(
                                        (cat) =>
                                            cat.categoryName == currentCategory
                                    ).categoryNameDisplay
                                }`}
                        </Title>
                    </div>
                </Col>
                {hasGameTime && (
                    <Col className={styles.gameTimeFormContainer}>
                        <GametimeForm
                            useGameTime={useGameTime}
                            setUseGameTime={setUseGameTime}
                        />
                    </Col>
                )}
            </Row>
            <div className={styles.gamesNavigationContainer}>
                {sortedCategories.length > 0 && (
                    <Row className={styles.navigation}>
                        <Col
                            sm={0}
                            md={8}
                            className={styles.optionalColumn}
                            style={{ zIndex: "-10" }}
                        />
                        <Col sm={12} md={4} className={styles.form}>
                            <select
                                className={"form-select"}
                                onChange={(e) => {
                                    setCurrentCategory(e.target.value);
                                }}
                                value={currentCategory}
                            >
                                <option
                                    key={"all-categories"}
                                    title={"All Categories"}
                                    value={"all-categories"}
                                >
                                    Select a Category
                                </option>
                                {sortedCategories.map((leaderboard) => {
                                    const display =
                                        leaderboard.categoryNameDisplay;
                                    const name = leaderboard.categoryName;
                                    return (
                                        <option key={name} value={name}>
                                            {display} &nbsp;
                                        </option>
                                    );
                                })}
                            </select>
                        </Col>
                    </Row>
                )}
                <Tabs
                    defaultActiveKey="dashboard"
                    className={
                        styles.tabsContainer +
                        (stats.categoryLeaderboards.length > 0 &&
                            " with-filter")
                    }
                >
                    <Tab eventKey="dashboard" title="Dashboard">
                        <Row>
                            <GameStats
                                stats={
                                    currentCategory == "all-categories"
                                        ? stats.gameLeaderboard.stats
                                        : currentCategoryLeaderboard.stats
                                }
                            />
                        </Row>
                        <Row>
                            {currentCategory == "all-categories" ? (
                                <Col lg={12} xl={7}>
                                    <h2>Categories</h2>
                                    <CategoryOverview
                                        categories={sortedCategories}
                                        game={data.data.game.display}
                                        setCurrentCategory={setCurrentCategory}
                                    />
                                </Col>
                            ) : (
                                <Col lg={12} xl={7}>
                                    <h2>Leaderboard</h2>
                                    <BestRunnersForCategory
                                        data={
                                            stats.categoryLeaderboards.find(
                                                (leaderboard) =>
                                                    leaderboard.categoryName ==
                                                    currentCategory
                                            ) as CategoryLeaderboard
                                        }
                                    />
                                </Col>
                            )}
                            <Col lg={12} xl={5}>
                                <h2>Recent Finished Runs</h2>
                                <RecentFinishedRuns
                                    game={data.data.game.display}
                                    leaderboards={
                                        currentCategory == "all-categories"
                                            ? stats.gameLeaderboard
                                            : currentCategoryLeaderboard
                                    }
                                    showCategory={true}
                                />
                            </Col>
                        </Row>
                    </Tab>
                    <Tab eventKey="live" title="Live Runs">
                        <LiveRunsForGame
                            game={data.data.game.display}
                            category={
                                currentCategory == "all-categories"
                                    ? null
                                    : currentCategory
                            }
                        />
                    </Tab>
                    <Tab eventKey="leaderboards" title="Leaderboards">
                        <h2>Leaderboards</h2>
                        {currentCategory == "all-categories" ? (
                            <GameLeaderboards
                                leaderboards={stats.gameLeaderboard}
                            />
                        ) : (
                            <CategoryLeaderboards
                                leaderboards={currentCategoryLeaderboard}
                            />
                        )}
                    </Tab>
                    <Tab
                        eventKey="wrHistory"
                        title="Record Stats"
                        onClick={() => {}}
                    >
                        <CategoryRecordHistory
                            game={data.data.game.display}
                            category={currentCategory}
                            gameTime={useGameTime}
                        />
                    </Tab>
                </Tabs>
            </div>
        </>
    );
};

export const getServerSideProps: GetServerSideProps = async (
    context: GetServerSidePropsContext
) => {
    if (!context.params || !context.params.game)
        throw new Error("Params not found");

    const game: string = context.params.game as string;

    return {
        props: {
            game,
        },
    };
};

export default Game;
