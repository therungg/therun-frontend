import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { Col, Row } from "react-bootstrap";
import CountUp from "react-countup";
import { DurationToFormatted } from "~src/components/util/datetime";
import { GameImage } from "~src/components/image/gameimage";
import { ScrollDown } from "~src/components/scroll-down";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface RenderFinishedWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

// Todo:: actually render this shit
export const RenderFinishedWrapped = ({
    wrapped,
    user,
}: RenderFinishedWrappedProps) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!wrapped.hasEnoughRuns) return;

        const sections = gsap.utils.toArray(".animated-section");

        ScrollTrigger.defaults({
            //markers: true,
        });

        sections.forEach((section, _) => {
            ScrollTrigger.create({
                trigger: section,
                pin: true,
                scrub: 0.5,
            });
        });

        return () => {
            ScrollTrigger.getAll().forEach((st) => st.kill());
        };
    }, [wrapped.hasEnoughRuns]);

    if (!wrapped.hasEnoughRuns) {
        return (
            <div>
                Unfortunately, there is not enough data on your account to
                generate a Wrapped. If you think this is incorrect, please
                contact us on Discord.
            </div>
        );
    }

    console.log(wrapped.playtimeData);

    return (
        <div ref={containerRef}>
            <section>
                <div className="flex-center flex-column align-items-center min-vh-100">
                    <p className="text-center flex-center align-items-center display-2 mb-0">
                        You had a great 2024!
                    </p>
                    <WrappedTitle user={user} />
                    <p className="text-center display-6 mb-5">
                        Let's see your stats for this year!
                    </p>
                    <ScrollDown />
                </div>
            </section>

            <section className="animated-section">
                <div className="flex-center flex-column align-items-center min-vh-100">
                    <RenderTotalStatsCompliment wrapped={wrapped} />
                </div>
            </section>

            <section className="animated-section">
                <div className="text-center min-vh-100">
                    <RenderTopGames wrapped={wrapped} />
                </div>
            </section>

            <section className="animated-section">
                <div className="flex-center flex-column align-items-center min-vh-100">
                    <RenderStreak wrapped={wrapped} />
                </div>
            </section>

            <section className="animated-section">
                <div className="flex-center flex-column align-items-center min-vh-100">
                    <p className="text-center flex-center align-items-center display-2 mb-4">
                        That's a wrap on 2024!
                    </p>
                    <p className="text-center display-6 mb-5">
                        Thanks for spending it with The Run. We can't wait to
                        see what you do in 2025!
                    </p>
                    <RenderSocialImages wrapped={wrapped} />
                </div>
            </section>
        </div>
    );
};

const RenderTotalStatsCompliment = ({
    wrapped,
}: {
    wrapped: WrappedWithData;
}) => {
    return (
        <div>
            <Row className="mb-5">
                <Col>
                    <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                        <span className="display-1 fw-semibold text-decoration-underline">
                            <CountUp end={wrapped.totalRuns} duration={4} />
                        </span>
                    </div>
                    <div className="flex-center h4">
                        <div>
                            This year, you started a total of{" "}
                            <b>{wrapped.totalRuns}</b> runs!
                        </div>
                    </div>
                </Col>
                <Col>
                    <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                        <span className="display-1 fw-semibold text-decoration-underline">
                            <CountUp
                                end={wrapped.totalFinishedRuns}
                                duration={4}
                            />
                        </span>
                    </div>
                    <div className="flex-center h4">
                        <div>
                            Of these <b>{wrapped.totalRuns}</b> runs, you
                            finished <b>{wrapped.totalFinishedRuns}</b>
                        </div>
                    </div>
                </Col>
                <Col>
                    <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                        <span className="display-1 fw-semibold text-decoration-underline">
                            <CountUp
                                end={
                                    (wrapped.totalFinishedRuns /
                                        wrapped.totalRuns) *
                                    100 *
                                    100
                                }
                                duration={2}
                                formattingFn={(value: number) => {
                                    return (value / 100).toFixed(2) + "%";
                                }}
                            />
                        </span>
                    </div>
                    <div className="flex-center h4">
                        <div>
                            That gives you a finish percentage of{" "}
                            <b>
                                {" "}
                                {(
                                    (wrapped.totalFinishedRuns /
                                        wrapped.totalRuns) *
                                    100
                                ).toFixed(2)}
                                %
                            </b>
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

const RenderTopGames = ({ wrapped }: { wrapped: WrappedWithData }) => {
    const topGames =
        wrapped.playtimeData.playtimePerYearMap[new Date().getFullYear()]
            .perGame;

    console.log(topGames);

    const gameEntries = Object.entries(topGames).map(([key, value]) => {
        return { game: key, total: value.total };
    });

    gameEntries.sort((a, b) => b.total - a.total);

    const top3Games = gameEntries.slice(0, 3);

    return (
        <div>
            {gameEntries.length > 1 && (
                <>
                    <p className="flex-center display-4 mb-2">
                        <span>
                            This year, you did runs for{" "}
                            <CountUp end={gameEntries.length} duration={4} />{" "}
                            games.
                        </span>
                    </p>
                    <p className="flex-center display-6 mb-1">
                        Here are your favourites.
                    </p>
                    <p className="flex-center fs-small opacity-25">
                        (actually, they might be your least favourite. but you
                        played them a lot, so hey, that's on you.)
                    </p>
                </>
            )}
            {gameEntries.length === 1 && (
                <>
                    <p className="flex-center display-4 mb-2">
                        <span>This year, you only ran one single game.</span>
                    </p>
                    <p className="flex-center display-6 mb-1">
                        I'm not going to judge you on that
                    </p>
                    <p className="flex-center fs-small opacity-25">
                        (but i designed this section to show multiple games, so
                        you kind of ruined that for me)
                    </p>
                </>
            )}
            <Row className="row-cols-1 row-cols-md-2 row-cols-xl-3 mw-80 mx-auto pt-5 gx-3 gy-5 g-md-5">
                {top3Games.map(({ game, total }, i) => {
                    const gameData = wrapped.gamesData.find(
                        (gameData) => gameData.display === game,
                    );

                    return (
                        <Col key={i}>
                            <div className="d-flex flex-column bg-body-secondary bg-opacity-50 h-100 gap-3 justify-content-between rounded-3 overflow-hidden">
                                <div className="game-image flex-fill bg-body-secondary">
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
                                <div className="h4 text-center m-0 px-2 pt-1 pb-4">
                                    <div className="mb-3 fs-xx-large">
                                        #{i + 1}
                                    </div>
                                    <div className="mb-2">{game}</div>
                                    <div
                                        className={
                                            `fs-smaller ` +
                                            (i === 0
                                                ? `text-secondary`
                                                : `text-primary`)
                                        }
                                    >
                                        <DurationToFormatted duration={total} />
                                    </div>
                                </div>
                            </div>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};

const RenderStreak = ({ wrapped }: { wrapped: WrappedWithData }) => {
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

const RenderSocialImages = ({ wrapped }: { wrapped: WrappedWithData }) => {
    return <>{wrapped.user}</>;
};
