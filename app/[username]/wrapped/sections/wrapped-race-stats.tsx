import { memo, useMemo } from "react";
import { WrappedWithData } from "../wrapped-types";
import { WrappedCounter } from "../wrapped-counter";
import { Col, Row } from "react-bootstrap";
import { SectionWrapper } from "./section-wrapper";
import { SectionBody } from "./section-body";
import { GameImage } from "~src/components/image/gameimage";

interface WrappedRaceStatsProps {
    wrapped: WrappedWithData;
}
export const WrappedRaceStats = memo<WrappedRaceStatsProps>(({ wrapped }) => {
    const raceData = wrapped.raceData;
    const racesByGameAndCategory = useMemo(() => {
        return raceData.categoryStats.reduce<
            Record<string, WrappedWithData["raceData"]["categoryStats"][number]>
        >((result, race) => {
            const [game, category] = race.displayValue.split("#");
            return { ...result, [`${game}#${category}`]: race };
        }, {});
    }, [raceData]);
    const top3MostRacedGames = useMemo(() => {
        const gameRaceCounts = Object.entries(racesByGameAndCategory).reduce<
            Record<string, number>
        >((result, [title, race]) => {
            if (!result[title]) result[title] = 0;
            return {
                ...result,
                [title]:
                    result[title] +
                    (race as (typeof raceData.categoryStats)[number])
                        .totalRaces,
            };
        }, {});
        return Object.entries(gameRaceCounts)
            .sort(([, a], [, b]) => a - b)
            .map(([key]) => racesByGameAndCategory[key])
            .slice(0, 3);
    }, [raceData, racesByGameAndCategory]);
    console.log({ top3MostRacedGames });
    return (
        <SectionWrapper>
            <SectionBody>
                <Row>
                    {raceData.globalStats.totalRaces === 1 ? (
                        <>
                            <p>
                                This year you only participated in 1 race! Maybe
                                we'll do more next year!
                            </p>
                            <p>Let's dive a bit deeper into it.</p>
                        </>
                    ) : (
                        <p className="flex-center display-4">
                            <span>
                                This year you participated in{" "}
                                <WrappedCounter
                                    id="total-races-count"
                                    end={raceData.globalStats.totalRaces}
                                />{" "}
                                races!
                            </span>
                        </p>
                    )}
                </Row>
                <Row>
                    Your top 3 most raced games and categories were
                    {top3MostRacedGames.map((race) => {
                        return (
                            <Col key={race.displayValue} className="game-image">
                                {race &&
                                    race.image &&
                                    race.image !== "noimage" && (
                                        <GameImage
                                            alt={race.displayValue}
                                            src={race.image}
                                            quality="hd"
                                            height={132 * 5}
                                            width={99 * 5}
                                        />
                                    )}
                            </Col>
                        );
                    })}
                </Row>
            </SectionBody>
        </SectionWrapper>
    );
});
WrappedRaceStats.displayName = "WrappedRaceStats";
