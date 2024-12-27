import { WrappedWithData } from "~app/[username]/wrapped/wrapped-types";
import { WrappedTitle } from "~app/[username]/wrapped/wrapped-title";
import { Col, Row } from "react-bootstrap";
import CountUp from "react-countup";
import { DurationToFormatted } from "~src/components/util/datetime";
import { GameImage } from "~src/components/image/gameimage";

interface RenderFinishedWrappedProps {
    user: string;
    wrapped: WrappedWithData;
}

// Todo:: actually render this shit
export const RenderFinishedWrapped = ({
    wrapped,
    user,
}: RenderFinishedWrappedProps) => {
    if (!wrapped.hasEnoughRuns) {
        return (
            <div>
                Unfortunately, there is not enough data on your account to
                generate a Wrapped. If you think this is incorrect, please
                contact us on Discord.
            </div>
        );
    }

    return (
        <div>
            <WrappedTitle user={user} />
            <p className="flex-center display-4 mb-2">You had a great 2024.</p>
            <p className="flex-center display-6 mb-5">
                Let's see your stats for this year!
            </p>
            <hr className="mb-5" />
            <RenderTotalStatsCompliment wrapped={wrapped} />
            <hr className="mb-5" />
            <RenderTopGames wrapped={wrapped} />
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
            <Row>
                {top3Games.map(({ game, total }, i) => {
                    const gameData = wrapped.gamesData.find(
                        (gameData) => gameData.display === game,
                    );

                    return (
                        <Col className="flex-center" key={i}>
                            <div>
                                <div className="flex-center h4 mb-3">
                                    <span>
                                        #{i + 1} - {game} (
                                        <DurationToFormatted duration={total} />
                                        )
                                    </span>
                                </div>
                                {gameData &&
                                    gameData.image &&
                                    gameData.image !== "noimage" && (
                                        <div className="flex-center">
                                            <GameImage
                                                alt={gameData.display}
                                                src={gameData.image}
                                                quality="hd"
                                                height={132 * 2.5}
                                                width={99 * 2.5}
                                            />
                                        </div>
                                    )}
                            </div>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};
