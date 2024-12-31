import { Col } from "react-bootstrap";
import { WrappedCounter } from "../wrapped-counter";
import { memo } from "react";
import { UseCountUpProps } from "react-countup/build/useCountUp";

interface SectionStatsCardProps {
    stat: number;
    statDescription: React.ReactNode;
    statFormatter?: UseCountUpProps["formattingFn"];
}
export const SectionStatsCard = memo<SectionStatsCardProps>(
    ({ stat, statDescription, statFormatter }) => {
        return (
            <Col>
                <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-4 py-5 rounded-3">
                    <span className="display-1 fw-semibold text-decoration-underline">
                        <WrappedCounter
                            id="total-runs-count"
                            end={stat}
                            formattingFn={statFormatter}
                        />
                    </span>
                </div>
                <div className="flex-center h4">
                    <div>{statDescription}</div>
                </div>
            </Col>
        );
    },
);
SectionStatsCard.displayName = "SectionStatsCard";
