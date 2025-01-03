import { ReactNode, useMemo, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import { GameImage } from "~src/components/image/gameimage";
import { TotalStat } from "~src/components/user/stats";
import { useSparksAnimation } from "../use-sparks-animation.hook";
import { WrappedCounter } from "../wrapped-counter";
import { SectionTitle } from "~app/[username]/wrapped/sections/section-title";
import { SectionWrapper } from "~app/[username]/wrapped/sections/section-wrapper";
import { SectionBody } from "~app/[username]/wrapped/sections/section-body";
import {
    DurationToFormatted,
    getDateAsMonthDay,
} from "~src/components/util/datetime";
import { Col, Row } from "react-bootstrap";

export const WrappedStreak = ({ wrapped }: { wrapped: WrappedWithData }) => {
    const streakInDays = wrapped.streak.length;
    const sparkContainerRef = useRef<HTMLElement>(null);
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

    const gameData = useMemo(
        () =>
            wrapped.gamesData.find(
                (gameData) => gameData.display === mostPlayedGame,
            ),
        [mostPlayedGame, wrapped.gamesData],
    );

    useSparksAnimation({
        sparkRef: sparkContainerRef,
        containerRef: cardRef,
        shouldShowSparks: Boolean(mostPlayedGame),
    });

    const totalPlaytime = useMemo(() => {
        let totalPlaytime = 0;

        streakPlaytimes.forEach((playtime) => {
            totalPlaytime += playtime.total;
        });

        return totalPlaytime;
    }, [streakPlaytimes]);

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
            />
            <SectionBody>
                <Row>
                    <Col>
                        <div className="flex-center align-items-center">
                            <div className="row justify-content-center">
                                <div className="col-auto position-relative">
                                    <div
                                        // @ts-expect-error Legacy type issue with Refs that's resolved in React 19
                                        ref={sparkContainerRef}
                                        className="position-absolute w-100 h-100"
                                        style={{
                                            pointerEvents: "none",
                                            zIndex: 1,
                                        }}
                                    />
                                    <div
                                        // @ts-expect-error Legacy type issue with Refs that's resolved in React 19
                                        ref={cardRef}
                                        className="d-flex flex-column bg-warning bg-opacity-75 rounded-3 overflow-hidden"
                                    >
                                        <div className="game-image">
                                            {gameData &&
                                                gameData.image &&
                                                gameData.image !==
                                                    "noimage" && (
                                                    <GameImage
                                                        alt={gameData.display}
                                                        src={gameData.image}
                                                        quality="sd"
                                                        height={132 * 4.5}
                                                        width={99 * 4.5}
                                                    />
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <div className="table-responsive mt-4">
                            <table className="table">
                                <tbody>
                                    <StreakStatItem
                                        stat={mostPlayedGame}
                                        explanation="Was your favorite game while you were grinding."
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
                            </table>
                        </div>
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
            <td className="display-6">{stat}</td>
            <td className="align-bottom">{explanation}</td>
        </tr>
    );
};
