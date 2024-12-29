import { useEffect, useRef } from "react";
import { WrappedWithData } from "../wrapped-types";
import CountUp from "react-countup";
import { GameImage } from "~src/components/image/gameimage";

const RenderWrappedStreak = ({ wrapped }: { wrapped: WrappedWithData }) => {
    const streakInDays = wrapped.streak.length;
    const streakStart = wrapped.streak.start;
    const streakEnd = wrapped.streak.end;
    const sparkContainerRef = useRef(null);
    const cardRef = useRef(null);

    console.log(streakInDays, streakStart, streakEnd);

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

    function getStreakPlaytimes(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        playtimePerDayMap: any,
        streakStart: string,
        streakEnd: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any {
        const streakDates = getDatesInRange(streakStart, streakEnd);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const streakPlaytimes: any[] = [];

        streakDates.forEach((date) => {
            if (playtimePerDayMap[date]) {
                streakPlaytimes.push(playtimePerDayMap[date]);
            }
        });

        return streakPlaytimes;
    }

    const streakPlaytimes = getStreakPlaytimes(
        wrapped.playtimeData.playtimePerDayMap,
        wrapped.streak.start,
        wrapped.streak.end,
    );

    console.log(streakPlaytimes);

    const gameFrequencyMap: { [game: string]: number } = {};
    //let totalGamesPlayed = 0;

    Object.values(streakPlaytimes).forEach((day) => {
        Object.keys(day.perGame).forEach((game) => {
            gameFrequencyMap[game] = (gameFrequencyMap[game] || 0) + 1;
            //totalGamesPlayed++;
        });
    });

    const sortedGameFrequencyMap = Object.entries(gameFrequencyMap).sort(
        (a, b) => b[1] - a[1],
    );

    let mostPlayedGame: string | undefined = undefined;

    if (sortedGameFrequencyMap.length === 1) {
        mostPlayedGame = sortedGameFrequencyMap[0][0];
    }

    if (sortedGameFrequencyMap.length > 1) {
        // Grab the first indexed game, and compare its playcount against the next index.
        // If both match, we can assume there is no top game. If not, there is a top game.
        const [topGame, topGameCount] = sortedGameFrequencyMap[0];
        const [_, compareGameCount] = sortedGameFrequencyMap[1];

        if (topGameCount > compareGameCount) {
            mostPlayedGame = topGame;
        }
    }

    const getStreakMessage = (streakInDays: number) => {
        if (streakInDays >= 2 && streakInDays <= 7) {
            return "You were on fire!";
        } else if (streakInDays > 7 && streakInDays <= 14) {
            return "You were locked in for a while there!";
        } else if (streakInDays >= 15) {
            return "You are simply BUILT DIFFERENT.";
        }
    };

    const gameData = wrapped.gamesData.find(
        (gameData) => gameData.display === mostPlayedGame,
    );

    useEffect(() => {
        if (mostPlayedGame && sparkContainerRef.current && cardRef.current) {
            const createSpark = () => {
                const spark = document.createElement("div");
                spark.className = "position-absolute";

                // Randomize ember sizes
                const size = 2 + Math.random() * 3;
                spark.style.width = `${size}px`;
                spark.style.height = `${size}px`;

                // Create ember-like colors
                const colors = [
                    "#FF4500",
                    "#FF6B00",
                    "#FF8C00",
                    "#FFD700",
                    "#FFFFE0",
                    "#FFF5E1",
                ];
                const color = colors[Math.floor(Math.random() * colors.length)];
                spark.style.backgroundColor = color;
                spark.style.borderRadius = "50%";
                spark.style.boxShadow = `0 0 ${size * 2}px ${color}`;
                sparkContainerRef.current.appendChild(spark);

                const rect = cardRef.current.getBoundingClientRect();
                const startX = Math.random() * rect.width;
                const startY = rect.height;

                gsap.set(spark, { x: startX, y: startY });

                gsap.to(spark, {
                    x: startX + (Math.random() - 0.5) * 200, // Increase horizontal randomness
                    y: startY - 300 - Math.random() * 300,
                    rotation: Math.random() * 360, // Optional rotation for dynamic movement
                    scale: Math.random() * 0.8 + 0.3,
                    opacity: 0,
                    duration: 2 + Math.random() * 1,
                    ease: "sine.inOut",
                    onComplete: () => {
                        spark.remove();
                    },
                });
            };

            const glowAnimation = gsap.fromTo(
                cardRef.current,
                { boxShadow: "0 0 20px #FF6B00" },
                {
                    boxShadow: "0 0 30px #FF4500",
                    repeat: -1,
                    yoyo: true,
                    duration: 1.5,
                    ease: "sine.inOut",
                },
            );

            const interval = setInterval(() => {
                for (let i = 0; i < 3; i++) {
                    createSpark();
                }
            }, 50);

            return () => {
                clearInterval(interval);
                glowAnimation.kill();
            };
        }
    }, [mostPlayedGame]);

    return (
        <div>
            <p className="flex-center display-4 mb-2">
                <span>
                    Your longest daily streak for runs was{" "}
                    <CountUp end={streakInDays} duration={4} /> days!
                </span>
            </p>
            <p className="flex-center display-6 mb-5">
                {getStreakMessage(streakInDays)}
            </p>
            <div className="row justify-content-center">
                <div className="col-auto position-relative">
                    <div
                        ref={sparkContainerRef}
                        className="position-absolute w-100 h-100"
                        style={{ pointerEvents: "none", zIndex: 1 }}
                    />
                    <div
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
                        was your favourite game during this streak period.
                    </p>
                    <p className="fs-small">cringe</p>
                </div>
            </div>
        </div>
    );
};

export default RenderWrappedStreak;
