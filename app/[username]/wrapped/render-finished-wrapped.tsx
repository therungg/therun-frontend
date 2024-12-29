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
import RenderWrappedStreak from "./sections/render-wrapped-streak";
import RenderWrappedSocialImages from "./sections/render-wrapped-social-images";

gsap.registerPlugin(ScrollTrigger);

interface RenderFinishedWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

export const RenderFinishedWrapped = ({
    wrapped,
    user,
}: RenderFinishedWrappedProps) => {
    const containerRef = useRef(null);

    useEffect(() => {
        if (!wrapped.hasEnoughRuns) return;

        const sections = gsap.utils.toArray(".animated-section");

        ScrollTrigger.defaults({
            markers: true,
            pin: true,
            scrub: 0.5,
        });

        sections.forEach((section, _) => {
            ScrollTrigger.create({
                trigger: section,
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
            <section className="flex-center flex-column min-vh-100-no-header text-center">
                <p className="display-2 mb-0">You had a great 2024!</p>
                <WrappedTitle user={user} />
                <p className="display-6 mb-5">
                    Let's see your stats for this year!
                </p>
                <ScrollDown />
            </section>

            <section className="animated-section text-center flex-center align-items-center min-vh-100">
                <RenderTotalStatsCompliment wrapped={wrapped} />
            </section>

            <section className="animated-section flex-center flex-column align-items-center min-vh-100">
                <RenderWrappedStreak wrapped={wrapped} />
            </section>

            <section className="animated-section text-center min-vh-100">
                <RenderTopGames wrapped={wrapped} />
            </section>

            <section className="animated-section flex-center flex-column align-items-center min-vh-100">
                <p className="text-center flex-center align-items-center display-2 mb-4">
                    That's a wrap on 2024!
                </p>
                <p className="text-center display-6 mb-5">
                    Thanks for spending it with The Run. We can't wait to see
                    what you do in 2025!
                </p>
                <RenderWrappedSocialImages wrapped={wrapped} />
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
            <Row className="row-cols-1 row-cols-md-2 row-cols-xl-3 mx-auto pt-5 gx-3 gy-5 g-md-5">
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
                                                height={132 * 5}
                                                width={99 * 5}
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
