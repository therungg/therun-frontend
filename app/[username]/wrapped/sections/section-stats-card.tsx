import { Col } from "react-bootstrap";
import { WrappedCounter } from "../wrapped-counter";
import { CSSProperties, memo } from "react";
import { UseCountUpProps } from "react-countup/build/useCountUp";

interface SectionStatsCardProps {
    stat: number;
    statDescription: React.ReactNode;
    statFormatter?: UseCountUpProps["formattingFn"];
    style?: CSSProperties;
}

export const SectionStatsCard = memo<SectionStatsCardProps>(
    ({ stat, statDescription, statFormatter, style }) => {
        return (
            <Col>
                <h4 className="flex-center h4 mb-3">
                    <div>{statDescription}</div>
                </h4>
                <div className="flex-center bg-body-secondary mb-3 game-border border-secondary px-3 py-5 rounded-3">
                    <span className="display-2 fw-semibold text-decoration-underline">
                        <WrappedCounter
                            id="total-runs-count"
                            end={stat}
                            formattingFn={statFormatter}
                            style={style}
                        />
                    </span>
                </div>
            </Col>
        );
    },
);
SectionStatsCard.displayName = "SectionStatsCard";
