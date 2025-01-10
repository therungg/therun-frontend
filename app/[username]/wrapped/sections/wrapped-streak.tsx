import React, { ReactNode, useMemo, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import { GameImage } from "~src/components/image/gameimage";
import { TotalStat } from "~src/components/user/stats";
// import { useHeartsAnimation } from "../use-hearts-animation.hook";
import { WrappedCounter } from "../wrapped-counter";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionWrapper } from "~app/[username]/wrapped/sections/section-wrapper";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";
import {
    DurationToFormatted,
    getDateAsMonthDay,
} from "~src/components/util/datetime";
import { Col, Row, Table } from "react-bootstrap";
import styles from "../hearts.module.scss";

export const WrappedStreak = ({ wrapped }: { wrapped: WrappedWithData }) => {
    const streakInDays = wrapped.streak.length;
    const heartContainerRef = useRef<HTMLElement>(null);
    const cardRef = useRef<HTMLElement>(null);

    function getDatesInRange(startDate: string, endDate: string): string[] {
        const dates: string[] = [];
        const currentDate = new Date(startDate);
        const lastDate = new Date(endDate);

        while (currentDate <= lastDate) {
            dates.push(currentDate.toISOString().split("T")[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    const streakPlaytimes = useMemo(() => {
        const playtimePerDayMap = wrapped.playtimeData.playtimePerDayMap;
        const { start: streakStart, end: streakEnd } = wrapped.streak;

        const streakDates = getDatesInRange(streakStart, streakEnd);

        return streakDates.reduce<TotalStat[]>((result, date) => {
            if (playtimePerDayMap[date]) {
                result.push(playtimePerDayMap[date]);
            }

            return result;
        }, []);
    }, [wrapped.playtimeData.playtimePerDayMap, wrapped.streak]);

    const gameFrequencyMap = useMemo(() => {
        return streakPlaytimes.reduce<Record<string, number>>(
            (result, totalStat) => {
                const games = Object.keys(totalStat.perGame);

                for (const game of games) {
                    if (!result[game]) result[game] = 0;
                    else result[game]++;
                }
                return result;
            },
            {},
        );
    }, [streakPlaytimes]);

    const sortedGameFrequencyMap = useMemo(
        () => Object.entries(gameFrequencyMap).sort((a, b) => b[1] - a[1]),
        [gameFrequencyMap],
    );

    const mostPlayedGame = useMemo(() => {
        if (sortedGameFrequencyMap.length === 1) {
            // first entry in the sortedGameFrequencyMap and then pull the key from the entry
            return sortedGameFrequencyMap[0][0];
        }

        if (sortedGameFrequencyMap.length > 1) {
            // Grab the first indexed game, and compare its playcount against the next index.
            // If both match, we can assume there is no top game. If not, there is a top game.
            const [topGame, topGameCount] = sortedGameFrequencyMap[0];
            const [_, compareGameCount] = sortedGameFrequencyMap[1];

            if (topGameCount >= compareGameCount) {
                return topGame;
            }
        }

        return "";
    }, [sortedGameFrequencyMap]);

    const getStreakMessage = (streakInDays: number) => {
        if (streakInDays >= 2 && streakInDays <= 7) {
            return "You were on fire!";
        } else if (streakInDays > 7 && streakInDays <= 14) {
            return "You were locked in for a while there!";
        } else if (streakInDays >= 15) {
            return "You are simply BUILT DIFFERENT.";
        }
    };

    const getExtraRemark = (streakInDays: number) => {
        if (streakInDays >= 2 && streakInDays <= 7) {
            return "(those are rookie numbers)";
        } else if (streakInDays > 7 && streakInDays <= 14) {
            return "(but i want to see a higher number next year)";
        } else if (streakInDays >= 15) {
            return "(addict)";
        }
    };

    const gameData = useMemo(
        () =>
            wrapped.gamesData.find(
                (gameData) => gameData.display === mostPlayedGame,
            ),
        [mostPlayedGame, wrapped.gamesData],
    );

    // useHeartsAnimation({
    //     heartRef: heartContainerRef,
    //     containerRef: cardRef,
    //     shouldShowHearts: Boolean(mostPlayedGame),
    // });

    const totalPlaytime = useMemo(() => {
        let totalPlaytime = 0;

        streakPlaytimes.forEach((playtime) => {
            totalPlaytime += playtime.total;
        });

        return totalPlaytime;
    }, [streakPlaytimes]);

    const finishedRunsDuringStreak = useMemo(() => {
        const runs: {
            game: string;
            category: string;
            endedAt: string;
            time: number;
        }[] = [];

        wrapped.runData.forEach((run) => {
            run.runs.forEach((finishedRun) => {
                const endedAt = finishedRun.endedAt.split("T")[0];

                if (
                    endedAt >= wrapped.streak.start &&
                    endedAt <= wrapped.streak.end
                ) {
                    runs.push({
                        endedAt,
                        time: parseInt(finishedRun.time),
                        game: run.game,
                        category: run.category,
                    });
                }
            });
        });

        return runs.sort((a, b) => {
            return a.endedAt > b.endedAt ? 1 : -1;
        });
    }, [wrapped.runData, wrapped.streak]);

    const pbsDuringStreak = useMemo(() => {
        const runs: {
            game: string;
            category: string;
            endedAt: string;
            time: number;
        }[] = [];

        wrapped.pbsAndGolds.forEach((run) => {
            run.pbs.forEach((finishedRun) => {
                const endedAt = new Date(finishedRun.endedAt)
                    .toISOString()
                    .split("T")[0];

                if (
                    endedAt >= wrapped.streak.start &&
                    endedAt <= wrapped.streak.end
                ) {
                    runs.push({
                        endedAt,
                        time: finishedRun.time,
                        game: run.game,
                        category: run.category,
                    });
                }
            });
        });

        return runs;
    }, [wrapped.pbsAndGolds, wrapped.streak.end, wrapped.streak.start]);

    return (
        <SectionWrapper>
            <SectionTitle
                title={
                    <>
                        Your longest daily streak for runs was{" "}
                        <WrappedCounter
                            id="streak-in-days"
                            end={streakInDays}
                        />{" "}
                        days
                    </>
                }
                subtitle={getStreakMessage(streakInDays)}
                extraRemark={getExtraRemark(streakInDays)}
            />
            <SectionBody>
                <Row className="w-100">
                    <Col
                        xl={3}
                        lg={0}
                        className="d-none d-sm-none d-md-none d-lg-none d-xl-flex"
                    >
                        <div className="flex-center align-items-center">
                            <div className="row justify-content-center">
                                <div className="col-auto position-relative">
                                    <div
                                        // @ts-expect-error Legacy type issue with Refs that's resolved in React 19
                                        ref={heartContainerRef}
                                        className="position-absolute w-100 h-100"
                                        style={{
                                            pointerEvents: "none",
                                            zIndex: 1,
                                        }}
                                    />
                                    <div
                                        // @ts-expect-error Legacy type issue with Refs that's resolved in React 19
                                        ref={cardRef}
                                        className={`card h-100 ${styles.heartbeatContainer}`}
                                    >
                                        <div className="card-header fw-bold">
                                            Your most played game during your
                                            streak...
                                        </div>
                                        <div className="game-image">
                                            {gameData && "noimage" && (
                                                <GameImage
                                                    alt={gameData.display}
                                                    src={gameData.image}
                                                    quality="hd"
                                                    autosize
                                                />
                                            )}
                                        </div>
                                        <div className="card-footer">
                                            <h3
                                                className="fw-bold"
                                                style={{
                                                    // eslint-disable-next-line sonarjs/no-duplicate-string
                                                    color: "var(--bs-link-color)",
                                                    textDecoration: "underline",
                                                    textDecorationColor:
                                                        "var(--bs-secondary)",
                                                }}
                                            >
                                                {mostPlayedGame}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col xl={5}>
                        <i>Some really awesome cool stats</i>
                        <div className="table-responsive">
                            <Table className="table table_custom">
                                <tbody>
                                    <StreakStatItem
                                        stat={
                                            finishedRunsDuringStreak.length +
                                            " finished runs"
                                        }
                                        explanation={
                                            <>
                                                You finished{" "}
                                                <span
                                                    style={{
                                                        color: "var(--bs-link-color)",
                                                    }}
                                                >
                                                    {
                                                        finishedRunsDuringStreak.length
                                                    }{" "}
                                                    runs
                                                </span>{" "}
                                                during your streak.
                                            </>
                                        }
                                    />
                                    <StreakStatItem
                                        stat={pbsDuringStreak.length + " PBs"}
                                        explanation={
                                            <>
                                                You got{" "}
                                                <span
                                                    style={{
                                                        color: "var(--bs-secondary)",
                                                    }}
                                                >
                                                    {pbsDuringStreak.length} PBs
                                                </span>{" "}
                                                during your streak.
                                            </>
                                        }
                                    />
                                    <StreakStatItem
                                        stat={
                                            <DurationToFormatted
                                                duration={totalPlaytime}
                                            />
                                        }
                                        explanation={
                                            <>
                                                You played for a total of{" "}
                                                <DurationToFormatted
                                                    duration={totalPlaytime}
                                                />{" "}
                                                during this streak.
                                            </>
                                        }
                                    />
                                    <StreakStatItem
                                        stat={
                                            <DurationToFormatted
                                                duration={
                                                    totalPlaytime /
                                                    wrapped.streak.length
                                                }
                                            />
                                        }
                                        explanation={
                                            <>
                                                That means you ran{" "}
                                                <DurationToFormatted
                                                    duration={
                                                        totalPlaytime /
                                                        wrapped.streak.length
                                                    }
                                                />{" "}
                                                on average per day.
                                            </>
                                        }
                                    />
                                    <StreakStatItem
                                        stat={getDateAsMonthDay(
                                            new Date(wrapped.streak.start),
                                        )}
                                        explanation="Was when you started your epic streak."
                                    />
                                    <StreakStatItem
                                        stat={getDateAsMonthDay(
                                            new Date(wrapped.streak.end),
                                        )}
                                        explanation="Was when your streak unfortunately came to an end."
                                    />
                                </tbody>
                            </Table>
                        </div>
                    </Col>
                    <Col
                        xl={4}
                        className="overflow-y-auto"
                        style={{
                            maxHeight: "60vh",
                        }}
                    >
                        <i>Finished runs during your sick streak below</i>
                        <Table className="table table_custom text-start">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Run</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {finishedRunsDuringStreak.map((run) => {
                                    return (
                                        <tr key={run.endedAt}>
                                            <td>
                                                <div className="h5 text-truncate">
                                                    {getDateAsMonthDay(
                                                        new Date(run.endedAt),
                                                    )}
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    maxWidth: "18rem",
                                                }}
                                            >
                                                <div
                                                    className="h5 mb-1 mt-0 text-truncate"
                                                    style={{
                                                        color: "var(--bs-link-color)",
                                                    }}
                                                >
                                                    {run.game}
                                                </div>
                                                <div className="fst-italic">
                                                    {run.category}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="h5">
                                                    <DurationToFormatted
                                                        duration={run.time}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Col>
                </Row>
            </SectionBody>
        </SectionWrapper>
    );
};

const StreakStatItem = ({
    stat,
    explanation,
}: {
    stat: ReactNode;
    explanation: ReactNode;
}) => {
    return (
        <tr>
            <td className="h4 text-truncate">
                <b>{stat}</b>
            </td>
            <td className="align-bottom h6">{explanation}</td>
        </tr>
    );
};
