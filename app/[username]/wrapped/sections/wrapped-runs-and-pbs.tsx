import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import React, { Dispatch, FC, SetStateAction, useMemo, useState } from "react";
import { SectionWrapper } from "~app/[username]/wrapped/sections/section-wrapper";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";
import { Col, Row, Table } from "react-bootstrap";
import {
    Difference,
    DifferenceFromOne,
    DurationToFormatted,
    getDateAsMonthDay,
} from "~src/components/util/datetime";
import styles from "~src/components/css/LiveRun.module.scss";
import { GameImage } from "~src/components/image/gameimage";

interface WrappedRunsAndPbsProps {
    wrapped: WrappedWithData;
}

interface GroupedGameData {
    game: string;
    pbCount: number;
    attemptCount: number;
    finishedAttemptCount: number;
    totalRunTime: number;
    totalGolds: number;
    categories: Map<string, CategoryData>;
}

interface CategoryData {
    category: string;
    pb: number;
    timeBefore: number;
    attemptCount: number;
    finishedAttemptCount: number;
    pbCount: number;
    totalRunTime: number;
    totalGolds: number;
    pbs: [];
    runs: {
        startedAt: string;
        endedAt: string;
        time: string;
        isPb: boolean;
        timeSave: number | null;
    }[];
}

export const WrappedRunsAndPbs: React.FC<WrappedRunsAndPbsProps> = ({
    wrapped,
}) => {
    const [selectedGame, setSelectedGame] = useState<string | null>(null);
    const pbPercentage = (wrapped.totalPbs / wrapped.totalFinishedRuns) * 100;

    const groupedData: Map<string, GroupedGameData> = useMemo(() => {
        const gameCategoryMap = new Map();

        wrapped.runData.forEach((run, i) => {
            const correspondingPbs = wrapped.pbsAndGolds[i];
            const {
                game,
                category,
                pb,
                attemptCount,
                finishedAttemptCount,
                totalRunTime,
                runs,
            } = run;
            const { timeBefore, totalGolds, pbs } = correspondingPbs;

            if (!gameCategoryMap.has(game)) {
                gameCategoryMap.set(game, {
                    categories: new Map(),
                    game,
                    attemptCount: 0,
                    finishedAttemptCount: 0,
                    pbCount: 0,
                    totalRunTime: 0,
                    totalGolds: 0,
                });
            }

            const currentGameCategoryMap = gameCategoryMap.get(game);

            currentGameCategoryMap.attemptCount += attemptCount;
            currentGameCategoryMap.finishedAttemptCount += finishedAttemptCount;
            currentGameCategoryMap.totalRunTime += parseInt(totalRunTime);
            currentGameCategoryMap.totalGolds += totalGolds;
            currentGameCategoryMap.pbCount += pbs.length;

            if (!currentGameCategoryMap.categories.has(category)) {
                currentGameCategoryMap.categories.set(category, {
                    category,
                    pb,
                    timeBefore,
                    attemptCount: attemptCount,
                    finishedAttemptCount: finishedAttemptCount,
                    pbCount: pbs.length,
                    totalRunTime: parseInt(totalRunTime),
                    totalGolds: totalGolds,
                    pbs,
                    runs: runs.map((run) => {
                        const pbIndex = pbs.findIndex(
                            (pb) => pb.time === parseInt(run.time),
                        );

                        const isPb = pbIndex > -1;

                        const timeSave = isPb
                            ? pbIndex === 0
                                ? timeBefore
                                    ? parseInt(run.time) - timeBefore
                                    : null
                                : parseInt(run.time) - pbs[pbIndex - 1].time
                            : null;

                        return {
                            ...run,
                            isPb,
                            timeSave,
                        };
                    }),
                });
            }

            gameCategoryMap.set(game, currentGameCategoryMap);
        });

        return gameCategoryMap;
    }, [wrapped.runData, wrapped.pbsAndGolds]);

    return (
        <SectionWrapper>
            <SectionTitle
                title={"Here's a full overview of your runs this year!"}
                subtitle={`You finished ${wrapped.totalFinishedRuns} runs. ${
                    wrapped.totalPbs
                } - or ${pbPercentage.toFixed(2)}% - of them were a PB.`}
                extraRemark="We all know speedrunning is about records, not about having fun."
            />
            <SectionBody>
                {selectedGame === null && (
                    <GameOverview
                        wrapped={wrapped}
                        setSelectedGame={setSelectedGame}
                        groupedData={groupedData}
                    />
                )}
                {selectedGame !== null && (
                    <ShowGame
                        wrapped={wrapped}
                        selectedGame={selectedGame}
                        returnToOverview={() => setSelectedGame(null)}
                        gameData={
                            groupedData.get(selectedGame) as GroupedGameData
                        }
                    />
                )}
            </SectionBody>
        </SectionWrapper>
    );
};

const GameOverview: React.FC<
    WrappedRunsAndPbsProps & {
        setSelectedGame: Dispatch<SetStateAction<string | null>>;
        groupedData: Map<string, GroupedGameData>;
    }
> = ({ wrapped, setSelectedGame, groupedData }) => {
    return (
        <div>
            <div className="mb-2">
                Click on a game to view detailed data about that game!
            </div>
            <Row>
                {Array.from(groupedData)
                    .sort(
                        ([, aValue], [, bValue]) =>
                            bValue.totalRunTime - aValue.totalRunTime,
                    )
                    .map(([key, value]) => {
                        const gameData = wrapped.gamesData.find(
                            (gameData) => gameData.display === key,
                        );
                        return (
                            <Col key={key} xl={3} lg={4} md={6}>
                                <div
                                    className={`mb-3 bg-body-secondary game-border border-secondary py-2 rounded-3 ${styles.liveRunContainer}`}
                                    onClick={() => {
                                        setSelectedGame(key);
                                    }}
                                >
                                    <Row className="m0">
                                        <Col xs={3} className="gap-0">
                                            <div className="game-image flex-fill bg-body-secondary rounded-3">
                                                {gameData && (
                                                    <GameImage
                                                        className="rounded-3"
                                                        alt={gameData.display}
                                                        src={gameData.image}
                                                        quality="small"
                                                        height={132 * 0.7}
                                                        width={99 * 0.6}
                                                    />
                                                )}
                                            </div>
                                        </Col>
                                        <Col xs={9}>
                                            <div className="h5 fw-bold text-truncate">
                                                {key}
                                            </div>
                                            <div className="d-flex justify-content-between me-3">
                                                <div>
                                                    <i>
                                                        Attempts/Finished/PB's
                                                    </i>
                                                </div>
                                                <div>
                                                    <b>
                                                        {value.attemptCount}/
                                                        {
                                                            value.finishedAttemptCount
                                                        }
                                                        /{value.pbCount}
                                                    </b>
                                                </div>
                                            </div>
                                            <div className="d-flex justify-content-between me-3">
                                                <div>
                                                    <i>Total playtime</i>
                                                </div>
                                                <div>
                                                    <b>
                                                        <DurationToFormatted
                                                            duration={
                                                                value.totalRunTime
                                                            }
                                                        />
                                                    </b>
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </Col>
                        );
                    })}
            </Row>
        </div>
    );
};

const ShowGame: React.FC<
    WrappedRunsAndPbsProps & {
        selectedGame: string;
        returnToOverview: () => void;
        gameData: GroupedGameData;
    }
> = ({ wrapped, selectedGame, returnToOverview, gameData }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(
        null,
    );

    const gameImage = wrapped.gamesData.find(
        (gameData) => gameData.display === selectedGame,
    )?.image as string;

    if (selectedCategory !== null) {
        return (
            <ShowCategory
                wrapped={wrapped}
                game={selectedGame}
                category={selectedCategory}
                categoryData={
                    gameData.categories.get(selectedCategory) as CategoryData
                }
                returnToGame={() => setSelectedCategory(null)}
            />
        );
    }

    return (
        <div className="mb-5">
            <div className="mb-4">
                <h2>{selectedGame}</h2>
                <span
                    className="text-decoration-underline cursor-pointer link-underline-opacity-50-hover"
                    onClick={() => {
                        setSelectedCategory(null);
                        returnToOverview();
                    }}
                >
                    {"< Back to games"}
                </span>
            </div>
            <Row>
                <Col>
                    <div className="game-image flex-fill rounded-3">
                        <GameImage
                            className="rounded-3"
                            alt={selectedGame}
                            src={gameImage}
                            quality="sd"
                            height={132 * 4}
                            width={99 * 4}
                        />
                    </div>
                </Col>
                <Col>
                    <div className="table-responsive mt-4">
                        <Table className="table table_custom h5">
                            <tbody>
                                <tr>
                                    <td>
                                        <b>
                                            You spent{" "}
                                            <DurationToFormatted
                                                duration={gameData.totalRunTime}
                                            />{" "}
                                            playing this game
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            You ran a total of{" "}
                                            {gameData.categories.size}{" "}
                                            categories
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            You started {gameData.attemptCount}{" "}
                                            attempts
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            You finished{" "}
                                            {gameData.finishedAttemptCount}{" "}
                                            attempts
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>You got {gameData.pbCount} PB's</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            While doing so, you golded{" "}
                                            {gameData.totalGolds} times
                                        </b>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                </Col>
                <Col
                    className="overflow-y-auto"
                    style={{
                        maxHeight: "60vh",
                    }}
                >
                    {Array.from(gameData.categories).map(
                        ([category, categoryData]) => {
                            return (
                                <div
                                    key={category}
                                    className={`mb-3 bg-body-secondary game-border border-secondary py-2 rounded-3 ${styles.liveRunContainer}`}
                                    onClick={() => {
                                        setSelectedCategory(category);
                                    }}
                                >
                                    <div className="h5 fw-bold text-truncate">
                                        {category} -{" "}
                                        <DurationToFormatted
                                            duration={categoryData.pb}
                                        />{" "}
                                        {categoryData.timeBefore &&
                                            categoryData.pb &&
                                            categoryData.timeBefore !==
                                                categoryData.pb && (
                                                <span className="h6">
                                                    (
                                                    <Difference
                                                        two={categoryData.timeBefore.toString()}
                                                        one={categoryData.pb.toString()}
                                                        inline={true}
                                                    />{" "}
                                                    this year)
                                                </span>
                                            )}
                                    </div>
                                    <div className="d-flex justify-content-between mx-5">
                                        <div>
                                            <i>Attempts/Finished/PB's</i>
                                        </div>
                                        <div>
                                            <b>
                                                {categoryData.attemptCount}/
                                                {
                                                    categoryData.finishedAttemptCount
                                                }
                                                /{categoryData.pbCount}
                                            </b>
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-between mx-5">
                                        <div>
                                            <i>Total playtime</i>
                                        </div>
                                        <div>
                                            <b>
                                                <DurationToFormatted
                                                    duration={
                                                        categoryData.totalRunTime
                                                    }
                                                />
                                            </b>
                                        </div>
                                    </div>
                                </div>
                            );
                        },
                    )}
                </Col>
            </Row>
        </div>
    );
};

const ShowCategory: FC<
    WrappedRunsAndPbsProps & {
        game: string;
        category: string;
        categoryData: CategoryData;
        returnToGame: () => void;
    }
> = ({ wrapped, game, category, categoryData, returnToGame }) => {
    const gameImage = wrapped.gamesData.find(
        (gameData) => gameData.display === game,
    )?.image as string;
    return (
        <div className="mb-5">
            <div className="mb-4">
                <h2>
                    {game} - {category}
                </h2>
                <span
                    className="text-decoration-underline cursor-pointer link-underline-opacity-50-hover"
                    onClick={() => {
                        returnToGame();
                    }}
                >
                    {"< Back to " + game}
                </span>
            </div>
            <Row>
                <Col>
                    <div className="game-image flex-fill rounded-3">
                        <GameImage
                            className="rounded-3"
                            alt={game}
                            src={gameImage}
                            quality="sd"
                            height={132 * 4}
                            width={99 * 4}
                        />
                    </div>
                </Col>
                <Col>
                    <div className="table-responsive mt-4">
                        <Table className="table table_custom h5">
                            <tbody>
                                <tr>
                                    <td>
                                        <b>
                                            {categoryData.timeBefore && (
                                                <>
                                                    You started the year off
                                                    with a PB of{" "}
                                                    <DurationToFormatted
                                                        duration={
                                                            categoryData.timeBefore
                                                        }
                                                    />
                                                </>
                                            )}
                                            {!categoryData.timeBefore && (
                                                <>
                                                    This year was the first time
                                                    you ran {category}
                                                </>
                                            )}
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            Your best time this year was a{" "}
                                            <DurationToFormatted
                                                duration={categoryData.pb}
                                            />
                                        </b>
                                    </td>
                                </tr>
                                {categoryData.timeBefore &&
                                    categoryData.timeBefore >
                                        categoryData.pb && (
                                        <tr>
                                            <td>
                                                <b>
                                                    <span>
                                                        So you shaved off{" "}
                                                        <Difference
                                                            two={categoryData.timeBefore.toString()}
                                                            one={categoryData.pb.toString()}
                                                            inline={true}
                                                        />{" "}
                                                        this year!
                                                    </span>
                                                </b>
                                            </td>
                                        </tr>
                                    )}
                                {categoryData.timeBefore &&
                                    categoryData.timeBefore <=
                                        categoryData.pb && (
                                        <tr>
                                            <td>
                                                <b>
                                                    <span>
                                                        You were only{" "}
                                                        <Difference
                                                            two={categoryData.timeBefore.toString()}
                                                            one={categoryData.pb.toString()}
                                                            inline={true}
                                                        />{" "}
                                                        off your PB this year!
                                                    </span>
                                                </b>
                                            </td>
                                        </tr>
                                    )}
                                <tr>
                                    <td>
                                        <b>
                                            You spent{" "}
                                            <DurationToFormatted
                                                duration={
                                                    categoryData.totalRunTime
                                                }
                                            />{" "}
                                            playing this category
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            You started{" "}
                                            {categoryData.attemptCount} attempts
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            You finished{" "}
                                            {categoryData.finishedAttemptCount}{" "}
                                            attempts
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            You got {categoryData.pbCount} PB's
                                        </b>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <b>
                                            While doing so, you golded{" "}
                                            {categoryData.totalGolds} times
                                        </b>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>
                </Col>
                <Col
                    className="overflow-y-auto"
                    style={{
                        maxHeight: "60vh",
                    }}
                >
                    <Table className="table table_custom mt-4">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Was PB</th>
                                <th>Timesave</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryData.timeBefore && (
                                <tr>
                                    <td>Before {wrapped.year}</td>
                                    <td>
                                        <DurationToFormatted
                                            duration={categoryData.timeBefore}
                                        />
                                    </td>
                                    <td></td>
                                    <td></td>
                                </tr>
                            )}
                            {categoryData.runs.map((run) => {
                                return (
                                    <tr key={run.startedAt}>
                                        <td>
                                            {getDateAsMonthDay(
                                                new Date(run.endedAt),
                                            )}
                                        </td>
                                        <td>
                                            <DurationToFormatted
                                                duration={run.time}
                                            />
                                        </td>
                                        <td>
                                            {run.isPb
                                                ? run.timeSave
                                                    ? "Yes!"
                                                    : "First Run"
                                                : "No"}
                                        </td>
                                        <td>
                                            {run.isPb && run.timeSave && (
                                                <DifferenceFromOne
                                                    className=""
                                                    diff={run.timeSave}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </div>
    );
};
