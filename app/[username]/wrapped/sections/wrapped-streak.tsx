import { useMemo, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import CountUp from "react-countup";
import { GameImage } from "~src/components/image/gameimage";
import { TotalStat } from "~src/components/user/stats";
import { useSparksAnimation } from "../use-sparks-animation.hook";

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

    return (
        <>
            <h2 className="mb-4">
                Your longest daily streak for runs was{" "}
                <CountUp end={streakInDays} duration={4} /> days!
            </h2>
            <div className="flex-center align-items-center min-vh-100 overflow-x-hidden">
                <div className="d-flex align-items-center display-4">
                    <>
                        <p className="flex-center display-6 mb-5">
                            {getStreakMessage(streakInDays)}
                        </p>
                        <div className="row justify-content-center">
                            <div className="col-auto position-relative">
                                <div
                                    // @ts-expect-error Legacy type issue with Refs that's resolved in React 19
                                    ref={sparkContainerRef}
                                    className="position-absolute w-100 h-100"
                                    style={{ pointerEvents: "none", zIndex: 1 }}
                                />
                                <div
                                    // @ts-expect-error Legacy type issue with Refs that's resolved in React 19
                                    ref={cardRef}
                                    className="d-flex flex-column bg-warning bg-opacity-75 rounded-3 overflow-hidden"
                                >
                                    <div className="game-image">
                                        {gameData &&
                                            gameData.image &&
                                            gameData.image !== "noimage" && (
                                                <GameImage
                                                    alt={gameData.display}
                                                    src={gameData.image}
                                                    quality="hd"
                                                    height={132 * 4.5}
                                                    width={99 * 4.5}
                                                />
                                            )}
                                    </div>
                                </div>
                            </div>
                            <div className="col-auto">
                                <p className="display-6">{mostPlayedGame}</p>
                                <p className="lead">
                                    was your favourite game during this streak
                                    period.
                                </p>
                                <p className="fs-small">cringe</p>
                            </div>
                        </div>
                    </>
                </div>
            </div>
        </>
    );
};
