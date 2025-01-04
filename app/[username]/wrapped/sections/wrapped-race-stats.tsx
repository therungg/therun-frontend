import { memo, useMemo } from "react";
import { WrappedWithData } from "../wrapped-types";
import { WrappedCounter } from "../wrapped-counter";
import { Col, Row } from "react-bootstrap";
import { SectionWrapper } from "./section-wrapper";
import { SectionBody } from "./section-body";
import { GameImage } from "~src/components/image/gameimage";
import { SectionTitle } from "./section-title";

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
            .sort(([, a], [, b]) => b - a)
            .map(([key]) => racesByGameAndCategory[key])
            .slice(0, 3);
    }, [raceData, racesByGameAndCategory]);
    const { title, subtitle, extraRemark } = useMemo(() => {
        if (raceData.globalStats.totalRaces === 1) {
            return {
                title: "This year you only participated in 1 race!",
                subtitle: "Maybe we'll do more next year!",
                extraRemark: "Let's dive a bit deeper into it.",
            };
        }

        return {
            title: (
                <>
                    This year you participated in{" "}
                    <WrappedCounter
                        id="total-races-count"
                        end={raceData.globalStats.totalRaces}
                    />{" "}
                    races!
                </>
            ),
            subtitle: "TODO? joey write something here",
            extraRemark: "other todo? please add something here joey i beg you",
        };
    }, [raceData.globalStats.totalRaces]);
    return (
        <SectionWrapper>
            <SectionTitle
                title={title}
                subtitle={subtitle}
                extraRemark={extraRemark}
            />
            <SectionBody>
                Your top{" "}
                {top3MostRacedGames.length === 1
                    ? "most raced game and category"
                    : `${top3MostRacedGames.length} most raced games and categories`}{" "}
                were
                <Row>
                    {top3MostRacedGames.map((race, index) => {
                        const [game, category] = race.displayValue.split("#");
                        return (
                            <Col key={race.displayValue}>
                                <div className="card">
                                    <div className="card-header d-flex align-items-center justify-content-between">
                                        <span className="h4 mb-0">
                                            #{index + 1}
                                        </span>
                                        <span>
                                            {race.totalRaces === 1
                                                ? "1 race"
                                                : `${race.totalRaces} races`}
                                        </span>
                                    </div>
                                    <GameImage
                                        alt={race.displayValue}
                                        src={race.image}
                                        quality="hd"
                                        className="card-img-top"
                                        autosize
                                    />
                                    <div className="card-body">
                                        <h5 className="card-title">
                                            {game} - {category}
                                        </h5>
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
WrappedRaceStats.displayName = "WrappedRaceStats";
