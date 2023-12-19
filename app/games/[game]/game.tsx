"use client";
import React from "react";
import { Col, Row, Tab, Tabs } from "react-bootstrap";
import { CategoryOverview } from "~src/components/game/category-overview";
import { RecentFinishedRuns } from "~src/components/game/recent-finished-runs";
import GameLeaderboards from "~src/components/game/game-leaderboards";
import { GameStats } from "~src/components/game/game-stats";
import { GametimeForm } from "~src/components/gametime/gametime-form";
import { BestRunnersForCategory } from "~src/components/game/best-runners-for-category";
import { CategoryLeaderboards } from "~src/components/game/category-leaderboards";
import styles from "~src/components/css/Game.module.scss";
import CategoryRecordHistory from "~src/components/game/category-record-history";
import LiveRunsForGame from "~src/components/game/live-runs-for-game";
import { CategoryLeaderboard, StatsData } from "./game.types";
import { GameHeader } from "./game-header.component";
import { GameContext } from "./game.context";
import { GameFilter } from "./game-filter.component";

export const revalidate = 60;

interface GameProps {
    // Did server-side validation
    data: Required<StatsData>;
}

export const Game: React.FunctionComponent<GameProps> = ({ data }) => {
    const { statsGameTime, stats: gameStats } = data;

    const [useGameTime, setUseGameTime] = React.useState(() => {
        return (
            !data.global?.forceRealTime &&
            data.statsGameTime &&
            data.statsGameTime.categoryLeaderboards.length >
                data.stats.categoryLeaderboards.length * 0.5
        );
    });

    const stats = (useGameTime && statsGameTime) || gameStats;

    const sortedCategories = React.useMemo(() => {
        return [...stats.categoryLeaderboards].sort((a, b) =>
            a.stats.totalRunTime < b.stats.totalRunTime ? 1 : -1
        );
    }, [stats]);

    const initialCategory =
        sortedCategories.length === 1 ? sortedCategories[0].categoryName : "*";

    const [currentCategory, setCurrentCategory] =
        React.useState(initialCategory);

    const currentCategoryLeaderboard = React.useMemo(() => {
        return stats.categoryLeaderboards.find(
            (leaderboard) => leaderboard.categoryName == currentCategory
        );
    }, [stats, currentCategory]);

    return (
        <GameContext.Provider
            value={{
                category: currentCategory,
                categories: sortedCategories,
                setCategory: setCurrentCategory,
            }}
        >
            <Row className="mb-3">
                <Col sm={9}>
                    <GameHeader data={data} />
                </Col>
                {statsGameTime && (
                    <Col className="align-self-end">
                        <GametimeForm
                            useGameTime={useGameTime}
                            setUseGameTime={setUseGameTime}
                        />
                    </Col>
                )}
            </Row>
            <div className={styles.gamesNavigationContainer}>
                <GameFilter />
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
                                    currentCategory == "*"
                                        ? stats.gameLeaderboard.stats
                                        : currentCategoryLeaderboard?.stats
                                }
                            />
                        </Row>
                        <Row>
                            {currentCategory == "*" ? (
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
                                        currentCategory == "*"
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
                                currentCategory == "*" ? null : currentCategory
                            }
                        />
                    </Tab>
                    <Tab eventKey="leaderboards" title="Leaderboards">
                        <h2>Leaderboards</h2>
                        {currentCategory == "*" ? (
                            <GameLeaderboards
                                leaderboards={stats.gameLeaderboard}
                            />
                        ) : (
                            <CategoryLeaderboards
                                leaderboards={currentCategoryLeaderboard}
                            />
                        )}
                    </Tab>
                    <Tab eventKey="wrHistory" title="Record Stats">
                        <CategoryRecordHistory
                            game={data.data.game.display}
                            category={currentCategory}
                            gameTime={useGameTime}
                        />
                    </Tab>
                </Tabs>
            </div>
        </GameContext.Provider>
    );
};
