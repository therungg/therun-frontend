import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import React, { useMemo } from "react";
import { SectionWrapper } from "~app/[username]/wrapped/sections/section-wrapper";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";
import { Col, Row } from "react-bootstrap";
import { DurationToFormatted } from "~src/components/util/datetime";
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
    };
}

export const WrappedRunsAndPbs: React.FC<WrappedRunsAndPbsProps> = ({
    wrapped,
}) => {
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
                                    >
                                        <Row className="m0">
                                            <Col xs={3} className="gap-0">
                                                <div className="game-image flex-fill bg-body-secondary rounded-3">
                                                    {gameData &&
                                                        gameData.image &&
                                                        gameData.image !==
                                                            "noimage" && (
                                                            <GameImage
                                                                className="rounded-3"
                                                                alt={
                                                                    gameData.display
                                                                }
                                                                src={
                                                                    gameData.image
                                                                }
                                                                quality="small"
                                                                height={
                                                                    132 * 0.7
                                                                }
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
                                                            {value.attemptCount}
                                                            /
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
            </SectionBody>
        </SectionWrapper>
    );
};
