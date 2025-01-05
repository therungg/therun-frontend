import { memo, useMemo } from "react";
import { DurationToFormatted } from "~src/components/util/datetime";
import { GameImage } from "~src/components/image/gameimage";
import { Col, Row } from "react-bootstrap";
import { WrappedWithData } from "../wrapped-types";
import { WrappedCounter } from "../wrapped-counter";
import { SectionWrapper } from "./section-wrapper";
import { SectionBody } from "./section-body";
import { SectionTitle } from "./section-title";

interface WrappedTopGamesProps {
    wrapped: WrappedWithData;
}

export const WrappedTopGames = memo<WrappedTopGamesProps>(({ wrapped }) => {
    const topGames = useMemo(() => {
        return wrapped.playtimeData.playtimePerYearMap[wrapped.year].perGame;
    }, [wrapped.playtimeData.playtimePerYearMap, wrapped.year]);

    console.log(topGames);

    const gameEntries = useMemo(() => {
        return Object.entries(topGames)
            .map(([key, value]) => {
                return { game: key, total: value.total };
            })
            .sort((a, b) => b.total - a.total);
    }, [topGames]);

    const top3Games = gameEntries.slice(0, 3);
    const { title, subtitle, extraRemark } = useMemo(() => {
        if (gameEntries.length > 1) {
            return {
                title: (
                    <>
                        {" "}
                        This year, you did runs for{" "}
                        <WrappedCounter
                            id="game-entries-count"
                            end={gameEntries.length}
                        />{" "}
                        games.
                    </>
                ),
                subtitle: "Here are your favourites.",
                extraRemark:
                    "(actually, they might be your least favourite. but you played them a lot, so hey, that's on you.)",
            };
        }

        return {
            title: <span>This year, you only ran one single game.</span>,
            subtitle: "I'm not going to judge you on that",
            extraRemark:
                "(but i designed this section to show multiple games, so you kind of ruined that for me)",
        };
    }, [gameEntries]);

    console.log({ wrapped: wrapped.gamesData });
    return (
        <SectionWrapper>
            <SectionTitle
                title={title}
                subtitle={subtitle}
                extraRemark={extraRemark}
            />
            <SectionBody>
                <Row className="row-cols-1 row-cols-md-2 row-cols-xl-3 mx-auto pt-5 gx-3 gy-5 g-md-5">
                    {top3Games.map(({ game, total }, i) => {
                        const gameData = wrapped.gamesData.find(
                            (gameData) => gameData.display === game,
                        );

                        return (
                            <Col key={`${gameData?.display}-${i}`}>
                                <div className="card">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <span className="h4 mb-0">
                                            #{i + 1}
                                        </span>
                                        <DurationToFormatted duration={total} />
                                    </div>
                                    <GameImage
                                        alt={gameData?.display}
                                        src={gameData?.image || ""}
                                        quality="hd"
                                        className="card-img-top"
                                        autosize
                                    />
                                    <div className="card-body">
                                        <div className="card-title h2 fw-bold">
                                            {game}
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            </SectionBody>
        </SectionWrapper>
    );
});
WrappedTopGames.displayName = "WrappedTopGames";
