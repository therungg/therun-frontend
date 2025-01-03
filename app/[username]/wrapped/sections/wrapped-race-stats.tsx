import { memo } from "react";
import { WrappedWithData } from "../wrapped-types";
import { WrappedCounter } from "../wrapped-counter";
import { Row } from "react-bootstrap";
import { SectionWrapper } from "./section-wrapper";
import { SectionBody } from "./section-body";

interface WrappedRaceStatsProps {
    wrapped: WrappedWithData;
}
export const WrappedRaceStats = memo<WrappedRaceStatsProps>(({ wrapped }) => {
    const raceData = wrapped.raceData;
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
                <Row></Row>
            </SectionBody>
        </SectionWrapper>
    );
});
WrappedRaceStats.displayName = "WrappedRaceStats";
